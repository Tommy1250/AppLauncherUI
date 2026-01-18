const lettersAndNumbers = 'kxDGe1lZvSHhXcY9BtPwmTqRigoWEp6fLy8N7zAb3aCdJ5Q42uVIFKMUOsjnr'

const crypto = require("crypto");
const fs = require("fs");
const getWindowsShortcutProperties = require("get-windows-shortcut-properties");

function generateId(length){
    const charsetLength = lettersAndNumbers.length;

    // Create a typed array to hold random values
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
     
    // Map random values to the charset
    return Array.from(randomValues, (value) => lettersAndNumbers[value % charsetLength]).join('');
}


/**
 * 
 * @param {string} fileName 
 */
async function readShortcut(fileName, shortcutPath) {
    if (fileName.endsWith(".url")) {
        console.log("urlFile");
        const fileData = fs.readFileSync(shortcutPath, "utf-8");
        const parsed = fileData.split("\n");
        const itemObj = {};

        for (let j = 0; j < parsed.length; j++) {
            const ele = parsed[j];
            const item = ele.replace("=", "▓").replace("\r", "").split("▓");
            itemObj[item[0]] = item[1];
        }

        let fileNameArr = fileName.split(".");
        fileNameArr.pop();

        return {
            id: fileNameArr.join("."),
            location: itemObj.URL,
            type: "url",
            args: null
        }
    } else if (fileName.endsWith(".lnk")) {
        console.log("realSortcut");
        const shortcutData =
            getWindowsShortcutProperties.sync(shortcutPath)[0];

        let fileNameArr = fileName.split(".");
        fileNameArr.pop();

        return {
            id: fileNameArr.join("."),
            location: shortcutData.TargetPath,
            type: "exe",
            args: shortcutData.Arguments ? shortcutData.Arguments : null
        }
    } else if (fileName.endsWith(".exe")) {
        console.log("exe file");

        let fileNameArr = fileName.split(".");
        fileNameArr.pop();

        return {
            id: fileNameArr.join("."),
            location: file.path,
            type: "exe",
            args: null
        }
    }
}

module.exports = {generateId, readShortcut}