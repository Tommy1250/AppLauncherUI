const { ipcRenderer } = require("electron");
const fs = require("fs");
const https =  require("https");

async function downloadImage(imageUrl, shortcutName, savePath){
    const file = fs.createWriteStream(path.join(savePath, `${shortcutName}.png`));
    https.get(
        imageUrl,
        function (response) {
            response.pipe(file);

            // after download completed close filestream
            file.on("finish", () => {
                file.close();
                ipcRenderer.send("refresh");
            });
        }
    );
}

module.exports = downloadImage;