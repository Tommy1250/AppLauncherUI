const { ipcRenderer } = require("electron");
const downloadImage = require("./writeImage");

const itemsQueue = [];

async function searchGame(gameName) {
    const options = {
        method: "GET",
        headers: {
            Authorization: "Bearer 35cf9783ab374a9db206fdc9d3c863f3",
        },
    };

    const result = await fetch(
        `https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(
            gameName
        )}`,
        options
    );
    const body = await result.json();
    console.log(body);

    return body.data[0];
}

async function getBanner(gameName, savePath) {
    const gameData = await searchGame(gameName);
    console.log(gameData);
    if(!gameData) {
        ipcRenderer.send("refresh");
        return `${gameName}.png`
    }
    const options = {
        method: "GET",
        headers: {
            "User-Agent": "Insomnia/2023.5.7",
            Authorization: "Bearer 35cf9783ab374a9db206fdc9d3c863f3",
        },
    };

    const result = await fetch(
        `https://www.steamgriddb.com/api/v2/grids/game/${gameData.id}`,
        options
    );
    const body = await result.json();
    if (!body.success || body.data.length === 0) {
        ipcRenderer.send("refresh");
        return `${gameName}.png`
    };
    const imageUrl = body.data[0].url;

    await downloadImage(imageUrl, gameName, savePath);
    return `${gameName}.png`;
}

async function queueBanner(gameName, savePath) {
    if (!itemsQueue.includes(gameName)) itemsQueue.push(gameName);
    else return null;

    if (itemsQueue.length === 1) {
        setTimeout(async () => {
            console.log("getting banner for " + gameName)
            const banner = await getBanner(gameName, savePath);
            if (banner) itemsQueue.shift();
        }, 400);
    } else {
        const banner = await getBanner(gameName, savePath);
        console.log("getting banner for " + gameName);
        if (banner) itemsQueue.shift();
    }
    return `${gameName}.png`;
}

module.exports = { queueBanner };
