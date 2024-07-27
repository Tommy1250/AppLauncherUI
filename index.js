const { app, BrowserWindow, Tray, Menu, ipcMain, shell } = require("electron");
const path = require("path");

const gotTheLock = app.requestSingleInstanceLock();
const fs = require("fs");
const launchApp = require("./frontend/functions/launchApp");

/**
 * @type {BrowserWindow}
 */
let mainWindow;

const savePath = path.join(app.getPath("userData"), "saves");
if (!fs.existsSync(savePath)) {
    fs.mkdirSync(savePath);
}

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

    mainWindow.loadFile(path.join("frontend", "index.html"));

    mainWindow.webContents.send("savePath", savePath);

    mainWindow.on("closed", () => {
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

const iconpath = path.join("icon.ico");

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
     * @type {{gameName: {type: "url" | "exe", location: string, args?: string}}}
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
            },
        },
        {
            label: "Remove",
            click: () => {
                delete saveFile[gameName];
                fs.writeFileSync(path.join(savePath, "shortcuts.json"), JSON.stringify(saveFile));
                mainWindow.webContents.send("updateSave");
            }
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

app.on("window-all-closed", (ev) => {
    ev.preventDefault();
});
