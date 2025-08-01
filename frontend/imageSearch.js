const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

const appGrid = document.getElementById("appgrid");
const searchForm = document.getElementById("searchForm");
const searchBar = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");
const submitSearch = document.getElementById("submitSearch");

let savePath = "";
let imagesPath = "";

/**
 * @type {{startWithPc: boolean, steamGridToken: string, enableServer: boolean, serverPort: number, serverPassword: string}}
 */
let settingsFile = {};

let returnSource = "";

ipcRenderer.on("savePath", (ev, args) => {
    savePath = args;
    imagesPath = path.join(savePath, "images");
    settingsFile = JSON.parse(
        fs.readFileSync(path.join(savePath, "settings.json"), "utf-8")
    );

    if (!settingsFile.steamGridToken || settingsFile.steamGridToken === "") {
        searchBar.setAttribute("disabled", true);
        clearSearch.setAttribute("disabled", true);
        submitSearch.setAttribute("disabled", true);
        
        const br = document.createElement("br");
        const warningText = document.createElement("h1");
        warningText.innerText = "Please put a SteamGridDB token in the app settings first.\n1. Press on the settings icon (the little gear on the top right)\n2. Click the \"Sign up for a token\" button in the \"App Icons\" section\n3. login with steam on steam grid db\n4. Copy the token and paste it in the \"Steam grid Token\" input field"
        
        document.querySelector(".search-div").appendChild(br);
        document.querySelector(".search-div").appendChild(warningText);
    }
});

ipcRenderer.on("returnSource", (ev, args) => {
    returnSource = args;
})

if (savePath === "") {
    ipcRenderer.send("getSavePath");
}

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

    const result = await fetch(
        `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(
            gameName
        )}`,
        options
    );

    const body = await result.json();

    return body;
}

async function getBanner(gameName, savePath, token) {
    if (!token || token === "")
        return `${gameName}.png`;
    let searchResults;
    searchResults = await searchGame(gameName, token);
    if (
        !searchResults.data ||
        !searchResults.success ||
        !searchResults.data[0]
    ) {
        return `${gameName}.png`;
    }

    const gameData = searchResults.data[0];

    const options = {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        },
    };

    const result = await fetch(
        `https://www.steamgriddb.com/api/v2/grids/game/${gameData.id}?types=static&dimensions=600x900&nsfw=false&limit=1`,
        options
    );
    const body = await result.json();
    if (!body.success || body.data.length === 0) {
        ipcRenderer.send("updateSaveNoClose");
        return `${gameName}.png`;
    }
    const imageUrl = body.data[0].url;

    await downloadImage(imageUrl, gameName, savePath);
    return `${gameName}.png`;
}

searchForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
})