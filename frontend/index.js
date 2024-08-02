const getWindowsShortcutProperties = require("get-windows-shortcut-properties");
const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const { queueBanner } = require("./functions/steamGrid");

let shortcutsFile = "";
let savePath = "";
let imagesPath = "";
/**
 * @type {{appname: {type: "url" | "exe", location: string, args?: string, gridName: string}}}
 */
let saveFile = {};

const appGrid = document.getElementById("appgrid");
const searchForm = document.getElementById("searchForm");
const searchBar = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");

const addButton = document.getElementById("add");
// const settingsButton = document.getElementById("settings");

ipcRenderer.on("savePath", (ev, args) => {
    savePath = args;
    console.log(savePath);
    shortcutsFile = path.join(savePath, "shortcuts.json");
    imagesPath = path.join(savePath, "images");
    saveFile = JSON.parse(fs.readFileSync(path.join(shortcutsFile), "utf-8"));
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
    for (let i = 0; i < Object.keys(saveFile).length; i++) {
        const key = Object.keys(saveFile)[i];

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
        if(!fs.existsSync(imagePath))
            imagePath = path.join(__dirname, "missing.png");
        appImg.src = imagePath;
        appImg.setAttribute("draggable", false);

        appImg.onclick = () => {
            console.log(`running game ${key}`);

            ipcRenderer.send("launch", key);
        };

        // appDiv.onclick = () => {
        //     console.log("appdiv click");
        // }

        optionsButton.onclick = () => {
            console.log(`options click on ${key}`);
            ipcRenderer.send("contextMenu", key);
        };

        appDiv.oncontextmenu = () => {
            console.log(`right click on ${key}`);
            ipcRenderer.send("contextMenu", key);
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
}

function updateSaveFile() {
    saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
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
        // progressHolder.innerText = `Proccessing: ${i + 1} out of ${files.length}`;
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
            )
                await queueBanner(fileNameArr.join("."), imagesPath);
            else makeAppGrid();
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
            )
                await queueBanner(fileNameArr.join("."), imagesPath);
            else makeAppGrid();
        } else if (file.name.endsWith(".exe")) {
            console.log("exe file");

            let fileNameArr = file.name.split(".");
            fileNameArr.pop();

            editSaveObj(fileNameArr.join("."), file.path, "exe");

            if (
                !fs.existsSync(
                    path.join(imagesPath, `${fileNameArr.join(".")}.png`)
                )
            )
                await queueBanner(fileNameArr.join("."), imagesPath);
            else makeAppGrid();
        }
    }
    saveTheFile();
    // setTimeout(() => {
    //     makeAppGrid();
    // }, 200)
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
}

function saveTheFile() {
    // progressHolder.innerText = "";
    fs.writeFileSync(shortcutsFile, JSON.stringify(saveFile));
    ipcRenderer.send("updateSaveMain")
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
    for (let i = 0; i < Object.keys(saveFile).length; i++) {
        const key = Object.keys(saveFile)[i];

        if (
            key.toLowerCase().includes(query.toLowerCase()) ||
            saveFile[key].gridName.toLowerCase().includes(query.toLowerCase())
        ) {
            const appDiv = document.createElement("div");
            const background = document.createElement("div");
            const appImg = document.createElement("img");
            const appName = document.createElement("p");
            const optionsButton = document.createElement("button");
            const bottomHolder = document.createElement("div");

            appDiv.className = "app-div";

            background.className = "app-bg";

            appImg.className = "app-img";
            appImg.src = path.join(imagesPath, `${key}.png`);
            appImg.setAttribute("draggable", false);

            appImg.onclick = () => {
                console.log(`running game ${key}`);

                ipcRenderer.send("launch", key);
            };

            // appDiv.onclick = () => {
            //     console.log("appdiv click");
            // }

            optionsButton.onclick = () => {
                console.log(`options click on ${key}`);
                ipcRenderer.send("contextMenu", key);
            };

            appDiv.oncontextmenu = () => {
                console.log(`right click on ${key}`);
                ipcRenderer.send("contextMenu", key);
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
    }
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
        if (document.activeElement === searchBar) {
            focusItem();
        } else {
            ipcRenderer.send("launch", Object.keys(saveFile)[focusedItem]);
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
            ipcRenderer.send("launch", Object.keys(saveFile)[focusedItem]);
        }
    },
    false
);

// // Analog Stick start movement event
// window.addEventListener('gc.analog.start', function(event) {
//     var stick = event.detail;
//     console.log(stick);
// })
