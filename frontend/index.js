const getWindowsShortcutProperties = require("get-windows-shortcut-properties");
const { ipcRenderer, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const { queueBanner } = require("./functions/steamGrid");

let shortcutsFile = "";
let savePath = "";
let imagesPath = "";
let orderPath = "";
/**
 * @type {{appname: {type: "url" | "exe", location: string, args?: string, gridName: string}}}
 */
let saveFile = {};

/**
 * @type {{startWithPc: boolean, steamGridToken: string}}
 */
let settingsFile = {};

/**
 * @type {string[]}
 */
let orderFile = [];

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

/**
 * @type {HTMLDialogElement}
 */
const movetomenu = document.getElementById("movetomenu");
const closeButton = document.getElementById("close");
const moveButton = document.getElementById("moveperm");
const toinput = document.getElementById("toinput");

let moveItem = -10;

ipcRenderer.on("savePath", (ev, args) => {
    savePath = args;
    console.log(savePath);
    shortcutsFile = path.join(savePath, "shortcuts.json");
    imagesPath = path.join(savePath, "images");
    orderPath = path.join(savePath, "order.json");

    saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
    settingsFile = JSON.parse(
        fs.readFileSync(path.join(savePath, "settings.json"), "utf-8")
    );

    orderFile = JSON.parse(fs.readFileSync(orderPath, "utf-8"));

    steamGridTokenInput.value = settingsFile.steamGridToken;
    startWithPcCheckBox.checked = settingsFile.startWithPc;

    makeAppGrid();

    if (!fs.existsSync(imagesPath)) {
        fs.mkdirSync(imagesPath);
    }
});

if (shortcutsFile === "") {
    ipcRenderer.send("getSavePath");
}

function makeAppGrid() {
    appGrid.innerHTML = "";
    for (let i = 0; i < orderFile.length; i++) {
        const key = orderFile[i];

        addItemToGrid(key, i);
    }
}

function updateSaveFile() {
    saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
    orderFile = JSON.parse(fs.readFileSync(orderPath, "utf-8"));
    makeAppGrid();
}

ipcRenderer.on("updateSave", () => updateSaveFile());

ipcRenderer.on("refresh", () => makeAppGrid());

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
            } else makeAppGrid();
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
            } else makeAppGrid();
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
            } else makeAppGrid();
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
        };
    } else {
        saveFile[fileName] = {
            type: type,
            location: `${location}`,
            args: `${args}`,
            gridName: fileName,
        };
    }
    if (!orderFile.includes(fileName)) orderFile.push(fileName);
}

function saveTheFile() {
    // progressHolder.innerText = "";
    fs.writeFileSync(shortcutsFile, JSON.stringify(saveFile));
    fs.writeFileSync(orderPath, JSON.stringify(orderFile));
    ipcRenderer.send("updateSaveMain");
}

searchForm.onsubmit = (ev) => {
    ev.preventDefault();
    if (searchBar.value !== "") search(searchBar.value);
    else makeAppGrid();
};

searchBar.oninput = () => {
    if (searchBar.value !== "") search(searchBar.value);
    else makeAppGrid();
};

clearSearch.onclick = () => {
    searchBar.value = "";
    makeAppGrid();
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
    const background = document.createElement("div");
    const appImg = document.createElement("img");
    const appName = document.createElement("p");
    const optionsButton = document.createElement("button");
    const bottomHolder = document.createElement("div");

    appDiv.className = "app-div";

    background.className = "app-bg";

    appImg.className = "app-img";
    let imagePath = path.join(imagesPath, `${key}.png`);
    if (!fs.existsSync(imagePath))
        imagePath = path.join(__dirname, "missing.png");
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
    optionsButton.className = "fa-solid fa-ellipsis";

    bottomHolder.appendChild(appName);
    bottomHolder.appendChild(optionsButton);
    bottomHolder.className = "bottom-holder";

    appDiv.appendChild(background);
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
        if (document.activeElement === toinput)
            return;
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

// // Analog Stick start movement event
// window.addEventListener('gc.analog.start', function(event) {
//     var stick = event.detail;
//     console.log(stick);
// })

settingsButton.onclick = () => {
    mainDiv.style.display = "none";
    settingsDiv.style.display = "flex";
};

settingsCancelBtn.onclick = () => {
    mainDiv.style.display = "grid";
    settingsDiv.style.display = "none";
};

goToSteamGirdBtn.onclick = () => {
    shell.openExternal("https://www.steamgriddb.com/profile/preferences/api");
};

settingsSaveBtn.onclick = () => {
    settingsFile = {
        startWithPc: startWithPcCheckBox.checked,
        steamGridToken: steamGridTokenInput.value,
    };
    mainDiv.style.display = "grid";
    settingsDiv.style.display = "none";
    ipcRenderer.send("updateSave", settingsFile);
};

ipcRenderer.on("showMovePopup", (ev, index) => {
    moveItem = index;
    toinput.value = index + 1;
    movetomenu.showModal();
});

closeButton.onclick = () => {
    movetomenu.close();
}

moveButton.onclick = () => {
    const parsed = parseInt(toinput.value) - 1;
    ipcRenderer.send("changeOrder", {from: moveItem, to: parsed >= orderFile.length ? orderFile.length - 1 : parsed});
    movetomenu.close();
}

toinput.addEventListener("keydown", (ev) => {
    if(ev.key === "Enter") {
        moveButton.click();
    }
})