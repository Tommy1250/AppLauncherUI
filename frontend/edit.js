const { ipcRenderer, shell } = require("electron");
const fs = require("fs");
const path = require("path");

const appImg = document.getElementById("appImg");
const imageSearchButton = document.getElementById("imageSearch");
const imageSelectButton = document.getElementById("imageSelect");

const argsDiv = document.getElementById("argsDiv");

const appNameInput = document.getElementById("appName");
const appPathInput = document.getElementById("appPath");
const appArgsInput = document.getElementById("appArgs");
const appIdHolder = document.getElementById("appId")
/**
 * @type {HTMLSelectElement}
 */
const appTypeSelect = document.getElementById("appType");

const cancelButton = document.getElementById("cancel");
const saveButton = document.getElementById("save");

let shortcutsFile = "";
let savePath = "";
let imagesPath = "";
/**
 * @type {{[appName: string]: {type: "url" | "exe", location: string, args?: string, gridName: string}}}
 */
let saveFile = {};

let appName = "";

let imageUpdated = false;
let newImagePath = "";

ipcRenderer.on("savePath", (ev, args) => {
    savePath = args;
    console.log(savePath);
    shortcutsFile = path.join(savePath, "shortcuts.json");
    imagesPath = path.join(savePath, "images");
    saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
});

ipcRenderer.on("appname", (ev, args) => {
    appName = args;
    appIdHolder.innerText = `Id: ${appName}`;
    appImg.src = fs.existsSync(path.join(imagesPath, `${appName}.png`)) ? path.join(imagesPath, `${appName}.png`) : path.join(__dirname, `missing.png`);
    appNameInput.value = saveFile[appName].gridName;
    appPathInput.value = saveFile[appName].location;
    if(saveFile[appName].type === "exe"){
        argsDiv.style.display = "grid";
        appArgsInput.value = saveFile[appName].args ?? "";
        appTypeSelect.selectedIndex = 0;
    } else {
        argsDiv.style.display = "none";
        appTypeSelect.selectedIndex = 1;
    }
})

if (shortcutsFile === "") {
    ipcRenderer.send("getSavePath");
}

if (appName === "") {
    ipcRenderer.send("appName");
}

appTypeSelect.oninput = () => {
    if(appTypeSelect.selectedIndex === 0){
        argsDiv.style.display = "grid";
    } else {
        argsDiv.style.display = "none";
    }
}

saveButton.onclick = () => {
    if(appArgsInput.value !== ""){
        saveFile[appName] = {
            "type": appTypeSelect[appTypeSelect.selectedIndex].value,
            "location": appPathInput.value,
            "args": appArgsInput.value,
            "gridName": appNameInput.value
        }
    } else {
        saveFile[appName] = {
            "type": appTypeSelect[appTypeSelect.selectedIndex].value,
            "location": appPathInput.value,
            "gridName": appNameInput.value
        }
    }
    
    fs.writeFileSync(shortcutsFile, JSON.stringify(saveFile, null, 4));

    if(imageUpdated) {
        fs.copyFileSync(newImagePath, path.join(imagesPath, `${appName}.png`));
    }

    ipcRenderer.send("closeAndSave")
}

cancelButton.onclick = () => {
    window.close();
}

imageSelectButton.onclick = () => {
    ipcRenderer.send("chooseImage");
}

ipcRenderer.on("imageSelect", (ev, fileLocation) => {
    appImg.src = fileLocation;
    imageUpdated = true;
    newImagePath = fileLocation;
})

imageSearchButton.onclick = () => {
    shell.openExternal(`https://www.steamgriddb.com/search/grids?term=${encodeURIComponent(saveFile[appName].gridName)}`)
}