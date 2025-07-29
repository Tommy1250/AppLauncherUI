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
const appIdHolder = document.getElementById("appId");

const toggleShell = document.getElementById("toggleShell");

/**
 * @type {HTMLSelectElement}
 */
const appTypeSelect = document.getElementById("appType");

const cancelButton = document.getElementById("cancel");
const saveButton = document.getElementById("save");

const selectFileButton = document.getElementById("selectFile");

let shortcutsFile = "";
let savePath = "";
let imagesPath = "";
/**
 * @type {{[appName: string]: {type: "url" | "exe" | "dir", location: string, args?: string, gridName: string, shellMode?: boolean}}}
 */
let saveFile = {};

let appName = "";

let imageUpdated = false;
let newImagePath = "";
let hasImage = false;
let shellMode = false;

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
    appNameInput.value = saveFile[appName].gridName;
    appPathInput.value = saveFile[appName].location;

    if (fs.existsSync(path.join(imagesPath, `${appName}.png`))) {
        appImg.src = path.join(imagesPath, `${appName}.png`);
        hasImage = true;
    }

    switch (saveFile[appName].type) {
        case "exe":
            argsDiv.style.display = "grid";
            appArgsInput.value = saveFile[appName].args ?? "";
            appTypeSelect.selectedIndex = 0;
            if(saveFile[appName].shellMode){
                toggleShell.classList.remove("inactive");
                shellMode = true;
            }

            if (!hasImage) appImg.src = path.join(__dirname, `missing.png`);
            break;
        case "url":
            argsDiv.style.display = "none";
            appTypeSelect.selectedIndex = 1;
            if (!hasImage) appImg.src = path.join(__dirname, `missing.png`);
            break;
        case "dir":
            argsDiv.style.display = "none";
            appTypeSelect.selectedIndex = 2;
            if (!hasImage) appImg.src = path.join(__dirname, `missingdir.png`);
            break;
    }
});

if (shortcutsFile === "") {
    ipcRenderer.send("getSavePath");
}

if (appName === "") {
    ipcRenderer.send("appName");
}

appTypeSelect.oninput = () => {
    if (appTypeSelect.selectedIndex === 0) {
        argsDiv.style.display = "grid";
    } else {
        argsDiv.style.display = "none";
    }

    if (!hasImage)
        if (appTypeSelect[appTypeSelect.selectedIndex].value === "dir")
            appImg.src = "./missingdir.png";
        else appImg.src = "./missing.png";
};

toggleShell.onclick = () => {
    if(shellMode) {
        shellMode = false;
        toggleShell.classList.add("inactive");
    }else{
        ipcRenderer.send("showShellMsg");
        shellMode = true;
        toggleShell.classList.remove("inactive");
    }
}

saveButton.onclick = () => {
    saveFile[appName].type = appTypeSelect[appTypeSelect.selectedIndex].value;
    saveFile[appName].location = appPathInput.value;
    saveFile[appName].gridName = appNameInput.value;

    if (appArgsInput.value !== "") {
        saveFile[appName].args = appArgsInput.value;
    } else {
        delete saveFile[appName].args;
    }

    if(shellMode) {
        saveFile[appName].shellMode = shellMode;
    } else {
        delete saveFile[appName].shellMode;
    }

    fs.writeFileSync(shortcutsFile, JSON.stringify(saveFile, null, 4));

    if (imageUpdated) {
        fs.copyFileSync(newImagePath, path.join(imagesPath, `${appName}.png`));
    }

    ipcRenderer.send("closeAndSave");
};

selectFileButton.onclick = () => {
    if (appTypeSelect[appTypeSelect.selectedIndex].value !== "dir")
        ipcRenderer.send("chooseExecFile");
    else ipcRenderer.send("cooseDirectory");
};

ipcRenderer.on("execSelect", (ev, fileLocation) => {
    appPathInput.value = fileLocation;
});

ipcRenderer.on("dirSelect", (ev, dirLocation) => {
    appPathInput.value = dirLocation;
    if (appNameInput.value.length == 0)
        appNameInput.value = path.basename(dirLocation);
});

cancelButton.onclick = () => {
    window.close();
};

imageSelectButton.onclick = () => {
    ipcRenderer.send("chooseImage");
};

ipcRenderer.on("imageSelect", (ev, fileLocation) => {
    appImg.src = fileLocation;
    imageUpdated = true;
    newImagePath = fileLocation;
});

imageSearchButton.onclick = () => {
    shell.openExternal(
        `https://www.steamgriddb.com/search/grids?term=${encodeURIComponent(
            saveFile[appName].gridName
        )}`
    );
};
