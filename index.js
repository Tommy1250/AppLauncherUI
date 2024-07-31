const {
    app,
    BrowserWindow,
    Tray,
    Menu,
    ipcMain,
    shell,
    dialog,
} = require("electron");
const path = require("path");
const { GlobalKeyboardListener } = require("node-global-key-listener");
const listener = new GlobalKeyboardListener();

const gotTheLock = app.requestSingleInstanceLock();
const fs = require("fs");
const launchApp = require("./frontend/functions/launchApp");

/**
 * @type {BrowserWindow}
 */
let mainWindow;

/**
 * @type {BrowserWindow}
 */
let editWindow;

/**
 * @type {BrowserWindow}
 */
let addWindow;

const savePath = path.join(app.getPath("userData"), "saves");
if (!fs.existsSync(savePath)) {
    fs.mkdirSync(savePath);
}

const iconpath = process.platform === "linux" ? path.join(__dirname, "icon.png") : path.join(__dirname, "icon.ico");

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            contextIsolation: false,
        },
    });

    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile(path.join(__dirname, "frontend", "index.html"));
    mainWindow.setTitle("App launcher");
    mainWindow.setIcon(iconpath);

    mainWindow.webContents.send("savePath", savePath);
    mainWindow.menuBarVisible = false;

    mainWindow.on("closed", () => {
        mainWindow.destroy();
        mainWindow = null;
    });
}

ipcMain.on("getSavePath", (event, arg) => {
    //send the savesPath to the requestor
    event.sender.send("savePath", savePath);
});

ipcMain.on("refresh", () => {
    mainWindow.webContents.send("refresh");
});

let tray = null;

if (!gotTheLock) {
    app.quit();
} else {
    app.whenReady().then(() => {
        createWindow();

        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });

        tray = new Tray(iconpath);

        const trayTemplate = [
            {
                label: "Show app",
                click: function () {
                    if (mainWindow) {
                        mainWindow.show();
                    } else {
                        createWindow();
                    }
                },
            },
            {
                label: "Quit",
                click: function () {
                    app.exit();
                },
            },
        ];

        const menu = Menu.buildFromTemplate(trayTemplate);

        tray.setContextMenu(menu);
        tray.setToolTip("The appLauncher menu");
        tray.on("click", () => {
            if (mainWindow) {
                mainWindow.show();
            } else {
                createWindow();
            }
        });
    });
}

ipcMain.on("contextMenu", (ev, gameName) => {
    /**
     * @type {{gameName: {type: "url" | "exe", location: string, args?: string, gridName: string}}}
     */
    const saveFile = JSON.parse(
        fs.readFileSync(path.join(savePath, "shortcuts.json"), "utf-8")
    );

    const template = [
        {
            label: "Start",
            click: () => {
                launchApp(saveFile[gameName]);
            },
        },
        {
            label: "Edit shortcut",
            click: () => {
                //launch a new window and do magic
                if (!editWindow) {
                    editWindow = new BrowserWindow({
                        width: 530,
                        height: 390,
                        webPreferences: {
                            nodeIntegration: true,
                            nodeIntegrationInWorker: true,
                            contextIsolation: false,
                        },
                    });

                    if (!app.isPackaged) {
                        editWindow.webContents.openDevTools();
                    }

                    editWindow.loadFile(path.join(__dirname, "frontend", "edit.html"));
                    editWindow.setTitle("Edit shortcut");
                    editWindow.menuBarVisible = false;
                    editWindow.setIcon(iconpath);

                    ipcMain.on("appName", () =>
                        editWindow.webContents.send("appname", gameName)
                    );

                    editWindow.on("closed", () => {
                        editWindow.destroy();
                        editWindow = null;
                        ipcMain.removeAllListeners("appName");
                    });
                }else {
                    editWindow.focus();
                }
            },
        },
        {
            label: "Remove",
            click: () => {
                delete saveFile[gameName];
                fs.writeFileSync(
                    path.join(savePath, "shortcuts.json"),
                    JSON.stringify(saveFile)
                );
                mainWindow.webContents.send("updateSave");
            },
        },
    ];

    if (saveFile[gameName].type === "exe") {
        template.splice(2, 0, {
            label: "Show in folder",
            click: () => {
                shell.showItemInFolder(saveFile[gameName].location);
            },
        });
    }

    Menu.buildFromTemplate(template).popup();
});

ipcMain.on("closeAndSave", (ev) => {
    mainWindow.reload();
    ev.sender.close();
});

ipcMain.on("chooseImage", (event) => {
    console.log("choose image");
    dialog
        .showOpenDialog({
            title: "Choose banner",
            properties: ["openFile"],
            filters: [
                {
                    name: "Image file",
                    extensions: ["png"],
                },
            ],
        })
        .then((file) => {
            if (!file.canceled) {
                event.sender.send("imageSelect", file.filePaths[0]);
            }
        })
        .catch((reason) => {
            console.log(reason);
        });
});

ipcMain.on("addWindow", () => {
    if (!addWindow) {
        addWindow = new BrowserWindow({
            width: 530,
            height: 390,
            webPreferences: {
                nodeIntegration: true,
                nodeIntegrationInWorker: true,
                contextIsolation: false,
            },
        });

        if (!app.isPackaged) {
            addWindow.webContents.openDevTools();
        }

        addWindow.loadFile(path.join(__dirname, "frontend", "add.html"));
        addWindow.setTitle("Add Shortcut");
        addWindow.menuBarVisible = false;
        addWindow.setIcon(iconpath);

        addWindow.on("closed", () => {
            addWindow.destroy();
            addWindow = null;
        });
    }else {
        addWindow.focus();
    }
})

app.on("window-all-closed", (ev) => {
    ev.preventDefault();
});