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
// const { GlobalKeyboardListener } = require("node-global-key-listener");
// const listener = new GlobalKeyboardListener();

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
const shortcutsFile = path.join(savePath, "shortcuts.json");
const latestGamesFile = path.join(savePath, "latest.json");

if (!fs.existsSync(savePath)) {
    fs.mkdirSync(savePath);
}

if (!fs.existsSync(shortcutsFile)) {
    fs.writeFileSync(shortcutsFile, "{}");
}

if (!fs.existsSync(latestGamesFile)) {
    fs.writeFileSync(latestGamesFile, "[]");
}

/**
 * @type {{gameName: {type: "url" | "exe", location: string, args?: string, gridName: string}}}
 */
let saveFile = JSON.parse(
    fs.readFileSync(path.join(savePath, "shortcuts.json"), "utf-8")
);

/**
 * @type {string[]}
 */
let latestLaunchedGames = JSON.parse(fs.readFileSync(latestGamesFile, "utf-8"));

const iconpath =
    process.platform === "linux"
        ? path.join(__dirname, "icon.png")
        : path.join(__dirname, "icon.ico");

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
    saveFile = JSON.parse(
        fs.readFileSync(path.join(savePath, "shortcuts.json"), "utf-8")
    );
});

ipcMain.on("updateSaveMain", () => {
    saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
});

let tray = null;

function addToLatestAndLaunch(gameName, window = null) {
    if (!latestLaunchedGames.includes(gameName))
        latestLaunchedGames.push(gameName);
    if (latestLaunchedGames.length > 5) {
        latestLaunchedGames.shift();
    }
    fs.writeFileSync(latestGamesFile, JSON.stringify(latestLaunchedGames));
    
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

    if (latestLaunchedGames.length !== 0) {
        for (let i = 0; i < latestLaunchedGames.length; i++) {
            const gameName = latestLaunchedGames[i];
            trayTemplate.splice(1, 0, {
                label: gameName,
                click: () => {
                    addToLatestAndLaunch(
                        gameName,
                        mainWindow ? mainWindow : null
                    );
                },
            });
        }
    }

    const trayMenu = Menu.buildFromTemplate(trayTemplate);
    tray.setContextMenu(trayMenu);

    launchApp(saveFile[gameName], window);
}

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

        if (latestLaunchedGames.length !== 0) {
            for (let i = 0; i < latestLaunchedGames.length; i++) {
                const gameName = latestLaunchedGames[i];
                trayTemplate.splice(1, 0, {
                    label: gameName,
                    click: () => {
                        addToLatestAndLaunch(
                            gameName,
                            mainWindow ? mainWindow : null
                        );
                    },
                });
            }
        }

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

ipcMain.on("launch", (ev, gameName) => {
    addToLatestAndLaunch(gameName, ev.sender);
});

ipcMain.on("contextMenu", (ev, gameName) => {
    const template = [
        {
            label: "Start",
            click: () => {
                addToLatestAndLaunch(saveFile[gameName], mainWindow);
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

                    editWindow.loadFile(
                        path.join(__dirname, "frontend", "edit.html")
                    );
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
                } else {
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
    saveFile = JSON.parse(
        fs.readFileSync(path.join(savePath, "shortcuts.json"), "utf-8")
    );
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
    } else {
        addWindow.focus();
    }
});

app.on("window-all-closed", (ev) => {
    ev.preventDefault();
});
