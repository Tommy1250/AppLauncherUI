const parser = require("steam-acf-parser");
const fs = require('fs');
const path = require("path");


/**
 * 
 * @param {string[]} cachedArray 
 * @param {string[]} filesArray 
 */
function isFilesChanged(cachedArray, filesArray) {
    for (let i = 0; i < filesArray.length; i++) {
        const fileName = filesArray[i];
        if (!cachedArray.includes(fileName))
            return true;
    }

    return false;
}

/**
 * 
 * @param {string} fileLocation 
 * @returns {parser.AcfData}
 */
function readSteamFile(fileLocation) {
    //path.join(manifestFile.parentPath, manifestFile.name)
    const file = fs.readFileSync(fileLocation, 'utf8');
    return parser(file);
}

/**
 * 
 * @param {string[]} steamDirs 
 * @param {string} savesPath 
 */
function scanSteamFiles(steamDirs, savesPath) {
    if (steamDirs.length <= 0) return null;
    const steamGamesArray = [];
    const gameDataArray = [];
    for (let i = 0; i < steamDirs.length; i++) {
        const steamDir = steamDirs[i];

        const files = fs.readdirSync(steamDir, {
            withFileTypes: true
        })

        const acfFiles = files.filter(f => f.isFile() && f.name.endsWith(".acf"))

        const fileNamesArray = acfFiles.map(f => f.path);

        steamGamesArray.push(...fileNamesArray);
    }

    if (fs.existsSync(path.join(savesPath, "steamCached.json"))) {
        const cachedFiles = JSON.parse(fs.readFileSync(path.join(savesPath, "steamCached.json"), "utf-8"));
        if(!isFilesChanged(cachedFiles, steamGamesArray))
            return null;
    }

    for (let i = 0; i < steamGamesArray.length; i++) {
        const gameLocation = steamGamesArray[i];
        const gameData = readSteamFile(gameLocation);
        gameDataArray.push({
            id: `steam-${gameData.AppState.appid}`,
            name: gameData.AppState.name
        })
    }


    // if (fs.existsSync(path.join(__dirname, "previousFiles.json")))
    //     if (isFilesChanged())
    //         return console.log("No changes in the files aporting");

    // fs.writeFileSync(path.join(__dirname, "previousFiles.json"), JSON.stringify(fileNamesArray));

}

module.exports = { scanSteamFiles }