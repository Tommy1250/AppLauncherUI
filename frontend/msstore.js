const { ipcRenderer } = require("electron");
const WinReg = require("winreg");

const appsGrid = document.getElementById("apps");
const loadingThing = document.getElementById("loading");

// Define the registry key where Microsoft Store apps are listed
const regKey = new WinReg({
    hive: WinReg.HKCU,
    key: "\\Software\\Classes",
});

// Object to hold the data to be written to the file
const writeableFile = {};

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

        loadingThing.innerText = "";
        for (let i = 0; i < Object.keys(writeableFile).length; i++) {
            const appKey = Object.keys(writeableFile)[i]
            const appValue = writeableFile[appKey];

            const appContainer = document.createElement("div");
            const appButton = document.createElement("button");
            appButton.innerText = appKey;

            appButton.onclick = () => {
                ipcRenderer.send("msappselect", appValue);
            };

            appContainer.appendChild(appButton)
            appsGrid.appendChild(appContainer);
        }
    } catch (err) {
        console.error("Error reading registry:", err);
    }
}

// Call the function to list apps
listInstalledApps();
