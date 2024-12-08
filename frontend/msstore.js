const { ipcRenderer } = require("electron");
const WinReg = require("winreg");

const fs = require("fs");
const path = require("path");

const appsGrid = document.getElementById("apps");
const loadingThing = document.getElementById("loading");
const refreshBtn = document.getElementById("refreshBtn");
const searchbar = document.getElementById("searchbar");

let savePath = "";
let cachePath = "";

// Define the registry key where Microsoft Store apps are listed
const regKey = new WinReg({
    hive: WinReg.HKCU,
    key: "\\Software\\Classes",
});

// Object to hold the data to be written to the file
let writeableFile = {};

/**
 * @type {{string: string}}
 */
let cacheFile = {};

// Utility function to promisify WinReg methods
function getRegistryKeys(key) {
    return new Promise((resolve, reject) => {
        key.keys((err, items) => {
            if (err) reject(err);
            else resolve(items);
        });
    });
}

function getRegistryValue(key, valueName) {
    return new Promise((resolve, reject) => {
        key.get(valueName, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

// Main function to list installed apps and write to file
async function listInstalledApps() {
    try {
        const items = await getRegistryKeys(regKey);
        const onlyAppx = items.filter((item) =>
            item.key.split("\\").at(-1).startsWith("AppX")
        );

        for (const app of onlyAppx) {
            try {
                const results = await getRegistryKeys(app);
                const applicationKeys = results.filter(
                    (key) => key.key.split("\\").at(-1) === "Application"
                );

                for (const result of applicationKeys) {
                    try {
                        const appName = await getRegistryValue(
                            result,
                            "ApplicationName"
                        );
                        const appLaunchId = await getRegistryValue(
                            result,
                            "AppUserModelID"
                        );

                        writeableFile[appName.value] = appLaunchId.value;
                    } catch (err) {
                        console.error("Error fetching app details:", err);
                    }
                }
            } catch (err) {
                console.error("Error fetching application keys:", err);
            }
        }

        cacheFile = { ...writeableFile };
        fs.writeFileSync(cachePath, JSON.stringify(cacheFile));
        makeGrid();
    } catch (err) {
        console.error("Error reading registry:", err);
    }
}

function makeGrid() {
    loadingThing.innerText = "";
    for (let i = 0; i < Object.keys(cacheFile).length; i++) {
        const appKey = Object.keys(cacheFile)[i];
        const appValue = cacheFile[appKey];

        const appContainer = document.createElement("div");
        const appButton = document.createElement("button");
        appButton.innerText = appKey;

        appButton.onclick = () => {
            ipcRenderer.send("msappselect", appValue);
        };

        const appDivider = document.createElement("hr");

        appContainer.appendChild(appDivider);
        appContainer.appendChild(appButton);
        appsGrid.appendChild(appContainer);
    }
}

function filterGrid(query) {
    appsGrid.innerHTML = "";
    if(query === "")
        return makeGrid()
    for (let i = 0; i < Object.keys(cacheFile).length; i++) {
        const appKey = Object.keys(cacheFile)[i];
        const appValue = cacheFile[appKey];
        if (
            appKey.toLowerCase().includes(query.toLowerCase()) ||
            appValue.toLowerCase().includes(query.toLowerCase())
        ) {
            const appContainer = document.createElement("div");
            const appButton = document.createElement("button");
            appButton.innerText = appKey;

            appButton.onclick = () => {
                ipcRenderer.send("msappselect", appValue);
            };

            const appDivider = document.createElement("hr");

            appContainer.appendChild(appDivider);
            appContainer.appendChild(appButton);
            appsGrid.appendChild(appContainer);
        }
    }
}

searchbar.oninput = () => {
    filterGrid(searchbar.value);
};

ipcRenderer.on("savePath", (ev, args) => {
    savePath = args;
    cachePath = path.join(savePath, "mscache.json");

    if (fs.existsSync(cachePath)) {
        cacheFile = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
        makeGrid();
    } else listInstalledApps();
});

if (savePath === "") {
    ipcRenderer.send("getSavePath");
}

refreshBtn.onclick = () => {
    appsGrid.innerHTML = "";
    loadingThing.innerText = "Loading installed apps...";
    writeableFile = {};
    cacheFile = {};
    listInstalledApps();
};
