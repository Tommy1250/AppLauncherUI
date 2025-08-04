const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { generateId } = require("./functions/appAddUtil")

const appGrid = document.getElementById("appgrid");
const searchForm = document.getElementById("searchForm");
const searchBar = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");
const submitSearch = document.getElementById("submitSearch");

const infoMessage = document.getElementById("infoMessage");
const messageHolder = document.getElementById("message");
const closeMessage = document.getElementById("closeMessage");

let savePath = "";
let tempPath = "";

/**
 * @type {{startWithPc: boolean, steamGridToken: string, enableServer: boolean, serverPort: number, serverPassword: string}}
 */
let settingsFile = {};

let returnSource = "";

ipcRenderer.on("savePath", (ev, args) => {
    savePath = args;
    tempPath = path.join(savePath, "temp");

    settingsFile = JSON.parse(
        fs.readFileSync(path.join(savePath, "settings.json"), "utf-8")
    );

    if (!fs.existsSync(tempPath))
        fs.mkdirSync(tempPath);

    if (!settingsFile.steamGridToken || settingsFile.steamGridToken === "") {
        searchBar.setAttribute("disabled", true);
        clearSearch.setAttribute("disabled", true);
        submitSearch.setAttribute("disabled", true);

        messageHolder.innerHTML = "";
        const messageText = document.createElement("h2");
        messageText.innerText = "Please put a SteamGridDB token in the app settings first.\n1. Press on the settings icon (the little gear on the top right).\n2. Click the \"Sign up for a token\" button in the \"App Icons\" section.\n3. login with steam on steam grid db.\n4. Copy the token and paste it in the \"Steam grid Token\" input field.";
        messageHolder.appendChild(messageText);
        infoMessage.showModal();
    }
});

if (savePath === "") {
    ipcRenderer.send("getSavePath");
}

searchForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const searchResults = await searchGame(searchBar.value, settingsFile.steamGridToken);

    if (
        !searchResults.data ||
        !searchResults.success ||
        !searchResults.data[0]
    ) {
        messageHolder.innerHTML = "";
        const messageText = document.createElement("h2");
        messageText.innerText = "Can't find any matches for the searched criteria.";
        messageHolder.appendChild(messageText);
        infoMessage.showModal();

        return appGrid.innerHTML = "";
    }

    const banners = await getBanners(searchResults.data[0].id, settingsFile.steamGridToken)

    if (!banners.success || banners.data.length === 0) {
        messageHolder.innerHTML = "";
        const messageText = document.createElement("h2");
        messageText.innerText = "Can't find banners for the searched criteria.";
        messageHolder.appendChild(messageText);
        infoMessage.showModal();

        return appGrid.innerHTML = "";
    }

    appGrid.innerHTML = "";
    for (let i = 0; i < banners.data.length; i++) {
        const gridBanner = banners.data[i];
        addItemToGrid(gridBanner.thumb, gridBanner.url)
    }
})

ipcRenderer.on("returnSource", (ev, args) => {
    returnSource = args.source;
    if (args.query) {
        searchBar.value = args.query;
        submitSearch.click();
    }
})


if (returnSource === "") {
    ipcRenderer.send("returnSource");
}

async function searchGame(gameName, token) {
    if (!token || token === "")
        return null;
    const options = {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };

    try {
        const result = await fetch(
            `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(
                gameName
            )}`,
            options
        );

        const body = await result.json();

        return body;
    } catch (error) {
        return {
            success: false
        }
    }
}

async function getBanners(gameId, token) {
    const options = {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        },
    };

    try {
        const result = await fetch(
            `https://www.steamgriddb.com/api/v2/grids/game/${gameId}?types=static&dimensions=600x900&nsfw=false&limit=15`,
            options
        );
        const body = await result.json();
        return body;
    } catch (error) {
        return {
            success: false
        }
    }
}

/**
 *
 * @param {string} imageLink
 * @param {string} thumbnail 
 */
function addItemToGrid(thumbnail, imageLink) {
    const appDiv = document.createElement("div");
    const appImg = document.createElement("img");

    appImg.className = "app-img";

    appImg.src = thumbnail;
    appImg.setAttribute("draggable", false);

    appImg.onclick = () => {
        downloadImage(imageLink);
    };

    appDiv.appendChild(appImg);
    appGrid.appendChild(appDiv);
}

/**
 * 
 * @param {string} imageLink 
 */
function downloadImage(imageLink) {
    messageHolder.innerHTML = "";
    const messageText = document.createElement("h2");
    messageText.innerText = "Downloading...";
    messageHolder.appendChild(messageText);
    infoMessage.showModal();

    const imageId = generateId(10);

    const file = fs.createWriteStream(path.join(tempPath, `${imageId}.png`));
    https.get(
        imageLink,
        function (response) {
            response.pipe(file);

            // after download completed close filestream
            file.on("finish", () => {
                file.close();
                ipcRenderer.send("updateImageInWindow", {
                    imagePath: path.join(tempPath, `${imageId}.png`),
                    source: returnSource
                });
                window.close();
            });
        }
    );
}

clearSearch.onclick = () => {
    searchBar.value = "";
}

closeMessage.onclick = () => {
    infoMessage.close();
}