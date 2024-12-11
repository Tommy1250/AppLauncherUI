const { ipcRenderer } = require("electron");
const downloadImage = require("./writeImage");

const itemsQueue = [];

async function searchGame(gameName, token) {
    if(!token || token === "") 
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
    if(!token || token === "")
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
        ipcRenderer.send("refresh");
        return `${gameName}.png`;
    }
    const imageUrl = body.data[0].url;

    await downloadImage(imageUrl, gameName, savePath);
    return `${gameName}.png`;
}

async function queueBanner(gameName, savePath, token) {
    if (!itemsQueue.includes(gameName)) itemsQueue.push(gameName);
    else return null;

    if (itemsQueue.length >= 1) {
        setTimeout(async () => {
            console.log("getting banner for " + gameName);
            try {
                const banner = await getBanner(gameName, savePath, token);
                if (banner) itemsQueue.shift();
            } catch {
                itemsQueue.shift();
                ipcRenderer.send("refresh");
            }
        }, 500);
    } else {
        console.log("getting banner for " + gameName);
        try {
            const banner = await getBanner(gameName, savePath, token);
            if (banner) itemsQueue.shift();
        } catch {
            itemsQueue.shift();
            ipcRenderer.send("refresh");
        }
    }
    return `${gameName}.png`;
}

module.exports = { queueBanner };
