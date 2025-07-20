const getWindowsShortcutProperties = require("get-windows-shortcut-properties");
const { ipcRenderer, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const { queueBanner } = require("./functions/steamGrid");

let shortcutsFile = "";
let savePath = "";
let imagesPath = "";
let orderPath = "";
// let categoriesPath = "";

/**
 * @type {{appname: {type: "url" | "exe" | "dir", location: string, args?: string, gridName: string}}}
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

// /**
//  * @type {string[]}
//  */
// let categories = ["All"];
// let activeCategory = "All";

// /**
//  * @type {string[]}
//  */
// let categoryEntries = [];

const tooltip = document.getElementById("tooltip");

const appGrid = document.getElementById("appgrid");
const searchForm = document.getElementById("searchForm");
const searchBar = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");
// /**
//  * @type {HTMLSelectElement}
//  */
// const filterSelect = document.getElementById("filter");

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

/**
 * @type {HTMLDialogElement}
 */
const movetomenu = document.getElementById("movetomenu");
const closeButton = document.getElementById("close");
const moveButton = document.getElementById("moveperm");
const toinput = document.getElementById("toinput");

let currentScroll = 0;

let moveItem = -10;

ipcRenderer.on("savePath", (ev, args) => {
    savePath = args;
    console.log(savePath);
    shortcutsFile = path.join(savePath, "shortcuts.json");
    imagesPath = path.join(savePath, "images");
    orderPath = path.join(savePath, "order.json");
    // categoriesPath = path.join(savePath, "categories");

    saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
    settingsFile = JSON.parse(
        fs.readFileSync(path.join(savePath, "settings.json"), "utf-8")
    );

    orderFile = JSON.parse(fs.readFileSync(orderPath, "utf-8"));

    // if (!fs.existsSync(categoriesPath)) fs.mkdirSync(categoriesPath);

    // categories.push(...fs.readdirSync(categoriesPath));

    // for (let i = 0; i < categories.length; i++) {
    //     const cat = categories[i];
    //     const option = document.createElement("option");
    //     option.innerText = cat.replace(".json", "");
    //     option.value = cat;
    //     filterSelect.appendChild(option);
    // }

    steamGridTokenInput.value = settingsFile.steamGridToken;
    startWithPcCheckBox.checked = settingsFile.startWithPc;
    serverCheckBox.checked = settingsFile.enableServer;
    serverPortInput.value = settingsFile.serverPort;
    serverPassInput.value = settingsFile.serverPassword;

    makeAppGrid(orderFile);

    if (!fs.existsSync(imagesPath)) {
        fs.mkdirSync(imagesPath);
    }
});

if (shortcutsFile === "") {
    ipcRenderer.send("getSavePath");
}

function makeAppGrid(entries) {
    currentScroll = appGrid.scrollTop;
    appGrid.innerHTML = "";
    for (let i = 0; i < entries.length; i++) {
        const key = entries[i];

        addItemToGrid(key, i);
    }
    appGrid.scrollTop = currentScroll;
}

function updateSaveFile() {
    saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
    orderFile = JSON.parse(fs.readFileSync(orderPath, "utf-8"));
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
        };
    } else {
        saveFile[fileName] = {
            type: type,
            location: `${location}`,
            args: `${args}`,
            gridName: fileName,
        };
    }
    // if (activeCategory !== "All") {
    //     if (!categoryEntries.includes(fileName)) categoryEntries.push(fileName);
    //     saveFile[fileName].category = [activeCategory]
    // }
    if (!orderFile.includes(fileName)) orderFile.push(fileName);
}

function saveTheFile() {
    // progressHolder.innerText = "";
    fs.writeFileSync(shortcutsFile, JSON.stringify(saveFile));
    fs.writeFileSync(orderPath, JSON.stringify(orderFile));
    // if (activeCategory !== "All") {
    //     fs.writeFileSync(
    //         path.join(categoriesPath, activeCategory),
    //         JSON.stringify(categoryEntries)
    //     );
    // }
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
    const background = document.createElement("div");
    const appImg = document.createElement("img");
    const appName = document.createElement("p");
    const optionsButton = document.createElement("button");
    const bottomHolder = document.createElement("div");

    appDiv.className = "app-div";

    background.className = "app-bg";

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

    appDiv.appendChild(background);
    appDiv.appendChild(appImg);
    appDiv.appendChild(bottomHolder);

    appGrid.appendChild(appDiv);
}

// filterSelect.oninput = () => {
//     filterGrid(filterSelect.options[filterSelect.selectedIndex].value);
// };

// function filterGrid(cat) {
//     activeCategory = cat;
//     if (cat === "All") {
//         makeAppGrid(orderFile);
//         categoryEntries = [];
//     } else {
//         categoryEntries = JSON.parse(
//             fs.readFileSync(path.join(categoriesPath, cat), "utf-8")
//         );
//         for (let i = 0; i < categoryEntries.length; i++) {
//             const entry = categoryEntries[i];
//             if(!orderFile.includes(entry))
//                 categoryEntries.splice(i, 1);
//         }
//         makeAppGrid(categoryEntries);
//     }
// }

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
