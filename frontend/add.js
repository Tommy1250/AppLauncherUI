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
const appIdInput = document.getElementById("appId");

/**
 * @type {HTMLSelectElement}
 */
const appTypeSelect = document.getElementById("appType");

const cancelButton = document.getElementById("cancel");
const saveButton = document.getElementById("save");

let shortcutsFile = "";
let savePath = "";
let imagesPath = "";
let orderPath = "";
/**
 * @type {{appname: {type: "url" | "exe", location: string, args?: string, gridName: string}}}
 */
let saveFile = {};
/**
 * @type {string[]}
 */
let orderFile = [];

let imageUpdated = false;
let newImagePath = "";

ipcRenderer.on("savePath", (ev, args) => {
    savePath = args;
    console.log(savePath);
    shortcutsFile = path.join(savePath, "shortcuts.json");
    imagesPath = path.join(savePath, "images");
    orderPath = path.join(savePath, "order.json");
    saveFile = JSON.parse(fs.readFileSync(shortcutsFile, "utf-8"));
    orderFile = JSON.parse(fs.readFileSync(orderPath, "utf-8"));
});

if (shortcutsFile === "") {
    ipcRenderer.send("getSavePath");
}

appTypeSelect.oninput = () => {
    if(appTypeSelect.selectedIndex === 0){
        argsDiv.style.display = "grid";
    } else {
        argsDiv.style.display = "none";
    }
}

saveButton.onclick = () => {
    if(appIdInput.value === "This ID already exists please choose a different ID")
        return null;
    if(Object.keys(saveFile).includes(appIdInput.value))
        return appIdInput.value = "This ID already exists please choose a different ID";

    if(appArgsInput.value !== ""){
        saveFile[appIdInput.value] = {
            "type": appTypeSelect[appTypeSelect.selectedIndex].value,
            "location": appPathInput.value,
            "args": appArgsInput.value,
            "gridName": appNameInput.value
        }
    } else {
        saveFile[appIdInput.value] = {
            "type": appTypeSelect[appTypeSelect.selectedIndex].value,
            "location": appPathInput.value,
            "gridName": appNameInput.value
        }
    }
    orderFile.push(appIdInput.value);
    
    fs.writeFileSync(shortcutsFile, JSON.stringify(saveFile, null, 4));
    fs.writeFileSync(orderPath, JSON.stringify(orderFile));

    if(imageUpdated) {
        fs.copyFileSync(newImagePath, path.join(imagesPath, `${appIdInput.value}.png`));
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
    shell.openExternal(`https://www.steamgriddb.com/`)
}