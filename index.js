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

const gotTheLock = app.requestSingleInstanceLock();
const fs = require("fs");
const launchApp = require("./frontend/functions/launchApp");
const { generateId } = require("./frontend/functions/appAddUtil");

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

/**
 * @type {BrowserWindow}
 */
let msStoreWindow;

/**
 * @type {BrowserWindow}
 */
let imageSearchWindow;

const savePath = path.join(app.getPath("userData"), "saves");
const shortcutsPath = path.join(savePath, "shortcuts.json");
const latestGamesPath = path.join(savePath, "latest.json");
const settingsPath = path.join(savePath, "settings.json");
const orderPath = path.join(savePath, "order.json");
const windowBoundPath = path.join(savePath, "window.json");
const categoriesPath = path.join(savePath, "categories.json");

const imagesPath = path.join(savePath, "images");
exports.imagesPath = imagesPath;

if (!fs.existsSync(savePath)) {
    fs.mkdirSync(savePath);
}

if (!fs.existsSync(shortcutsPath)) {
    fs.writeFileSync(shortcutsPath, "{}");
}

if (!fs.existsSync(latestGamesPath)) {
    fs.writeFileSync(latestGamesPath, "[]");
}

if (!fs.existsSync(categoriesPath)) {
    fs.writeFileSync(categoriesPath, JSON.stringify({
        selected: [],
        categories: []
    }))
}

if (!fs.existsSync(windowBoundPath)) {
    fs.writeFileSync(
        windowBoundPath,
        JSON.stringify({
            width: 1280,
            height: 720,
            x: undefined,
            y: undefined,
            fullscreen: false,
        })
    );
}

if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(
        settingsPath,
        JSON.stringify({
            startWithPc: true,
            steamGridToken: "",
            enableServer: false,
            serverPort: 7080,
            serverPassword: "1234",
        })
    );
}

/**
 * @type {{[gameName: string]: {type: "url" | "exe" | "dir", location: string, args?: string, gridName: string, shellMode?: boolean, categories?: string[]}}}
 */
let saveFile = JSON.parse(
    fs.readFileSync(path.join(savePath, "shortcuts.json"), "utf-8")
);
exports.shortcutsPath = shortcutsPath;

/**
 * @type {string[]}
 */
let latestLaunchedGames = JSON.parse(fs.readFileSync(latestGamesPath, "utf-8"));

/**
 * @type {{startWithPc: boolean, steamGridToken: string, enableServer: boolean, serverPort: number, serverPassword: string, dontWarnShell: boolean}}
 */
let settingsFile = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
exports.settingsFile = settingsFile;

if (!settingsFile.serverPort) {
    settingsFile = {
        startWithPc: settingsFile.startWithPc,
        steamGridToken: settingsFile.steamGridToken,
        enableServer: settingsFile.enableServer ?? false,
        serverPort: 7080,
        serverPassword: settingsFile.serverPassword ?? "1234",
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settingsFile));
}

if (settingsFile.dontWarnShell === undefined) {
    settingsFile.dontWarnShell = false;
    fs.writeFileSync(settingsPath, JSON.stringify(settingsFile));
}

/**
 * @type {string[]}
 */
let orderFile = [];

/**
 * @type {{selected: string[], categories: string[]}}
 */
let categoriesFile = JSON.parse(fs.readFileSync(categoriesPath, "utf-8"));

if (!fs.existsSync(orderPath)) {
    const keys = Object.keys(saveFile);
    orderFile.push(...keys);
    fs.writeFileSync(orderPath, JSON.stringify(orderFile));
} else {
    orderFile = JSON.parse(fs.readFileSync(orderPath, "utf-8"));
}
exports.orderPath = orderPath;

const iconpath =
    process.platform === "linux"
        ? path.join(__dirname, "assets", "icon.png")
        : process.platform === "darwin"
            ? path.join(__dirname, "assets", "icon.icns")
            : path.join(__dirname, "assets", "icon.ico");

function saveWindowState() {
    if (!mainWindow) return;

    const bounds = mainWindow.getBounds();
    const maximized = mainWindow.isMaximized();

    if (maximized) {
        const boundsFile = JSON.parse(
            fs.readFileSync(windowBoundPath, "utf-8")
        );
        fs.writeFileSync(
            windowBoundPath,
            JSON.stringify({
                width: boundsFile.width,
                height: boundsFile.height,
                x: boundsFile.x,
                y: boundsFile.y,
                maximized: maximized,
            })
        );
    } else {
        fs.writeFileSync(
            windowBoundPath,
            JSON.stringify({
                width: bounds.width,
                height: bounds.height,
                x: bounds.x,
                y: bounds.y,
                maximized: maximized,
            })
        );
    }
}

function createWindow() {
    const windowBounds = JSON.parse(fs.readFileSync(windowBoundPath, "utf-8"));

    mainWindow = new BrowserWindow({
        width: windowBounds.width,
        height: windowBounds.height,
        x: windowBounds.x,
        y: windowBounds.y,
        minWidth: 570,
        minHeight: 380,
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

    if (windowBounds.maximized) mainWindow.maximize();

    mainWindow.on("close", (ev) => {
        saveWindowState();
    });

    mainWindow.on("closed", () => {
        mainWindow.destroy();
        mainWindow = null;
    });
}

ipcMain.on("getSavePath", (event, arg) => {
    //send the savesPath to the requestor
    event.sender.send("savePath", savePath);
});

ipcMain.on("updateSaveMain", () => {
    saveFile = JSON.parse(fs.readFileSync(shortcutsPath, "utf-8"));
    orderFile = JSON.parse(fs.readFileSync(orderPath, "utf-8"));
});

let tray = null;

function addToLatestAndLaunch(gameName, window = mainWindow) {
    launchApp(saveFile[gameName], window);

    if (saveFile[gameName].type === "dir") return;

    if (!latestLaunchedGames.includes(gameName))
        latestLaunchedGames.push(gameName);
    if (latestLaunchedGames.length > 5) {
        latestLaunchedGames.shift();
    }

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
        let updatedLatest = [...latestLaunchedGames];
        for (let i = 0; i < latestLaunchedGames.length; i++) {
            const gameName2 = latestLaunchedGames[i];
            const gameInfo = saveFile[gameName2];
            if (gameInfo) {
                trayTemplate.splice(1, 0, {
                    label: gameInfo.gridName,
                    click: () => {
                        launchApp(
                            saveFile[gameName2],
                            mainWindow ? mainWindow : null
                        );
                    },
                });
            } else {
                updatedLatest.splice(i, 1);
            }
        }
        latestLaunchedGames = updatedLatest;
        fs.writeFileSync(latestGamesPath, JSON.stringify(latestLaunchedGames));
    }

    const trayMenu = Menu.buildFromTemplate(trayTemplate);
    tray.setContextMenu(trayMenu);
}
exports.addToLatestAndLaunch = addToLatestAndLaunch;

function removeFromLatest(gameName) {
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
        let updatedLatest = [...latestLaunchedGames];
        for (let i = 0; i < latestLaunchedGames.length; i++) {
            const gameName2 = latestLaunchedGames[i];
            const gameInfo = saveFile[gameName2];
            if (gameName2 !== gameName) {
                trayTemplate.splice(1, 0, {
                    label: gameInfo.gridName,
                    click: () => {
                        launchApp(gameName2, mainWindow ? mainWindow : null);
                    },
                });
            } else {
                updatedLatest.splice(i, 1);
            }
        }
        latestLaunchedGames = updatedLatest;
        fs.writeFileSync(latestGamesPath, JSON.stringify(latestLaunchedGames));
    }

    const trayMenu = Menu.buildFromTemplate(trayTemplate);
    tray.setContextMenu(trayMenu);
}

if (!gotTheLock) {
    app.quit();
} else {
    app.whenReady().then(() => {
        app.on("second-instance", () => {
            if (!mainWindow) createWindow();
            mainWindow.show();
        });

        createWindow();

        if (!app.isPackaged) {
            app.setLoginItemSettings({
                openAtLogin: false,
                path: app.getPath("exe"),
            });
        } else {
            app.setLoginItemSettings({
                openAtLogin: settingsFile.startWithPc,
                path: app.getPath("exe"),
            });
        }

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
                    saveWindowState();
                    app.exit();
                },
            },
        ];

        if (latestLaunchedGames.length !== 0) {
            let updatedLatest = [...latestLaunchedGames];
            for (let i = 0; i < latestLaunchedGames.length; i++) {
                const gameName = latestLaunchedGames[i];
                const gameInfo = saveFile[gameName];
                if (gameInfo) {
                    trayTemplate.splice(1, 0, {
                        label: gameInfo.gridName,
                        click: () => {
                            launchApp(
                                saveFile[gameName],
                                mainWindow ? mainWindow : null
                            );
                        },
                    });
                } else {
                    updatedLatest.splice(i, 1);
                }
            }
            latestLaunchedGames = updatedLatest;
            fs.writeFileSync(
                latestGamesPath,
                JSON.stringify(latestLaunchedGames)
            );
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

ipcMain.on("contextMenu", (ev, args) => {
    const gameName = args.key;
    const index = args.index;
    const template = [
        {
            label: "Start",
            click: () => {
                addToLatestAndLaunch(gameName, mainWindow);
            },
        },
        {
            label: "Edit shortcut",
            click: () => {
                //launch a new window and do magic
                if (!editWindow) {
                    editWindow = new BrowserWindow({
                        width: 530,
                        height: 360,
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
                        if (imageSearchWindow) {
                            imageSearchWindow.close();
                        }
                    });
                } else {
                    editWindow.focus();
                }
            },
        },
        {
            label: "Change possition",
            click: () => {
                mainWindow.webContents.send("showMovePopup", index);
            },
        },
        {
            label: "Manage categories",
            submenu: categoriesFile.categories.map(category => {
                const gameCategories = saveFile[gameName].categories ?? [];

                return {
                    label: category,
                    type: 'checkbox',
                    checked: saveFile[gameName].categories?.includes(category),
                    click: () => {
                        if (gameCategories.includes(category)) {
                            gameCategories.splice(gameCategories.indexOf(category), 1);
                        } else {
                            gameCategories.push(category);
                        }

                        saveFile[gameName].categories = gameCategories;

                        fs.writeFileSync(
                            path.join(savePath, "shortcuts.json"),
                            JSON.stringify(saveFile)
                        );
                        mainWindow.webContents.send("updateSave");
                    }
                }

            })
        },
        {
            label: "Remove",
            click: () => {
                delete saveFile[gameName];
                fs.writeFileSync(
                    path.join(savePath, "shortcuts.json"),
                    JSON.stringify(saveFile)
                );
                removeFromLatest(gameName);
                removeFromOrderList(gameName);
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

ipcMain.on("updateCategoriesMain", () => {
    updateCategoriesFile();
})

function updateCategoriesFile() {
    categoriesFile = JSON.parse(fs.readFileSync(categoriesPath, "utf-8"));
}

function removeFromOrderList(location) {
    const itemLocation = orderFile.indexOf(location);
    orderFile.splice(itemLocation, 1);
    fs.writeFileSync(orderPath, JSON.stringify(orderFile));
}

/**
 * @param {number} from
 * @param {number} to
 */
function changeOrderList(from, to) {
    while (from < 0) {
        from += orderFile.length;
    }
    while (to < 0) {
        to += orderFile.length;
    }
    if (to >= orderFile.length) {
        let k = to - orderFile.length + 1;
        while (k--) {
            orderFile.push(undefined);
        }
    }
    orderFile.splice(to, 0, orderFile.splice(from, 1)[0]);
    fs.writeFileSync(orderPath, JSON.stringify(orderFile));
    mainWindow.webContents.send("updateSave");
}

ipcMain.on("changeOrder", (ev, args) => {
    changeOrderList(args.from, args.to);
});

ipcMain.on("closeAndSave", (ev) => {
    ev.sender.close();
    saveFile = JSON.parse(
        fs.readFileSync(path.join(savePath, "shortcuts.json"), "utf-8")
    );
    orderFile = JSON.parse(fs.readFileSync(path.join(orderPath), "utf-8"));
    mainWindow.webContents.send("updateSave");
});

ipcMain.on("updateSaveNoClose", (ev) => {
    saveFile = JSON.parse(
        fs.readFileSync(path.join(savePath, "shortcuts.json"), "utf-8")
    );
    orderFile = JSON.parse(fs.readFileSync(path.join(orderPath), "utf-8"));
    mainWindow.webContents.send("updateSave");
});

ipcMain.on("chooseImage", (event) => {
    // console.log("choose image");
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

ipcMain.on("chooseExecFile", (event) => {
    // console.log("choose shortcut file")
    dialog
        .showOpenDialog({
            title: "Select executable file",
            properties: ["openFile"],
            filters: [
                {
                    name: "Executable file",
                    extensions: ["exe", "bat", "sh", "cmd"],
                },
                {
                    name: "All files",
                    extensions: ["*"],
                },
            ],
        })
        .then((file) => {
            if (!file.canceled) {
                event.sender.send("execSelect", file.filePaths[0]);
            }
        })
        .catch((reason) => {
            console.log(reason);
        });
});

ipcMain.on("cooseDirectory", (event) => {
    dialog
        .showOpenDialog({
            title: "Select Folder",
            properties: ["openDirectory"],
        })
        .then((file) => {
            if (!file.canceled) {
                event.sender.send("dirSelect", file.filePaths[0]);
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
            height: 360,
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
            if (msStoreWindow) {
                msStoreWindow.close();
            }
            if (imageSearchWindow) {
                imageSearchWindow.close();
            }
        });
    } else {
        addWindow.focus();
    }
});

ipcMain.on("msStoreWindow", () => {
    if (!msStoreWindow) {
        msStoreWindow = new BrowserWindow({
            width: 900,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
                nodeIntegrationInWorker: true,
                contextIsolation: false,
            },
        });

        if (!app.isPackaged) {
            msStoreWindow.webContents.openDevTools();
        }

        msStoreWindow.loadFile(
            path.join(__dirname, "frontend", "msstore.html")
        );
        msStoreWindow.setTitle("Microsoft store app selector");
        msStoreWindow.menuBarVisible = false;
        msStoreWindow.setIcon(iconpath);

        msStoreWindow.on("closed", () => {
            msStoreWindow.destroy();
            msStoreWindow = null;
        });
    } else {
        msStoreWindow.focus();
    }
});

ipcMain.on("msappselect", (ev, appargs) => {
    if (addWindow)
        addWindow.webContents.send("inputdata", {
            path: "explorer.exe",
            args: `shell:appsFolder\\${appargs}`,
            id: `ms-${generateId(25)}`,
        });

    if (msStoreWindow) msStoreWindow.close();
});

ipcMain.on("updateSave", (ev, args) => {
    if (settingsFile.startWithPc !== args.startWithPc) {
        if (!app.isPackaged) {
            app.setLoginItemSettings({
                openAtLogin: false,
                path: app.getPath("exe"),
            });
        } else {
            app.setLoginItemSettings({
                openAtLogin: args.startWithPc,
                path: app.getPath("exe"),
            });
        }
    }

    if (
        (settingsFile.enableServer !== args.enableServer) |
        (settingsFile.serverPort !== args.serverPort) |
        (settingsFile.serverPassword !== args.serverPassword)
    ) {
        dialog
            .showMessageBox({
                type: "question",
                buttons: ["Cancel", "Ok"],
                title: "Apply Settings",
                detail: "You need to restart the launcher to change the remote server restart now?",
                icon: path.join(iconpath),
            })
            .then((returnValue) => {
                if (returnValue.response === 1) {
                    app.relaunch();
                    app.exit();
                }
            });
    }

    settingsFile = args;

    fs.writeFileSync(settingsPath, JSON.stringify(settingsFile));
});

ipcMain.on("searchImage", (ev, args) => {
    if (!imageSearchWindow) {
        imageSearchWindow = new BrowserWindow({
            width: 900,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
                nodeIntegrationInWorker: true,
                contextIsolation: false,
            },
        });

        if (!app.isPackaged) {
            imageSearchWindow.webContents.openDevTools();
        }

        imageSearchWindow.loadFile(
            path.join(__dirname, "frontend", "imageSearch.html")
        );
        imageSearchWindow.setTitle("Image Downloader");
        imageSearchWindow.menuBarVisible = false;
        imageSearchWindow.setIcon(iconpath);

        ipcMain.on("returnSource", () =>
            imageSearchWindow.webContents.send("returnSource", args.source)
        );

        imageSearchWindow.on("closed", () => {
            imageSearchWindow.destroy();
            imageSearchWindow = null;
            ipcMain.removeAllListeners("returnSource");
        });
    } else {
        imageSearchWindow.focus();
    }
})

ipcMain.on("showShellMsg", (ev, args) => {
    if (settingsFile.dontWarnShell)
        return;
    dialog
        .showMessageBox({
            type: "warning",
            buttons: ["Ok"],
            title: "Warning",
            detail: "This button toggles shell mode it does nothing to the args enabling it might make some apps not launch and sometimes it might make other apps work like any app that needs a shell(cmd) window to launch\nEnable at your own risk",
            icon: path.join(iconpath),
            checkboxLabel: "Don't warn me again",
            checkboxChecked: false,
        })
        .then((returnValue) => {
            if (returnValue.checkboxChecked) {
                settingsFile.dontWarnShell = true;
                fs.writeFileSync(settingsPath, JSON.stringify(settingsFile));
            }
        });
});

app.on("window-all-closed", (ev) => {
    ev.preventDefault();
});

if (settingsFile.enableServer) {
    require("./remote");
}
