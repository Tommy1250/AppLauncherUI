const getWindowsShortcutProperties = require("get-windows-shortcut-properties");
const { ipcRenderer, shell, webFrame } = require("electron");
const fs = require("fs");
const path = require("path");
const { queueBanner } = require("./functions/steamGrid");
const ip = require("ip");

let shortcutsFile = "";
let savePath = "";
let imagesPath = "";
let orderPath = "";
let categoriesPath = "";

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
 * @type {{startWithPc: boolean, steamGridToken: string, enableServer: boolean, serverPort: number, serverPassword: string}}
 */
let settingsFile = {};

/**
 * @type {string[]}
 */
let orderFile = [];

/**
 * @type {{selected: string[], categories: string[]}}
 */
let categoriesFile = {}

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

const serverCheckBox = document.getElementById("enableServer");
const serverPortInput = document.getElementById("serverPort");
const serverPassInput = document.getElementById("serverPass");
const serverIpInput = document.getElementById("serverIp");

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

const infoMessage = document.getElementById("infoMessage");
const infoMessageTitle = document.getElementById("infoMessageTitle");
const messageHolder = document.getElementById("message");
const closeMessage = document.getElementById("closeMessage");

let currentScroll = 0;

let moveItem = -10;

ipcRenderer.on("savePath", (ev, args) => {
    savePath = args;
    console.log(savePath);
    shortcutsFile = path.join(savePath, "shortcuts.json");
    imagesPath = path.join(savePath, "images");
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

            addItemToGrid(key, i, showCat);
        }

        appGrid.scrollTop = currentScroll;
    } else {
        for (let i = 0; i < entries.length; i++) {
            const key = entries[i];
            if (saveFile[key].categories?.some(cat => categoriesFile.selected.includes(cat))) {
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
        const shortcutPath = file.path;

        if (file.name.endsWith(".url")) {
            console.log("urlFile");
            const fileData = fs.readFileSync(file.path, "utf-8");
            const parsed = fileData.split("\n");
            const itemObj = {};

            for (let j = 0; j < parsed.length; j++) {
                const ele = parsed[j];
                const item = ele.replace("=", "▓").replace("\r", "").split("▓");
                itemObj[item[0]] = item[1];
            }

            let fileNameArr = file.name.split(".");
            fileNameArr.pop();

            editSaveObj(fileNameArr.join("."), itemObj.URL, "url");

            if (
                !fs.existsSync(
                    path.join(imagesPath, `${fileNameArr.join(".")}.png`)
                )
            ) {
                if (settingsFile.steamGridToken !== "")
                    await queueBanner(
                        fileNameArr.join("."),
                        imagesPath,
                        settingsFile.steamGridToken
                    );
            } else makeAppGrid(orderFile, inMultiSelect);
        } else if (file.name.endsWith(".lnk")) {
            console.log("realSortcut");
            const shortcutData =
                getWindowsShortcutProperties.sync(shortcutPath)[0];

            let fileNameArr = file.name.split(".");
            fileNameArr.pop();

            editSaveObj(
                fileNameArr.join("."),
                shortcutData.TargetPath,
                "exe",
                shortcutData.Arguments ? shortcutData.Arguments : null
            );

            if (
                !fs.existsSync(
                    path.join(imagesPath, `${fileNameArr.join(".")}.png`)
                )
            ) {
                if (settingsFile.steamGridToken !== "")
                    await queueBanner(
                        fileNameArr.join("."),
                        imagesPath,
                        settingsFile.steamGridToken
                    );
            } else makeAppGrid(orderFile, inMultiSelect);
        } else if (file.name.endsWith(".exe")) {
            console.log("exe file");

            let fileNameArr = file.name.split(".");
            fileNameArr.pop();

            editSaveObj(fileNameArr.join("."), file.path, "exe");

            if (
                !fs.existsSync(
                    path.join(imagesPath, `${fileNameArr.join(".")}.png`)
                )
            ) {
                if (settingsFile.steamGridToken !== "")
                    await queueBanner(
                        fileNameArr.join("."),
                        imagesPath,
                        settingsFile.steamGridToken
                    );
            } else makeAppGrid(orderFile, inMultiSelect);
        }
    }
    saveTheFile();
});

function editSaveObj(fileName, location, type, args = null) {
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
        if (searchBar.value !== "") search(searchBar.value);
        else makeAppGrid(orderFile);
    } else {
        inMultiSelect = true;
        multiSelectButton.classList.add("active-item");
        if (searchBar.value !== "") search(searchBar.value);
        else makeAppGrid(orderFile, true);
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
            ipcRenderer.send("launch", key);
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
        for (let i = 0; i < saveFile[key].categories.length; i++) {
            const itemcat = saveFile[key].categories[i];
            const li = document.createElement("li");
            li.innerText = itemcat;
            catsList.appendChild(li);
        }

        catsList.classList.add("cats-list");

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
            showMenuMultiSelect(ev);
        } else {
            showMenu(ev, key, index);
        }
    };

    appDiv.oncontextmenu = (ev) => {
        // ipcRenderer.send("contextMenu", { key, index });
        if (inMultiSelect) {
            showMenuMultiSelect(ev);
        } else {
            showMenu(ev, key, index);
        }
    }

    appName.innerText = saveFile[key].gridName;

    appName.onpointerenter = (event) => {
        tooltip.textContent = appName.innerText;
        tooltip.style.left = event.clientX + "px";
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

            if (searchBar.value !== "") search(searchBar.value);
            else makeAppGrid(orderFile);
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

document.onkeydown = (ev) => {
    if (ev.key === "ArrowLeft") {
        if (focusedItem === 0 || document.activeElement === searchBar) return;
        focusedItem--;
        focusItem();
    } else if (ev.key === "ArrowRight") {
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
                ipcRenderer.send("launch", orderFile[focusedItem]);
            } else {
                ipcRenderer.send("launch", filteredApps[focusedItem]);
            }
        }
    }
};

function focusItem() {
    // console.log(focusedItem);
    const app = appGrid.childNodes.item(focusedItem);
    const previousApp = appGrid.childNodes.item(previousItem);

    const rect = app.getBoundingClientRect();
    appGrid.scrollBy({ behavior: "smooth", top: rect.top - 250 });

    previousApp.style.removeProperty("background-color");
    app.style.backgroundColor = "#e5e2e245";
    previousItem = focusedItem;
    useMouse = false;
    removeCursor();
    document.addEventListener("pointermove", removeUseMouse, { once: true })
    appGrid.childNodes[focusedItem].focus();
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
        previousApp.style.removeProperty("background-color");
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

window.addEventListener(
    "gc.controller.found",
    function (event) {
        let controller = event.detail.controller;
        console.log("Controller found at index " + controller.index + ".");
        console.log("'" + controller.name + "' is ready!");
    },
    false
);

window.addEventListener(
    "gc.button.press",
    function (event) {
        if (!document.hasFocus()) return;
        let button = event.detail;
        if (button.name === "DPAD_LEFT") {
            if (focusedItem === 0 || document.activeElement === searchBar)
                return;
            focusedItem--;
            focusItem();
        } else if (button.name === "DPAD_RIGHT") {
            if (
                focusedItem === appGrid.childNodes.length - 1 ||
                document.activeElement === searchBar
            )
                return;
            focusedItem++;
            focusItem();
        } else if (button.name === "DPAD_UP") {
            if (focusedItem - gridColumnCount <= 0) {
                focusedItem = 0;
                focusItem();
            } else {
                focusedItem -= gridColumnCount;
                focusItem();
            }
        } else if (button.name === "DPAD_DOWN") {
            if (
                focusedItem + gridColumnCount >=
                appGrid.childNodes.length - 1
            ) {
                focusedItem = appGrid.childNodes.length - 1;
                focusItem();
            } else {
                focusedItem += gridColumnCount;
                focusItem();
            }
        } else if (button.name === "FACE_1") {
            if (categoriesFile.selected.length === 0) {
                ipcRenderer.send("launch", orderFile[focusedItem]);
            } else {
                ipcRenderer.send("launch", filteredApps[focusedItem]);
            }
        }
    },
    false
);

let moveCounter = 0;

// Analog Stick start movement event
window.addEventListener('gc.analog.start', function (event) {
    let data = event.detail;

    if (!document.hasFocus()) return;
    if (data.name !== "LEFT_ANALOG_STICK")
        return

    moveCounter = 20;
})

window.addEventListener("gc.analog.hold", (ev) => {
    if (!document.hasFocus()) return;

    const data = ev.detail
    if (data.name !== "LEFT_ANALOG_STICK")
        return

    if (data.position.y > 0.8 || data.position.y < -0.8) {
        moveCounter += 1
        if (moveCounter > 20) {
            moveCounter = 0;

            if (data.position.y < -0.8) {
                if (focusedItem - gridColumnCount <= 0) {
                    focusedItem = 0;
                    focusItem();
                } else {
                    focusedItem -= gridColumnCount;
                    focusItem();
                }
            } else if (data.position.y > 0.8) {
                if (
                    focusedItem + gridColumnCount >=
                    appGrid.childNodes.length - 1
                ) {
                    focusedItem = appGrid.childNodes.length - 1;
                    focusItem();
                } else {
                    focusedItem += gridColumnCount;
                    focusItem();
                }
            }
        }
    }
    if (data.position.x > 0.8 || data.position.x < -0.8) {
        moveCounter += 1
        if (moveCounter > 20) {
            moveCounter = 0;

            if (data.position.x < -0.8) {
                if (focusedItem === 0 || document.activeElement === searchBar)
                    return;
                focusedItem--;
                focusItem();
            } else if (data.position.x > 0.8) {
                if (
                    focusedItem === appGrid.childNodes.length - 1 ||
                    document.activeElement === searchBar
                )
                    return;
                focusedItem++;
                focusItem();
            }
        }
    }
})

settingsButton.onclick = () => {
    mainDiv.style.display = "none";
    settingsDiv.style.display = "flex";
};

settingsCancelBtn.onclick = () => {
    mainDiv.style.display = "grid";
    settingsDiv.style.display = "none";

    steamGridTokenInput.value = settingsFile.steamGridToken;
    startWithPcCheckBox.checked = settingsFile.startWithPc;
    serverCheckBox.checked = settingsFile.enableServer;
    serverPortInput.value = settingsFile.serverPort;
    serverPassInput.value = settingsFile.serverPassword;
};

goToSteamGirdBtn.onclick = () => {
    shell.openExternal("https://www.steamgriddb.com/profile/preferences/api");
};

settingsSaveBtn.onclick = () => {
    if (serverPortInput.value === "")
        return serverPortInput.value = settingsFile.serverPort
    settingsFile = {
        startWithPc: startWithPcCheckBox.checked,
        steamGridToken: steamGridTokenInput.value,
        enableServer: serverCheckBox.checked,
        serverPort: serverPortInput.value,
        serverPassword: serverPassInput.value
    };
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

categoriesManager.addEventListener("close", () => {
    updateCategoriesFile();
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
    ipcRenderer.send("launch", managedAppId);
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