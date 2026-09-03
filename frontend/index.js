const { ipcRenderer, shell, webFrame, webUtils } = require("electron");
const fs = require("fs");
const path = require("path");
const { queueBanner } = require("./functions/steamGrid");
const ip = require("ip");
const HID = require('node-hid');
const { readShortcut } = require("./functions/appAddUtil");

let shortcutsFile = "";
let savePath = "";
let imagesPath = "";
let orderPath = "";
let categoriesPath = "";
let externalThemesPath = "";

let managedAppId = "";
let managedAppIndex = 0;

let selectedApps = [];
let inMultiSelect = false;
let rearrangingItem = false;

/**
 * @type {{[appname: string]: {type: "url" | "exe" | "dir", location: string, args?: string, gridName: string, shellMode?: boolean, categories?: string[]}}}
 */
let saveFile = {};

/**
 * @type {{startWithPc: boolean, steamGridToken: string, enableServer: boolean, serverPort: number, serverPassword: string, dontWarnShell: boolean, importSteam: boolean, steamFolders: string[], dontWarnShell: boolean, theme: string, externalTheme: boolean, fullscreen?: boolean, stayOnGame?: boolean, controllerLayout: string}}
 */
let settingsFile = {};

/**
 * @type {string[]}
 */
let orderFile = [];

/**
 * @type {{selected: string[], categories: string[]}}
 */
let categoriesFile = {};

/**
 * @type {{[themeName: string]: string}}
 */
let themes = {
    "dark": "themes/dark.css",
    "light": "themes/light.css"
}

let controllerLayout = "ps";

const menu = document.getElementById('contextMenu');
const menuBackground = document.getElementById("background");
const startAppButton = document.getElementById("startAppButton");
const editShortcutButton = document.getElementById("editShortcutButton");
const changePossitionButton = document.getElementById("changePossitionButton");
const showInFolderButton = document.getElementById("showInFolderButton");
const categoriesHolderSubmenu = document.getElementById("categoriesHolderSubmenu");
const removeAppButton = document.getElementById("removeAppButton");

const showSelectionButton = document.getElementById("showSelectionButton");
const contextMenuMultiSelect = document.getElementById("contextMenuMultiSelect");
const categoriesAddHolderSubmenu = document.getElementById("categoriesAddHolderSubmenu");
const categoriesRemoveHolderSubmenu = document.getElementById("categoriesRemoveHolderSubmenu");
const removeMultiSelectButton = document.getElementById("removeMultiSelectButton");

const tooltip = document.getElementById("tooltip");

const appGrid = document.getElementById("appgrid");
const searchForm = document.getElementById("searchForm");
const searchBar = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");

const controllerButton = document.getElementById("disconnectBT");
controllerButton.style.display = "none";
const addButton = document.getElementById("add");
const settingsButton = document.getElementById("settings");
const multiSelectButton = document.getElementById("multiSelect");

const mainDiv = document.getElementById("mainContent");
const settingsDiv = document.getElementById("settingsDiv");

const settingsCancelBtn = document.getElementById("cancel");
const settingsSaveBtn = document.getElementById("save");
const goToSteamGirdBtn = document.getElementById("goToSteamGirdBtn");
const steamGridTokenInput = document.getElementById("steamGridToken");
const startWithPcCheckBox = document.getElementById("startWithPc");
const fullScreenCheckBox = document.getElementById("fullScreen");
const stayWithGameCheckBox = document.getElementById("stayWithGame");

/**
 * @type {HTMLSelectElement}
 */
const themeSelect = document.getElementById("themeSelector");
const openThemesFolderButton = document.getElementById("openThemesFolder");
const openThemesRepo = document.getElementById("openThemesRepo");

/**
 * @type {HTMLSelectElement}
 */
const controllerLayoutSelect = document.getElementById("controllerLayout");

const serverCheckBox = document.getElementById("enableServer");
const serverPortInput = document.getElementById("serverPort");
const serverPassInput = document.getElementById("serverPass");
const serverIpInput = document.getElementById("serverIp");

const showTokenButton = document.getElementById("showTokenBtn");
const showServerPortButton = document.getElementById("showServerPort");
const showServerPasswordButton = document.getElementById("showServerPassword");
const showServerIpButton = document.getElementById("showServerIp");

const steamReadSwitch = document.getElementById("switchSteam");
const manageSteamLocationsBtn = document.getElementById("manageSteamLocationsBtn");

/**
 * @type {HTMLDialogElement}
 */
const movetomenu = document.getElementById("movetomenu");
const closeButton = document.getElementById("close");
const moveButton = document.getElementById("moveperm");
const toinput = document.getElementById("toinput");

const categoriesManager = document.getElementById("categoriesManager");
const categoriesDiv = document.getElementById("categoriesDiv");
const filterButton = document.getElementById("filter");
const cancelBtnCategories = document.getElementById("cancelBtnCategories");
const addCategoryForm = document.getElementById("addCategoryForm");
const categoryNameInput = document.getElementById("categoryName");

const controllerManager = document.getElementById("controllerManager");
const controllersList = document.getElementById("controllersList");
const cancelBtnControllers = document.getElementById("cancelBtnControllers");

const infoMessage = document.getElementById("infoMessage");
const infoMessageTitle = document.getElementById("infoMessageTitle");
const messageHolder = document.getElementById("message");
const closeMessage = document.getElementById("closeMessage");

const steamDirsManager = document.getElementById("steamDirsManager");
const cancelBtnSteamDir = document.getElementById("cancelBtnSteamDir");
const addDirctorySteamBtn = document.getElementById("addDirctorySteam");
const directoriesListSteam = document.getElementById("DirectoriesList");

let currentScroll = 0;

let moveItem = -10;

/**
 * 
 * @param {string} themeName 
 */
function setTheme(themeName) {
    document.getElementById('themeSheet').href = themes[themeName];
}

/**
 * 
 * @param {string} themeName 
 */
function setThemePath(themePath) {
    document.getElementById('themeSheet').href = themePath;
}

function remakeThemes() {
    for (const key in themes) {
        delete themes[key];
    }

    const internalThemes = fs.readdirSync(path.join(__dirname, "themes"));
    for (let i = 0; i < internalThemes.length; i++) {
        themes[internalThemes[i].replace(".css", "")] = `themes/${internalThemes[i]}`
    }

    const externalThemes = fs.readdirSync(externalThemesPath);
    const cssFiles = externalThemes.filter(file => file.endsWith(".css"));

    for (let i = 0; i < cssFiles.length; i++) {
        const externalTheme = cssFiles[i];
        themes[externalTheme.replace(".css", "")] = `${path.join(externalThemesPath, externalTheme)}`;
    }

    themeSelect.innerHTML = "";
    for (let i = 0; i < Object.keys(themes).length; i++) {
        const theme = Object.keys(themes)[i];
        const option = document.createElement("option");
        option.value = theme;
        option.innerText = theme;
        option.setAttribute("data-external", internalThemes.includes(`${theme}.css`) ? 0 : 1);

        themeSelect.appendChild(option);
    }
}

ipcRenderer.on("savePath", (ev, args) => {
    savePath = args;
    console.log(savePath);
    shortcutsFile = path.join(savePath, "shortcuts.json");
    imagesPath = path.join(savePath, "images");
    externalThemesPath = path.join(savePath, "themes");
    orderPath = path.join(savePath, "order.json");
    categoriesPath = path.join(savePath, "categories.json");

    categoriesFile = JSON.parse(fs.readFileSync(categoriesPath, "utf-8"));
    saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
    settingsFile = JSON.parse(
        fs.readFileSync(path.join(savePath, "settings.json"), "utf-8")
    );

    orderFile = JSON.parse(fs.readFileSync(orderPath, "utf-8"));

    steamGridTokenInput.value = settingsFile.steamGridToken;
    startWithPcCheckBox.checked = settingsFile.startWithPc;
    serverCheckBox.checked = settingsFile.enableServer;
    serverPortInput.value = settingsFile.serverPort;
    serverPassInput.value = settingsFile.serverPassword;
    fullScreenCheckBox.checked = settingsFile.fullscreen;
    stayWithGameCheckBox.checked = settingsFile.stayOnGame;

    controllerLayout = settingsFile.controllerLayout;
    setHints(defaultHints);
    switch (controllerLayout) {
        case "xbox":
            controllerLayoutSelect.selectedIndex = 0;
            break;
        case "ps":
            controllerLayoutSelect.selectedIndex = 1;
            break;
    }
    steamReadSwitch.checked = settingsFile.importSteam;

    if (settingsFile.importSteam) {
        require("./functions/steamUtil").scanSteamFiles(settingsFile.steamFolders, savePath);
    }

    try {
        const userIp = ip.address("Ethernet");
        serverIpInput.value = `http://${userIp}:${settingsFile.serverPort}`;
    } catch {
        const userIp = ip.address();
        serverIpInput.value = `http://${userIp}:${settingsFile.serverPort}`;
    }

    makeAppGrid(orderFile);

    if (!fs.existsSync(imagesPath)) {
        fs.mkdirSync(imagesPath);
    }

    if (!fs.existsSync(externalThemesPath)) {
        fs.mkdirSync(externalThemesPath);
    }

    if (settingsFile.externalTheme) {
        if (fs.existsSync(path.join(externalThemesPath, `${settingsFile.theme}.css`))) {
            setThemePath(path.join(externalThemesPath, `${settingsFile.theme}.css`))
        } else {
            setThemePath("themes/dark.css");
            settingsFile.theme = "dark";
            settingsFile.externalTheme = true;
            ipcRenderer.send("updateSave", settingsFile);
        }
    } else {
        setThemePath(`themes/${settingsFile.theme}.css`);
    }

    remakeThemes();

    fs.watch(externalThemesPath, (eventType, filename) => {
        if (eventType === "rename") {
            remakeThemes();
            if (Object.keys(themes).includes(settingsFile.theme)) {
                for (let i = 0; i < themeSelect.options.length; i++) {
                    const option = themeSelect.options[i];
                    if (option.innerText === settingsFile.theme) {
                        themeSelect.selectedIndex = option.index;
                        break;
                    }
                }
            } else {
                setTheme("dark");
                settingsFile.theme = "dark";
                settingsFile.externalTheme = false;
                ipcRenderer.send("updateSave", settingsFile);
            }
        }
    });

    if (Object.keys(themes).includes(settingsFile.theme)) {
        for (let i = 0; i < themeSelect.options.length; i++) {
            const option = themeSelect.options[i];
            if (option.innerText === settingsFile.theme) {
                themeSelect.selectedIndex = option.index;
                break;
            }
        }
    }

    if (!fs.existsSync(path.join(savePath, "notFirstTime.txt"))) {
        fs.writeFileSync(path.join(savePath, "notFirstTime.txt"), "This is not the first time the user opens the app")

        messageHolder.innerHTML = "";
        infoMessageTitle.innerText = "Important Info";

        const messageText = document.createElement("h3");
        messageText.innerText = `Welcome to AppLauncher.
        You can add games/apps by using either drag and drop or the add window.
        you can access the add window by clicking the plus icon on the top right corner.
        I also recommend getting a steamGridDB token by clicking the \"Sign up for a token\" button in the settings.
        The token is used for fetching images for the games you add.
        You can also make filters for your games by clicking the filter icon in the top right.
        When you make a filter you can add apps to it by right clicking them and assigning the categories you want.
        You can add apps to multiple categories and show multiple categories at once.
        You can add folder shorcuts from the add window.
        The app runs in the background when you launch games.
        You can access the app when it's in the background by using the tray icon.
        You can access the tray icon by clicking the little arrow on the bottom right of your taskbar.`;
        messageHolder.appendChild(messageText);
        infoMessage.showModal();
    }
});

openThemesFolderButton.onclick = () => {
    shell.openPath(externalThemesPath);
}

openThemesRepo.onclick = () => {
    shell.openExternal("https://github.com/Tommy1250/ApplauncherUIThemes");
}

themeSelect.onchange = () => {
    let selectedTheme = themeSelect.options[themeSelect.selectedIndex].value;
    setTheme(selectedTheme);
}

if (shortcutsFile === "") {
    ipcRenderer.send("getSavePath");
}

let filteredApps = [];

/**
 * 
 * @param {string[]} entries 
 * @param {boolean} showCat 
 */
function makeAppGrid(entries, showCat = false) {
    filteredApps = [];

    currentScroll = appGrid.scrollTop;
    appGrid.innerHTML = "";
    if (categoriesFile.selected.length === 0) {
        for (let i = 0; i < entries.length; i++) {
            const key = entries[i];

            if (saveFile[key])
                addItemToGrid(key, i, showCat);
        }

        appGrid.scrollTop = currentScroll;
    } else {
        for (let i = 0; i < entries.length; i++) {
            const key = entries[i];
            if (saveFile[key] && saveFile[key].categories?.some(cat => categoriesFile.selected.includes(cat))) {
                filteredApps.push(key);
                addItemToGrid(key, i, showCat);
            }
        }

        appGrid.scrollTop = currentScroll;
    }
}

function updateSaveFile(reload = false) {
    saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
    orderFile = JSON.parse(fs.readFileSync(orderPath, "utf-8"));

    if (reload)
        webFrame.clearCache();

    if (searchBar.value !== "") search(searchBar.value);
    else makeAppGrid(orderFile, inMultiSelect);
}

ipcRenderer.on("updateSave", () => updateSaveFile(true));
ipcRenderer.on("updateSaveNoReload", () => updateSaveFile(false));

// Add event listeners for drag-and-drop
appGrid.addEventListener('dragstart', (ev) => {
    ev.target.classList.add('dragging');
    rearrangingItem = true;
});

appGrid.addEventListener('dragend', (ev) => {
    ev.target.classList.remove('dragging');
    rearrangingItem = false;
});

appGrid.addEventListener('dragover', (ev) => {
    ev.preventDefault();
});

appGrid.addEventListener('drop', (ev) => {
    ev.preventDefault();
    const draggedItem = document.querySelector('.dragging');
    const targetItem = ev.target.closest('div.app-div');
    if (draggedItem && targetItem && draggedItem !== targetItem) {
        console.log(parseInt(draggedItem.getAttribute("index")), parseInt(targetItem.getAttribute("index")));
        ipcRenderer.send("changeOrder", {
            from: parseInt(draggedItem.getAttribute("index")),
            to: parseInt(targetItem.getAttribute("index")),
        });
    }
});

//drag and drop methods
document.addEventListener("dragover", (e) => {
    e.stopPropagation();
    e.preventDefault();
});

document.addEventListener("drop", async (e) => {
    if (rearrangingItem) return;
    e.stopPropagation();
    e.preventDefault();

    console.log("Drop");

    const files = e.dataTransfer.files;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const shortcutPath = webUtils.getPathForFile(file);

        const shortcutData = await readShortcut(file.name, shortcutPath);

        editSaveObj(shortcutData.id, shortcutData.location, shortcutData.type, shortcutData.args, shortcutData.shellMode);

        if (
            !fs.existsSync(
                path.join(imagesPath, `${shortcutData.id}.png`)
            )
        ) {
            if (settingsFile.steamGridToken.trim() !== "")
                await queueBanner(
                    shortcutData.id,
                    imagesPath,
                    settingsFile.steamGridToken
                );
        } else makeAppGrid(orderFile, inMultiSelect);
    }
    saveTheFile();
});

function editSaveObj(fileName, location, type, args = null, shellMode = null) {
    if (!args) {
        saveFile[fileName] = {
            type: type,
            location: `${location}`,
            gridName: fileName,
            categories: [...categoriesFile.selected]
        };
    } else {
        saveFile[fileName] = {
            type: type,
            location: `${location}`,
            args: `${args}`,
            gridName: fileName,
            categories: [...categoriesFile.selected]
        };
    }

    if (shellMode)
        saveFile[fileName].shellMode = shellMode

    if (!orderFile.includes(fileName)) orderFile.push(fileName);
}

function saveTheFile() {
    fs.writeFileSync(shortcutsFile, JSON.stringify(saveFile));
    fs.writeFileSync(orderPath, JSON.stringify(orderFile));
    ipcRenderer.send("updateSaveMain");
}

searchForm.onsubmit = (ev) => {
    ev.preventDefault();
    if (searchBar.value !== "") search(searchBar.value);
    else makeAppGrid(orderFile, inMultiSelect);
};

searchBar.oninput = () => {
    if (searchBar.value !== "") search(searchBar.value);
    else makeAppGrid(orderFile, inMultiSelect);
};

clearSearch.onclick = () => {
    searchBar.value = "";
    makeAppGrid(orderFile, inMultiSelect);
};

function search(query) {
    appGrid.innerHTML = "";
    focusedItem = 0;
    previousItem = 0;
    for (let i = 0; i < orderFile.length; i++) {
        const key = orderFile[i];

        if (
            key.toLowerCase().includes(query.toLowerCase()) ||
            saveFile[key].gridName.toLowerCase().includes(query.toLowerCase())
        ) {
            addItemToGrid(key, i, inMultiSelect);
        }
    }
}

function mouseX(evt) {
    if (evt.pageX) {
        return evt.pageX;
    } else if (evt.clientX) {
        return evt.clientX + (document.documentElement.scrollLeft ?
            document.documentElement.scrollLeft :
            document.body.scrollLeft);
    } else {
        return null;
    }
}

function mouseY(evt) {
    if (evt.pageY) {
        return evt.pageY;
    } else if (evt.clientY) {
        return evt.clientY + (document.documentElement.scrollTop ?
            document.documentElement.scrollTop :
            document.body.scrollTop);
    } else {
        return null;
    }
}

multiSelectButton.onclick = () => {
    if (inMultiSelect) {
        inMultiSelect = false;
        multiSelectButton.classList.remove("active-item");
        selectedApps = [];
        setHints(defaultHints);
        if (searchBar.value !== "") search(searchBar.value);
        else makeAppGrid(orderFile);
    } else {
        inMultiSelect = true;
        multiSelectButton.classList.add("active-item");
        setHints(multiSelectHints);
        if (searchBar.value !== "") search(searchBar.value);
        else makeAppGrid(orderFile, true);
    }
}

function launchAppInit(appId) {
    ipcRenderer.send("launch", appId);
    if (settingsFile.stayOnGame) {
        messageHolder.innerHTML = "";
        infoMessageTitle.innerText = "Info";

        const messageText = document.createElement("h3");
        messageText.innerText = `Launching app ${saveFile[appId].gridName}...`;
        messageHolder.appendChild(messageText);
        infoMessage.showModal();

        setTimeout(() => {
            infoMessage.close();
        }, 5000);
    }
}

/**
 *
 * @param {string} key
 * @param {number} index
 */
function addItemToGrid(key, index, showCat = false) {
    const appDiv = document.createElement("div");
    const appImg = document.createElement("img");
    const appName = document.createElement("p");
    const optionsButton = document.createElement("button");
    const bottomHolder = document.createElement("div");

    const imageAndCatsHolder = document.createElement("div");

    appDiv.className = "app-div";

    appImg.className = "app-img";
    imageAndCatsHolder.classList.add("app-img");

    let imagePath = path.join(imagesPath, `${key}.png`);

    if (!fs.existsSync(imagePath)) {
        if (saveFile[key].type === "dir")
            imagePath = path.join(__dirname, "missingdir.png");
        else
            imagePath = path.join(__dirname, "missing.png");
    }

    appImg.src = imagePath;
    appImg.setAttribute("draggable", false);

    if (inMultiSelect) {
        appDiv.setAttribute("index", index);
        appDiv.setAttribute("draggable", true);
    }

    const checkbox = document.createElement("input");

    appImg.onclick = () => {
        if (inMultiSelect) {
            if (selectedApps.includes(key)) {
                selectedApps.splice(selectedApps.indexOf(key), 1);
                checkbox.checked = false;
            } else {
                selectedApps.push(key);
                checkbox.checked = true;
            }
        } else {
            launchAppInit(key);
        }
    };

    if (inMultiSelect) {
        checkbox.type = "checkbox";
        checkbox.classList.add("app-checkbox");
        checkbox.checked = selectedApps.includes(key);
        imageAndCatsHolder.appendChild(checkbox);
    }

    imageAndCatsHolder.appendChild(appImg);

    if (showCat) {
        const catsList = document.createElement("ul");
        if (saveFile[key].categories && saveFile[key].categories.length > 0) {
            for (let i = 0; i < saveFile[key].categories.length; i++) {
                const itemcat = saveFile[key].categories[i];
                const li = document.createElement("li");
                li.innerText = itemcat;
                catsList.appendChild(li);
            }
        } else {
            const li = document.createElement("li");
            li.innerText = "Uncategorized";
            catsList.appendChild(li);
        }

        catsList.classList.add("cats-list");

        catsList.onclick = () => {
            appImg.click();
        }

        // Grid stacking
        imageAndCatsHolder.style.display = "grid";
        imageAndCatsHolder.style.gridTemplateAreas = "stack";
        appImg.style.gridArea = "stack";

        imageAndCatsHolder.appendChild(catsList);
    }

    optionsButton.onclick = (ev) => {
        // ipcRenderer.send("contextMenu", { key, index });

        /*const rect = optionsButton.getBoundingClientRect();
        const appImgRect = appImg.getBoundingClientRect();
        {
            pageY: saveFile[key].type === "exe" ? rect.top - 220 : rect.top - 185,
            pageX: appImgRect.left - 25
        }*/
        if (inMultiSelect) {
            if (!selectedApps.includes(key)) {
                selectedApps.push(key);
                checkbox.checked = true;
            }
            showMenuMultiSelect(ev);
        } else {
            showMenu(ev, key, index);
        }
    };

    appDiv.oncontextmenu = (ev) => {
        // ipcRenderer.send("contextMenu", { key, index });
        if (inMultiSelect) {
            if (!selectedApps.includes(key)) {
                selectedApps.push(key);
                checkbox.checked = true;
            }
            showMenuMultiSelect(ev);
        } else {
            showMenu(ev, key, index);
        }
    }

    appName.innerText = saveFile[key].gridName;

    appName.onpointerenter = (event) => {
        tooltip.textContent = appName.innerText;

        const appNameRect = appName.getBoundingClientRect()

        tooltip.style.left = appNameRect.x + "px";
        tooltip.style.top = event.clientY - 50 + "px";
        tooltip.style.display = "block";
    };

    appName.onpointerleave = () => {
        tooltip.style.display = "none";
    };

    optionsButton.className = "fa-solid fa-ellipsis";

    bottomHolder.appendChild(appName);
    bottomHolder.appendChild(optionsButton);
    bottomHolder.className = "bottom-holder";

    appDiv.appendChild(imageAndCatsHolder);
    appDiv.appendChild(bottomHolder);

    appGrid.appendChild(appDiv);
}

function showMenu(ev, appId, appIndex) {
    managedAppId = appId;
    managedAppIndex = appIndex;
    inOptionsMenu = true;
    setHints(menuHints);

    const managedAppData = saveFile[appId];

    if (managedAppData.type === "exe") {
        showInFolderButton.style.display = "block";
    } else {
        showInFolderButton.style.display = "none";
    }

    const gameCategories = managedAppData.categories ?? [];

    categoriesHolderSubmenu.innerHTML = "";

    for (let i = 0; i < categoriesFile.categories.length; i++) {
        const category = categoriesFile.categories[i];

        const listItem = document.createElement("li");
        const label = document.createElement("label");

        label.classList.add("checkbox-item")

        const checkBox = document.createElement("input");
        checkBox.type = "checkbox";

        checkBox.checked = gameCategories.includes(category)

        checkBox.onchange = () => {
            if (gameCategories.includes(category)) {
                gameCategories.splice(gameCategories.indexOf(category), 1);
            } else {
                gameCategories.push(category);
            }

            saveFile[appId].categories = gameCategories;
            fs.writeFileSync(
                path.join(savePath, "shortcuts.json"),
                JSON.stringify(saveFile)
            );

            ipcRenderer.send("updateSaveMain");

            if (searchBar.value === "")
                makeAppGrid(orderFile);
        }

        const span = document.createElement("span");
        span.classList.add("checkmark");

        const text = document.createTextNode(category.toString());

        label.appendChild(checkBox);
        label.appendChild(span);
        label.appendChild(text);

        listItem.appendChild(label)

        categoriesHolderSubmenu.appendChild(listItem);
    }

    menu.style.top = `${mouseY(ev) > window.innerHeight - 200 ? mouseY(ev) - 200 : mouseY(ev)}px`;
    menu.style.left = `${mouseX(ev) > appGrid.clientWidth - 200 ? mouseX(ev) - 200 : mouseX(ev)}px`;
    menu.style.display = 'block';
    menuBackground.className = "background";
}

function showMenuMultiSelect(ev) {
    categoriesAddHolderSubmenu.innerHTML = "";
    categoriesRemoveHolderSubmenu.innerHTML = "";

    inOptionsMenu = true;
    setHints(menuHints);

    for (let i = 0; i < categoriesFile.categories.length; i++) {
        const category = categoriesFile.categories[i];

        const listItemAdd = document.createElement("li");

        listItemAdd.onclick = () => {
            for (let i = 0; i < selectedApps.length; i++) {
                const appKey = selectedApps[i];
                if (!saveFile[appKey].categories.includes(category))
                    saveFile[appKey].categories.push(category)
            }

            fs.writeFileSync(
                path.join(savePath, "shortcuts.json"),
                JSON.stringify(saveFile)
            );
            ipcRenderer.send("updateSaveMain");

            hideContextMenu();
            multiSelectButton.click();
        }

        listItemAdd.innerText = category;
        categoriesAddHolderSubmenu.appendChild(listItemAdd);

        // remove items submenu
        const listItemRemove = document.createElement("li");

        listItemRemove.onclick = () => {
            for (let i = 0; i < selectedApps.length; i++) {
                const appKey = selectedApps[i];
                if (saveFile[appKey].categories.includes(category))
                    saveFile[appKey].categories.splice(saveFile[appKey].categories.indexOf(category), 1);
            }

            fs.writeFileSync(
                path.join(savePath, "shortcuts.json"),
                JSON.stringify(saveFile)
            );
            ipcRenderer.send("updateSaveMain");

            hideContextMenu();
            multiSelectButton.click();
        }

        listItemRemove.innerText = category;
        categoriesRemoveHolderSubmenu.appendChild(listItemRemove);
    }

    contextMenuMultiSelect.style.top = `${mouseY(ev) > window.innerHeight - 150 ? mouseY(ev) - 150 : mouseY(ev)}px`;
    contextMenuMultiSelect.style.left = `${mouseX(ev) > appGrid.clientWidth - 200 ? mouseX(ev) - 200 : mouseX(ev)}px`;
    contextMenuMultiSelect.style.display = 'block';
    menuBackground.className = "background";
}

document.querySelectorAll('.has-submenu').forEach(parent => {
    /**
     * @type {HTMLUListElement}
     */
    const submenu = parent.querySelector('.submenu');
    parent.addEventListener('mouseenter', () => {
        submenu.style.display = 'block';
        const submenuRect = submenu.getBoundingClientRect();

        if (submenuRect.right > window.innerWidth) {
            submenu.style.left = 'auto';
            submenu.style.right = '100%';
            submenu.style.marginRight = "-1px";
            submenu.style.marginLeft = "0px";
        }

        if (submenuRect.bottom > window.innerHeight) {
            submenu.style.top = 'auto';
            submenu.style.bottom = '-6px';
        }
    });

    parent.addEventListener('mouseleave', () => {
        submenu.style.left = '';
        submenu.style.right = '';
        submenu.style.top = '';
        submenu.style.bottom = '';
        submenu.style.display = 'none'
        submenu.style.marginLeft = "-1px";
        submenu.style.marginRight = "0px";
    });
});

function hideContextMenu() {
    menu.style.display = 'none';
    contextMenuMultiSelect.style.display = "none";
    menuBackground.className = "hide";
    inOptionsMenu = false;
    if (inMultiSelect)
        setHints(multiSelectHints);
    else
        setHints(defaultHints);
    clearMenuFocus();
    menuStack = [];
    activeMenuRoot = null;
}

menuBackground.onclick = () => {
    hideContextMenu();
}

menuBackground.oncontextmenu = () => {
    hideContextMenu();
}

menuBackground.onwheel = () => {
    hideContextMenu();
}

let focusedItem = 0;
let previousItem = 0;
let useMouse = true;
let gridColumnCount = 0;

/**
 * The context-menu root currently open via controller nav (menu or contextMenuMultiSelect), or null.
 * @type {HTMLElement|null}
 */
let activeMenuRoot = null;

/**
 * Stack of menu levels. Top of stack is whatever level the user is currently looking at -
 * the root menu, or a submenu they've drilled into.
 * @type {{ul: HTMLUListElement, items: HTMLLIElement[], index: number}[]}
 */
let menuStack = [];

window.onresize = () => {
    computeGridSize();
};

function computeGridSize() {
    const gridComputedStyle = window.getComputedStyle(appGrid);

    // get number of grid columns
    gridColumnCount = gridComputedStyle
        .getPropertyValue("grid-template-columns")
        .split(" ").length;
}

computeGridSize();

const REPEAT_DELAY_MS = 220;
let lastMoveAt = 0;
let barTimeout = null;
let inOptionsMenu = false;
let inFiltersMenu = false;
let deadZone = 0.6;

const bar = ensureBar();

const defaultHints = [
    { badge: ["l_stick", "dpad"], label: "Navigate" },
    { badge: ["a"], label: "Start" },
    { badge: ["x"], label: "Options" },
    { badge: ["y"], label: "Filters" },
    { badge: ["menu"], label: "Multi-select" }
];
const filterHints = [
    { badge: ["a"], label: "Toggle filter" },
    { badge: ["b"], label: "Close" },
    { badge: ["dpad_up", "dpad_down"], label: "Navigate" },
];
const menuHints = [
    { badge: ["l_stick", "dpad"], label: "Navigate" },
    { badge: ["a"], label: "Select" },
    { badge: ["b"], label: "Back" }
]
const multiSelectHints = [
    { badge: ["l_stick", "dpad"], label: "Navigate" },
    { badge: ["a"], label: "Select" },
    { badge: ["x"], label: "Options" },
    { badge: ["y"], label: "Filters" },
    { badge: ["menu"], label: "Multi-select" }
];
setHints(defaultHints);

// ---------- setup ----------

function ensureBar() {
    let el = document.getElementById("controllerBar");
    if (!el) {
        el = document.createElement("div");
        el.id = "controllerBar";
        document.body.appendChild(el);
    }
    return el;
}

function setHints(hints) {
    bar.innerHTML = hints
        .map(
            (h) =>
                `<span class="cn-hint">${h.badge.map(badge => `<image class="cn-badge" src="../assets/${controllerLayout}/${badge}.png">`).join("")}${h.label}</span>`
        )
        .join("");
}


function showBar() {
    bar.classList.add("cn-visible");
    clearTimeout(barTimeout);
}

function hideBarSoon() {
    // fades out after a few seconds of no controller input, but stays
    // up while actively navigating
    clearTimeout(barTimeout);
    barTimeout = setTimeout(() => {
        bar.classList.remove("cn-visible");
    }, 4000);
}

document.onkeydown = (ev) => {
    if (ev.key === "ArrowLeft" && !inOptionsMenu) {
        if (focusedItem === 0 || document.activeElement === searchBar) return;
        focusedItem--;
        focusItem();
    } else if (ev.key === "ArrowRight" && !inOptionsMenu) {
        if (
            focusedItem === appGrid.childNodes.length - 1 ||
            document.activeElement === searchBar
        )
            return;
        focusedItem++;
        focusItem();
    } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        if (focusedItem - gridColumnCount <= 0) {
            focusedItem = 0;
            focusItem();
        } else {
            focusedItem -= gridColumnCount;
            focusItem();
        }
    } else if (ev.key === "ArrowDown") {
        ev.preventDefault();
        if (focusedItem + gridColumnCount >= appGrid.childNodes.length - 1) {
            focusedItem = appGrid.childNodes.length - 1;
            focusItem();
        } else {
            focusedItem += gridColumnCount;
            focusItem();
        }
    } else if (ev.key === "Enter") {
        if (document.activeElement === toinput) return;
        if (document.activeElement === categoryNameInput) return;
        if (document.activeElement === searchBar) {
            focusItem();
        } else {
            if (categoriesFile.selected.length === 0) {
                launchAppInit(orderFile[focusedItem]);
            } else {
                launchAppInit(filteredApps[focusedItem]);
            }
        }
    }
};

function focusItem() {
    // console.log(focusedItem);
    const app = appGrid.childNodes.item(focusedItem);
    const previousApp = appGrid.childNodes.item(previousItem);

    if (useMouse)
        document.addEventListener("pointermove", removeUseMouse, { once: true })

    const rect = app.getBoundingClientRect();
    appGrid.scrollBy({ behavior: "smooth", top: rect.top - 250 });

    if (previousApp)
        previousApp.classList.remove("controller-focus");
    app.classList.add("controller-focus");
    previousItem = focusedItem;
    useMouse = false;
    removeCursor();

    appGrid.childNodes.item(focusedItem).focus();
}

function removeCursor() {
    document.documentElement.classList.add("hide-cursor");
}

function restoreCursor() {
    document.documentElement.classList.remove("hide-cursor");
}

function removeUseMouse() {
    if (!useMouse) {
        const previousApp = appGrid.childNodes.item(previousItem);
        previousApp.classList.remove("controller-focus");
        clearMenuFocus();
        restoreCursor();
        useMouse = true;
    }
}

addButton.onclick = () => {
    ipcRenderer.send("addWindow");
};

closeMessage.onclick = () => {
    infoMessage.close();
}

Controller.search();
/**
 * @type {Map<number, {serial: string, wireless: boolean}}
 */
const controllersMap = new Map();

function extractVidPid(id) {
    const m = id.match(/Vendor:\s*([0-9a-fA-F]{4}).*Product:\s*([0-9a-fA-F]{4})/);
    if (!m) return null;
    return {
        vid: parseInt(m[1].toLowerCase(), 16),
        pid: parseInt(m[2].toLowerCase(), 16)
    };
}

function splitEveryTwo(str) {
    return str.match(/.{1,2}/g) ?? [];
}

function getMacAdress(vid, pid) {
    const coltrollerDevices = HID.devices(vid, pid);

    const controller = coltrollerDevices[0]

    if (!controller)
        return console.log("No controller found aborting");

    const serialArray = splitEveryTwo(controller.serialNumber);
    return {
        serial: serialArray.join(":"),
        wireless: controller.interface === -1
    }
}

window.addEventListener(
    "gc.controller.found",
    function (event) {
        let controller = event.detail.controller;
        console.log("Controller found at index " + controller.index + ".");
        console.log("'" + controller.name + "' is ready!");

        controllerButton.style.display = "initial";

        const controllerVidPid = extractVidPid(controller.id);
        controllersMap.set(controller.index, getMacAdress(controllerVidPid.vid, controllerVidPid.pid));

        makeControllerMenu();
    },
    false
);

window.addEventListener(
    "gc.button.hold",
    function (event) {
        if (!document.hasFocus()) return;
        let button = event.detail;

        const now = performance.now();

        if (now - lastMoveAt > REPEAT_DELAY_MS) {
            if (button.name === "DPAD_LEFT") {
                if (inFiltersMenu) {
                    return; // no horizontal nav inside the filters list
                } else if (inOptionsMenu) {
                    lastMoveAt = now;
                    menuGoBack(); // steps into parent level; no-op with a beep-worthy bump at the root
                    showBar();
                } else {
                    if (focusedItem === 0 || document.activeElement === searchBar)
                        return;
                    lastMoveAt = now;
                    focusedItem--;
                    focusItem();
                    showBar();
                }
            } else if (button.name === "DPAD_RIGHT") {
                if (inFiltersMenu) {
                    return; // no horizontal nav inside the filters list
                } else if (inOptionsMenu) {
                    lastMoveAt = now;
                    menuEnterSubmenu(); // no-op if focused item has no submenu
                    showBar();
                } else {
                    if (
                        focusedItem === appGrid.childNodes.length - 1 ||
                        document.activeElement === searchBar
                    )
                        return;
                    lastMoveAt = now;
                    focusedItem++;
                    focusItem();
                    showBar();
                }
            } else if (button.name === "DPAD_UP") {
                if (inFiltersMenu) {
                    filterNavigate(-1);
                } else if (!inOptionsMenu) {
                    if (focusedItem - gridColumnCount <= 0) {
                        focusedItem = 0;
                    } else {
                        focusedItem -= gridColumnCount;
                    }

                    focusItem();
                } else {
                    menuNavigate(-1);
                }

                lastMoveAt = now;
                showBar();
            } else if (button.name === "DPAD_DOWN") {
                if (inFiltersMenu) {
                    filterNavigate(1);
                } else if (!inOptionsMenu) {
                    if (
                        focusedItem + gridColumnCount >=
                        appGrid.childNodes.length - 1
                    ) {
                        focusedItem = appGrid.childNodes.length - 1;
                    } else {
                        focusedItem += gridColumnCount;
                    }
                    focusItem();
                } else {
                    menuNavigate(1);
                }

                lastMoveAt = now;
                showBar();
            }
            hideBarSoon();
        }
    },
    false
);

/**
 * Direct <li> children of a menu/submenu <ul>, skipping hidden ones
 * (e.g. showInFolderButton when the app is a shortcut, not an exe).
 * @param {HTMLUListElement} ul
 * @returns {HTMLLIElement[]}
 */
function directMenuItems(ul) {
    return Array.from(ul.children).filter(
        (el) => el.tagName === "LI" && getComputedStyle(el).display !== "none"
    );
}

function clearMenuFocus() {
    menuStack.forEach((level) =>
        level.items.forEach((li) => li.classList.remove("controller-focus"))
    );
}

/**
 * Opens controller navigation on a context menu that's already been shown
 * (i.e. call this right after showMenu()/showMenuMultiSelect()).
 * @param {HTMLElement} rootEl menu or contextMenuMultiSelect
 */
function openControllerMenu(rootEl) {
    activeMenuRoot = rootEl;
    const rootUl = rootEl.querySelector(":scope > ul");
    menuStack = [{ ul: rootUl, items: directMenuItems(rootUl), index: 0 }];
    focusCurrentMenuLevel();
}

function focusCurrentMenuLevel() {
    clearMenuFocus();
    const level = menuStack[menuStack.length - 1];
    if (!level || !level.items.length) return;
    const li = level.items[level.index];
    li.classList.add("controller-focus");
    li.scrollIntoView({ block: "nearest" });
}

function menuNavigate(delta) {
    const level = menuStack[menuStack.length - 1];
    if (!level || !level.items.length) return;
    const next = level.index + delta;
    if (next < 0 || next >= level.items.length) return; // no wrap
    level.index = next;
    focusCurrentMenuLevel();
}

/**
 * Enters the submenu of the currently focused item, if it has one.
 * Mirrors the positioning logic from the existing mouseenter handler
 * further up so keyboard/controller opens look identical to hover.
 */
function menuEnterSubmenu() {
    const level = menuStack[menuStack.length - 1];
    if (!level) return;
    const li = level.items[level.index];
    if (!li || !li.classList.contains("has-submenu")) return;

    const submenu = li.querySelector(":scope > ul.submenu");
    if (!submenu || directMenuItems(submenu).length === 0) return;

    submenu.style.display = "block";
    const submenuRect = submenu.getBoundingClientRect();

    if (submenuRect.right > window.innerWidth) {
        submenu.style.left = "auto";
        submenu.style.right = "100%";
        submenu.style.marginRight = "-1px";
        submenu.style.marginLeft = "0px";
    }

    if (submenuRect.bottom > window.innerHeight) {
        submenu.style.top = "auto";
        submenu.style.bottom = "-6px";
    }

    menuStack.push({ ul: submenu, items: directMenuItems(submenu), index: 0 });
    focusCurrentMenuLevel();
}

/**
 * Steps back one menu level.
 * @returns {boolean} true if it stepped back into a parent level, false if it
 *   was already at the root (caller should close the whole menu in that case).
 */
function menuGoBack() {
    if (menuStack.length <= 1) return false;

    const level = menuStack.pop();
    level.ul.style.display = "none";
    level.ul.style.left = "";
    level.ul.style.right = "";
    level.ul.style.top = "";
    level.ul.style.bottom = "";
    level.ul.style.marginLeft = "-1px";
    level.ul.style.marginRight = "0px";

    focusCurrentMenuLevel();
    return true;
}

/**
 * Activates whatever is currently focused: opens a submenu, toggles a
 * category checkbox, or clicks a plain action (Start, Remove, etc.) -
 * reusing the click/onchange handlers already wired up elsewhere.
 */
function menuSelectFocused() {
    const level = menuStack[menuStack.length - 1];
    if (!level) return;
    const li = level.items[level.index];
    if (!li) return;

    if (li.classList.contains("has-submenu")) {
        menuEnterSubmenu();
        return;
    }

    const checkboxInput = li.querySelector("label.checkbox-item input");
    if (checkboxInput) {
        checkboxInput.click();
        return;
    }

    li.click();
}

/**
 * Direct .category-div rows currently focusable in the filters dialog.
 * @type {HTMLElement[]}
 */
let filterItems = [];
let filterIndex = 0;

function focusFiltersList() {
    filterItems = Array.from(categoriesDiv.children).filter((el) =>
        el.classList.contains("category-div")
    );
    filterIndex = 0;
    applyFilterFocus();
}

function applyFilterFocus() {
    filterItems.forEach((el, i) =>
        el.classList.toggle("controller-focus", i === filterIndex)
    );
    if (filterItems[filterIndex])
        filterItems[filterIndex].scrollIntoView({ block: "nearest" });
}

function filterNavigate(delta) {
    if (!filterItems.length) return;
    const next = filterIndex + delta;
    if (next < 0 || next >= filterItems.length) return; // no wrap
    filterIndex = next;
    applyFilterFocus();
}

function filterToggleFocused() {
    const div = filterItems[filterIndex];
    if (!div) return;
    const checkbox = div.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.click(); // reuses the existing onchange handler
}

/**
 * Opens the filters dialog (same as clicking the filter icon) and hands
 * controller focus to the first category checkbox.
 */
function openControllerFilters() {
    makeCategorySelector();
    categoriesManager.showModal();
    inFiltersMenu = true;
    setHints(filterHints);
    focusFiltersList();
    showBar();
}

function closeControllerFilters() {
    categoriesManager.close(); // fires the dialog's "close" listener below, which resets state
}

window.addEventListener("gc.analog.hold", (ev) => {
    if (!document.hasFocus()) return;

    const data = ev.detail
    if (data.name !== "LEFT_ANALOG_STICK")
        return

    const now = performance.now();

    if (now - lastMoveAt > REPEAT_DELAY_MS) {
        if (data.position.y < -deadZone) {
            if (inFiltersMenu) {
                filterNavigate(-1);
            } else if (!inOptionsMenu) {
                if (focusedItem - gridColumnCount <= 0) {
                    focusedItem = 0;
                } else {
                    focusedItem -= gridColumnCount;
                }

                focusItem();
            } else {
                menuNavigate(-1);
            }

            lastMoveAt = now;
            showBar();
        } else if (data.position.y > deadZone) {
            if (inFiltersMenu) {
                filterNavigate(1);
            } else if (!inOptionsMenu) {
                if (
                    focusedItem + gridColumnCount >=
                    appGrid.childNodes.length - 1
                ) {
                    focusedItem = appGrid.childNodes.length - 1;
                } else {
                    focusedItem += gridColumnCount;
                }
                focusItem();
            } else {
                menuNavigate(1);
            }

            lastMoveAt = now;
            showBar();
        }
        if (data.position.x < -deadZone && !inOptionsMenu) {
            if (inFiltersMenu) {
                return; // no horizontal nav inside the filters list
            } else if (inOptionsMenu) {
                lastMoveAt = now;
                menuGoBack(); // steps into parent level; no-op with a beep-worthy bump at the root
                showBar();
            } else {
                if (focusedItem === 0 || document.activeElement === searchBar)
                    return;
                lastMoveAt = now;
                focusedItem--;
                focusItem();
                showBar();
            }
        } else if (data.position.x > deadZone && !inOptionsMenu) {
            if (inFiltersMenu) {
                return; // no horizontal nav inside the filters list
            } else if (inOptionsMenu) {
                lastMoveAt = now;
                menuEnterSubmenu(); // no-op if focused item has no submenu
                showBar();
            } else {
                if (
                    focusedItem === appGrid.childNodes.length - 1 ||
                    document.activeElement === searchBar
                )
                    return;
                lastMoveAt = now;
                focusedItem++;
                focusItem();
                showBar();
            }
        }
        hideBarSoon();
    }
})

/**
 * Toggles a single app's multi-select checkbox state, mirroring appImg.onclick's
 * multi-select branch so controller and mouse behave identically.
 * @param {string} key
 * @param {HTMLElement} appDiv
 */
function toggleAppSelection(key, appDiv) {
    const checkbox = appDiv.querySelector(".app-checkbox");
    if (selectedApps.includes(key)) {
        selectedApps.splice(selectedApps.indexOf(key), 1);
        if (checkbox) checkbox.checked = false;
    } else {
        selectedApps.push(key);
        if (checkbox) checkbox.checked = true;
    }
}

/**
 * Selects an app without deselecting it if already selected - mirrors
 * appDiv.oncontextmenu's multi-select branch (right-click always selects,
 * never toggles off, before opening the multi-select context menu).
 * @param {string} key
 * @param {HTMLElement} appDiv
 */
function ensureAppSelected(key, appDiv) {
    const checkbox = appDiv.querySelector(".app-checkbox");
    if (!selectedApps.includes(key)) {
        selectedApps.push(key);
        if (checkbox) checkbox.checked = true;
    }
}

window.addEventListener(
    "gc.button.press",
    function (event) {
        if (!document.hasFocus()) return;
        let button = event.detail;

        const appId = categoriesFile.selected.length === 0 ? orderFile[focusedItem] : filteredApps[focusedItem];

        if (button.name === "FACE_1") {
            if (inFiltersMenu) {
                filterToggleFocused();
            } else if (!inOptionsMenu) {
                if (inMultiSelect) {
                    const appDiv = appGrid.childNodes.item(focusedItem);
                    toggleAppSelection(appId, appDiv);
                } else {
                    launchAppInit(appId);
                }
            } else {
                menuSelectFocused();
            }
        } else if (button.name === "FACE_3") {
            if (inOptionsMenu || inFiltersMenu) return; // something's already open, ignore
            const rect = appGrid.childNodes.item(focusedItem).getBoundingClientRect();
            // const appImgRect = appGrid.childNodes.item(focusedItem).querySelector("image").getBoundingClientRect();
            const menuPosition = {
                pageY: saveFile[appId].type === "exe" ? rect.top + 220 : rect.top + 185,
                pageX: rect.left
            };

            if (inMultiSelect) {
                const appDiv = appGrid.childNodes.item(focusedItem);
                ensureAppSelected(appId, appDiv);
                showMenuMultiSelect(menuPosition);
                openControllerMenu(contextMenuMultiSelect);
            } else {
                showMenu(menuPosition, appId, focusedItem);
                openControllerMenu(menu);
            }
        } else if (button.name === "FACE_2") {
            if (inFiltersMenu) {
                closeControllerFilters();
            } else if (inOptionsMenu) {
                if (!menuGoBack()) {
                    hideContextMenu();
                }
            }

            if (infoMessage.open) {
                infoMessage.close();
            }

            if (movetomenu.open) {
                movetomenu.close();
                movetomenu.classList.remove("showmove");
            }
        } else if (button.name === "FACE_4") {
            if (!inOptionsMenu && !inFiltersMenu) {
                openControllerFilters();
            }
        } else if (button.name === "START") {
            if (inOptionsMenu)
                hideContextMenu();

            multiSelectButton.click();

            focusItem();
        }
    }
)

window.addEventListener('gc.controller.lost', function (event) {
    console.log("The controller at index " + event.detail.index + " has been disconnected.");
    controllersMap.delete(event.detail.index)
    makeControllerMenu();
    const controllers = Controller.controllers;
    if (!controllers || Object.keys(controllers).length === 0) {
        controllerButton.style.display = "none";
    }
}, false);

function makeControllerMenu() {
    controllersList.innerHTML = "";
    const controllers = Controller.controllers;
    if (controllers && Object.keys(controllers).length > 0) {
        for (let i = 0; i < Object.keys(controllers).length; i++) {
            const controller = Object.values(controllers)[i];

            const controllerObject = document.createElement("div");
            const controllerInfoDiv = document.createElement("div");
            const controllerName = document.createElement("p");
            const controllerMac = document.createElement("p");
            const controllerState = document.createElement("p");
            const controllerActions = document.createElement("div");
            const disconnectAction = document.createElement("button");

            controllerObject.classList.add("controller");

            const connectionInfo = controllersMap.get(controller.index);

            controllerName.innerText = `Name: ${controller.name}`;

            controllerMac.innerText = `Mac: ${connectionInfo.serial}`;

            controllerState.innerText = `Connection Type: ${connectionInfo.wireless ? "Bluetooth" : "Wired"}`;

            controllerActions.classList.add("controller-actions");

            if (connectionInfo.wireless && process.platform === "win32") {
                disconnectAction.classList.add("fa-solid", "fa-link-slash", "fa-lg", "iconbtn");

                disconnectAction.onclick = () => {
                    ipcRenderer.send("disconnectController", connectionInfo.serial);
                    setTimeout(() =>
                        makeControllerMenu()
                        , 200);
                }

                controllerActions.appendChild(disconnectAction);

            }
            controllerInfoDiv.appendChild(controllerName);

            if (connectionInfo.wireless)
                controllerInfoDiv.appendChild(controllerMac);
            controllerInfoDiv.appendChild(controllerState);

            controllerObject.appendChild(controllerInfoDiv);
            controllerObject.appendChild(controllerActions);
            controllersList.appendChild(controllerObject);
        }
    } else {
        controllerManager.close();
    }
}

controllerButton.onclick = () => {
    makeControllerMenu();
    controllerManager.showModal();
}

cancelBtnControllers.onclick = () => {
    controllerManager.close();
}

settingsButton.onclick = () => {
    mainDiv.style.display = "none";
    settingsDiv.style.display = "flex";
};

function listSteamDirectories() {
    
}

manageSteamLocationsBtn.onclick = () => {
    steamDirsManager.showModal();
}

cancelBtnSteamDir.onclick = () => {
    steamDirsManager.close();
}

addDirctorySteamBtn.onclick = () => {
    ipcRenderer.send("cooseDirectory");
}

ipcRenderer.on("dirSelect", (ev, dirLocation) => {
    settingsFile.steamFolders.push(dirLocation);
})

settingsCancelBtn.onclick = () => {
    mainDiv.style.display = "grid";
    settingsDiv.style.display = "none";

    steamGridTokenInput.value = settingsFile.steamGridToken;
    startWithPcCheckBox.checked = settingsFile.startWithPc;
    serverCheckBox.checked = settingsFile.enableServer;
    serverPortInput.value = settingsFile.serverPort;
    serverPassInput.value = settingsFile.serverPassword;
    steamReadSwitch.value = settingsFile.importSteam;
    
    fullScreenCheckBox.checked = settingsFile.fullscreen;
    stayWithGameCheckBox.checked = settingsFile.stayOnGame;
    setTheme(settingsFile.theme);
    for (let i = 0; i < themeSelect.options.length; i++) {
        const option = themeSelect.options[i];
        if (option.value === settingsFile.theme) {
            themeSelect.selectedIndex = i;
            break;
        }
    }

    switch (controllerLayout) {
        case "xbox":
            controllerLayoutSelect.selectedIndex = 0;
            break;
        case "ps":
            controllerLayoutSelect.selectedIndex = 1;
            break;
    }

};

goToSteamGirdBtn.onclick = () => {
    shell.openExternal("https://www.steamgriddb.com/profile/preferences/api");
};

showTokenButton.onclick = () => {
    toggleVisibilityInput(steamGridTokenInput, showTokenButton);
}

showServerPortButton.onclick = () => {
    toggleVisibilityInput(serverPortInput, showServerPortButton);
}

showServerIpButton.onclick = () => {
    toggleVisibilityInput(serverIpInput, showServerIpButton);
}

showServerPasswordButton.onclick = () => {
    toggleVisibilityInput(serverPassInput, showServerPasswordButton);
}

/**
 * 
 * @param {HTMLInputElement} input 
 * @param {HTMLButtonElement} button 
 */
function toggleVisibilityInput(input, button) {
    if (input.type === 'password') {
        input.type = "text";
        button.classList.remove("fa-eye-slash");
        button.classList.add("fa-eye");
    } else {
        input.type = "password";
        button.classList.remove("fa-eye");
        button.classList.add("fa-eye-slash");
    }
}

settingsSaveBtn.onclick = () => {
    if (serverPortInput.value === "")
        return serverPortInput.value = settingsFile.serverPort

    settingsFile.startWithPc = startWithPcCheckBox.checked;
    settingsFile.steamGridToken = steamGridTokenInput.value;
    settingsFile.enableServer = serverCheckBox.checked;
    settingsFile.serverPort = serverPortInput.value;
    settingsFile.serverPassword = serverPassInput.value;
    settingsFile.importSteam = steamReadSwitch.checked;
    settingsFile.theme = themeSelect.options[themeSelect.selectedIndex].value;
    settingsFile.externalTheme = Boolean(parseInt(themeSelect.options[themeSelect.selectedIndex].getAttribute("data-external")));

    settingsFile.controllerLayout = controllerLayoutSelect.options[controllerLayoutSelect.selectedIndex].value;
    controllerLayout = settingsFile.controllerLayout;
    if (inMultiSelect)
        setHints(multiSelectHints);
    else
        setHints(defaultHints);

    settingsFile.fullscreen = fullScreenCheckBox.checked;
    settingsFile.stayOnGame = stayWithGameCheckBox.checked;

    mainDiv.style.display = "grid";
    settingsDiv.style.display = "none";
    ipcRenderer.send("updateSave", settingsFile);
};

function showMovePopup(index) {
    moveItem = index;
    toinput.value = index + 1;
    movetomenu.showModal();
    movetomenu.classList.add("showmove")
}

closeButton.onclick = () => {
    movetomenu.close();
    movetomenu.classList.remove("showmove")
};

moveButton.onclick = () => {
    const parsed = parseInt(toinput.value) - 1;
    ipcRenderer.send("changeOrder", {
        from: moveItem,
        to: parsed >= orderFile.length ? orderFile.length - 1 : parsed,
    });
    movetomenu.close();
    movetomenu.classList.remove("showmove")

};

toinput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
        moveButton.click();
    }
});

filterButton.onclick = () => {
    makeCategorySelector();
    categoriesManager.showModal();
}

cancelBtnCategories.onclick = () => {
    categoriesManager.close();
}

let categoriesChanged = false;

categoriesManager.addEventListener("close", () => {
    updateCategoriesFile();
    inFiltersMenu = false;
    filterItems.forEach((el) => el.classList.remove("controller-focus"));
    filterItems = [];
    if (categoriesChanged) {
        previousItem = 0;
        focusedItem = 0;
    }

    if (inMultiSelect)
        setHints(multiSelectHints);
    else
        setHints(defaultHints);
})

addCategoryForm.onsubmit = (ev) => {
    ev.preventDefault();
    const category = categoryNameInput.value.trim();

    if (!categoriesFile.categories.includes(category)) {
        categoriesFile.categories.push(category);
        updateCategoriesFile();
        makeCategorySelector();
        categoryNameInput.value = "";
    }
}

function makeCategorySelector() {
    categoriesDiv.innerHTML = "";
    categoriesChanged = false;

    for (let i = 0; i < categoriesFile.categories.length; i++) {
        const category = categoriesFile.categories[i];

        const div = document.createElement("div");
        const label = document.createElement("label");
        const button = document.createElement("button");

        div.classList.add("category-div")

        label.classList.add("custom-checkbox")

        const checkBox = document.createElement("input");
        checkBox.type = "checkbox";

        if (categoriesFile.selected.includes(category))
            checkBox.checked = true;

        checkBox.onchange = () => {
            if (checkBox.checked) {
                categoriesFile.selected.push(category.toString());
            } else {
                categoriesFile.selected.splice(categoriesFile.selected.indexOf(category.toString()), 1);
            }
            categoriesChanged = true;
            makeAppGrid(orderFile, inMultiSelect);
        }

        const span = document.createElement("span");
        span.classList.add("checkmark");

        const text = document.createTextNode(category.toString());

        button.classList.add("fa-solid", "fa-trash", "fa-lg", "iconbtn");

        button.onclick = () => {
            deleteCategory(category.toString());
        }

        label.appendChild(checkBox);
        label.appendChild(span);
        label.appendChild(text);

        div.appendChild(label);
        div.appendChild(button);
        categoriesDiv.appendChild(div);
    }
}

function updateCategoriesFile() {
    fs.writeFileSync(categoriesPath, JSON.stringify(categoriesFile));
}

/**
 * 
 * @param {string} categoryName 
 */
function deleteCategory(categoryName) {
    if (categoriesFile.categories.includes(categoryName)) {
        categoriesFile.categories.splice(categoriesFile.categories.indexOf(categoryName), 1);
    }
    if (categoriesFile.selected.includes(categoryName)) {
        categoriesFile.selected.splice(categoriesFile.selected.indexOf(categoryName.toString()), 1);
        makeAppGrid(orderFile, inMultiSelect);
    }
    updateCategoriesFile();
    makeCategorySelector();
}

// Stuff for the context menu
startAppButton.onclick = () => {
    hideContextMenu();
    launchAppInit(managedAppId);
}

editShortcutButton.onclick = () => {
    hideContextMenu();
    ipcRenderer.send("editShortcut", managedAppId);
}

showInFolderButton.onclick = () => {
    hideContextMenu();
    shell.showItemInFolder(saveFile[managedAppId].location);
}

changePossitionButton.onclick = () => {
    hideContextMenu();
    showMovePopup(managedAppIndex);
}

removeAppButton.onclick = () => {
    hideContextMenu();
    ipcRenderer.send("removeShortcut", managedAppId);
}

showSelectionButton.onclick = () => {
    hideContextMenu();
    messageHolder.innerHTML = "";

    infoMessageTitle.innerText = "Selected Apps...";

    const appsNameList = document.createElement("ul");

    appsNameList.style.listStyle = "decimal-leading-zero";
    appsNameList.style.fontSize = "1.2em";

    for (let i = 0; i < selectedApps.length; i++) {
        const appId = selectedApps[i];

        const listItem = document.createElement("li");
        listItem.innerText = saveFile[appId].gridName;
        appsNameList.appendChild(listItem);
    }

    messageHolder.appendChild(appsNameList);
    infoMessage.showModal();
}

removeMultiSelectButton.onclick = () => {
    hideContextMenu();
    ipcRenderer.send("removeMultiple", {
        apps: selectedApps
    });
}
