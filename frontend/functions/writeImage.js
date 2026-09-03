const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

async function downloadImage(imageUrl, shortcutName, savePath){
    const response = await fetch(imageUrl);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const fileStream = fs.createWriteStream(path.join(savePath, `${shortcutName}.png`));

    for await (const chunk of response.body) {
        fileStream.write(chunk);
    }

    fileStream.end();
    ipcRenderer.send("updateSaveNoClose");

    console.log("Download complete");
    return shortcutName
}

module.exports = downloadImage;