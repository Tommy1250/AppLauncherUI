const getWindowsShortcutProperties = require("get-windows-shortcut-properties");
const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const { queueBanner } = require("./functions/steamGrid");
const launchApp = require("./functions/launchApp");

let shortcutsFile = "";
let savePath = "";
let imagesPath = "";
/**
 * @type {{appname: {type: "url" | "exe", location: string, args?: string, gridName: string}}}
 */
let saveFile = {};

const appGrid = document.getElementById("appgrid");
// const progressHolder = document.getElementById("progress");
const searchForm = document.getElementById("searchForm");
const searchBar = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");

ipcRenderer.on("savePath", (ev, args) => {
    savePath = args;
    console.log(savePath);
    shortcutsFile = path.join(savePath, "shortcuts.json");
    imagesPath = path.join(savePath, "images");
    if (!fs.existsSync(shortcutsFile)) {
        fs.writeFileSync(shortcutsFile, "{}");
        saveFile = {};
    } else {
        saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
        makeAppGrid();
    }

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
        appImg.src = path.join(imagesPath, `${key}.png`);
        appImg.setAttribute("draggable", false);

        appImg.onclick = () => {
            console.log(`running game ${key}`);

            launchApp(saveFile[key]);
        };

        // appDiv.onclick = () => {
        //     console.log("appdiv click");
        // }

        optionsButton.onclick = () => {
            console.log(`options click on ${key}`)
            ipcRenderer.send("contextMenu", key);
        }

        appDiv.oncontextmenu = () => {
            console.log(`right click on ${key}`);
            ipcRenderer.send("contextMenu", key);
        }

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
            gridName: fileName
        };
    } else {
        saveFile[fileName] = {
            type: type,
            location: `${location}`,
            args: `${args}`,
            gridName: fileName
        };
    }
}

function saveTheFile() {
    // progressHolder.innerText = "";
    fs.writeFileSync(shortcutsFile, JSON.stringify(saveFile, null, 4));
}

searchForm.onsubmit = (ev) => {
    ev.preventDefault();
    if(searchBar.value !== "")
        search(searchBar.value);
    else
        makeAppGrid();
}

searchBar.oninput = () => {
    if(searchBar.value !== "")
        search(searchBar.value);
    else
        makeAppGrid();
}

clearSearch.onclick = () => {
    searchBar.value = "";
    makeAppGrid();
}

function search(query) {
    appGrid.innerHTML = "";
    for (let i = 0; i < Object.keys(saveFile).length; i++) {
        const key = Object.keys(saveFile)[i];

        if(key.toLowerCase().includes(query.toLowerCase()) || saveFile[key].gridName.toLowerCase().includes(query.toLowerCase())) {
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

            launchApp(saveFile[key]);
        };

        // appDiv.onclick = () => {
        //     console.log("appdiv click");
        // }

        optionsButton.onclick = () => {
            console.log(`options click on ${key}`)
            ipcRenderer.send("contextMenu", key);
        }

        appDiv.oncontextmenu = () => {
            console.log(`right click on ${key}`);
            ipcRenderer.send("contextMenu", key);
        }

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