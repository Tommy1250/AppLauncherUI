const { ipcRenderer, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const { generateId } = require("./functions/appAddUtil");

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

const msStoreButton = document.getElementById("msStore");
const cancelButton = document.getElementById("cancel");
const saveButton = document.getElementById("save");

const genRandomIdButton = document.getElementById("genRandomId");
const selectFileButton = document.getElementById("selectFile");

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

ipcRenderer.on("inputdata", (ev, args) => {
    appPathInput.value = args.path;
    appArgsInput.value = args.args;
    appIdInput.value = args.id;
})

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

genRandomIdButton.onclick = () => {
    if (appIdInput.value.startsWith("ms"))
        appIdInput.value = `ms-${generateId(25)}`
    else
        appIdInput.value = `app-${generateId(25)}`
}

selectFileButton.onclick = () => {
    ipcRenderer.send("chooseExecFile");
}

ipcRenderer.on("execSelect", (ev, fileLocation) => {
    appPathInput.value = fileLocation
})

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

if(process.platform !== "win32"){
    msStoreButton.style.display = "none"
}

msStoreButton.onclick = () => {
    ipcRenderer.send("msStoreWindow")
}