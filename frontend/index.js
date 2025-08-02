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

const tooltip = document.getElementById("tooltip");

const appGrid = document.getElementById("appgrid");
const searchForm = document.getElementById("searchForm");
const searchBar = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");

const addButton = document.getElementById("add");
const settingsButton = document.getElementById("settings");

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

    if(!fs.existsSync(path.join(savePath, "notFirstTime.txt"))){
        fs.writeFileSync(path.join(savePath, "notFirstTime.txt"), "This is not the first time the user opens the app")

        messageHolder.innerHTML = "";
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

function makeAppGrid(entries) {
    currentScroll = appGrid.scrollTop;
    appGrid.innerHTML = "";
    if(categoriesFile.selected.length === 0){
        for (let i = 0; i < entries.length; i++) {
            const key = entries[i];
    
            addItemToGrid(key, i);
        }

        appGrid.scrollTop = currentScroll;
    }else{
        for (let i = 0; i < entries.length; i++) {
            const key = entries[i];
            if(saveFile[key].categories?.some(cat => categoriesFile.selected.includes(cat))) {
                addItemToGrid(key, i);
            }
        }

        appGrid.scrollTop = currentScroll;
    }
}

function updateSaveFile() {
    saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
    orderFile = JSON.parse(fs.readFileSync(orderPath, "utf-8"));
    webFrame.clearCache();
    if (searchBar.value !== "") search(searchBar.value);
    else makeAppGrid(orderFile);
    // filterGrid(activeCategory);
}

ipcRenderer.on("updateSave", () => updateSaveFile());

//drag and drop methods
document.addEventListener("dragover", (e) => {
    e.stopPropagation();
    e.preventDefault();
});

document.addEventListener("drop", async (e) => {
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
            } else makeAppGrid(orderFile);
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
            } else makeAppGrid(orderFile);
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
            } else makeAppGrid(orderFile);
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
    else makeAppGrid(orderFile);
};

searchBar.oninput = () => {
    if (searchBar.value !== "") search(searchBar.value);
    else makeAppGrid(orderFile);
};

clearSearch.onclick = () => {
    searchBar.value = "";
    makeAppGrid(orderFile);
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
            addItemToGrid(key, i);
        }
    }
}

/**
 *
 * @param {string} key
 * @param {number} index
 */
function addItemToGrid(key, index) {
    const appDiv = document.createElement("div");
    const appImg = document.createElement("img");
    const appName = document.createElement("p");
    const optionsButton = document.createElement("button");
    const bottomHolder = document.createElement("div");

    appDiv.className = "app-div";

    appImg.className = "app-img";
    let imagePath = path.join(imagesPath, `${key}.png`);
    if (!fs.existsSync(imagePath)) {
        if (saveFile[key].type === "dir")
            imagePath = path.join(__dirname, "missingdir.png");
        else
            imagePath = path.join(__dirname, "missing.png");
    }
    appImg.src = imagePath;
    appImg.setAttribute("draggable", false);

    appImg.onclick = () => {
        console.log(`running game ${key}`);

        ipcRenderer.send("launch", key);
    };

    optionsButton.onclick = () => {
        console.log(`options click on ${key} ${index}`);
        ipcRenderer.send("contextMenu", { key, index });
    };

    appDiv.oncontextmenu = () => {
        console.log(`right click on ${key} ${index}`);
        ipcRenderer.send("contextMenu", { key, index });
    };

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

    appDiv.appendChild(appImg);
    appDiv.appendChild(bottomHolder);

    appGrid.appendChild(appDiv);
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
            ipcRenderer.send("launch", orderFile[focusedItem]);
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
    document.body.style.cursor = "none";
}

document.onpointermove = () => {
    if (!useMouse) {
        const previousApp = appGrid.childNodes.item(previousItem);
        previousApp.style.removeProperty("background-color");
        document.body.style.removeProperty("cursor");
        useMouse = true;
    }
};

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
            ipcRenderer.send("launch", orderFile[focusedItem]);
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

ipcRenderer.on("showMovePopup", (ev, index) => {
    moveItem = index;
    toinput.value = index + 1;
    movetomenu.showModal();
    movetomenu.classList.add("showmove")
});

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

    if (!categoriesFile.categories.includes(category)){
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
        
        if(categoriesFile.selected.includes(category))
            checkBox.checked = true;
        
        checkBox.onchange = () => {
            if(checkBox.checked){
                categoriesFile.selected.push(category.toString());
            }else{
                categoriesFile.selected.splice(categoriesFile.selected.indexOf(category.toString()), 1);
            }
            makeAppGrid(orderFile);
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
    ipcRenderer.send("updateCategoriesMain");
}

/**
 * 
 * @param {string} categoryName 
 */
function deleteCategory(categoryName) {
    if (categoriesFile.categories.includes(categoryName)) {
        categoriesFile.categories.splice(categoriesFile.categories.indexOf(categoryName), 1);
    }
    if(categoriesFile.selected.includes(categoryName)) {
        categoriesFile.selected.splice(categoriesFile.selected.indexOf(categoryName.toString()), 1);
        makeAppGrid(orderFile);
    }
    updateCategoriesFile();
    makeCategorySelector();
}