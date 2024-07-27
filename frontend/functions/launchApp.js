const { spawn } = require("child_process");
const parseArgsStringToArgv = require("./parseArgs");
const {shell} = require("electron");
const path = require("path");

/**
 * 
 * @param {{type: "url" | "exe", location: string, args?: string}} appConfig 
 */
function launchApp(appConfig) {
    console.log(appConfig)
    if (appConfig.type === "url") {
        shell.openExternal(appConfig.location);
    } else if (appConfig.type === "exe") {
        if (appConfig.args) {
            const child = spawn(
                `${appConfig.location}`,
                parseArgsStringToArgv(appConfig.args),
                {
                    detached: true,
                    stdio: "ignore",
                    cwd: `${path.parse(appConfig.location).dir}`,
                }
            );
    
            child.unref();
        } else {
            const child = spawn(`${appConfig.location}`, {
                detached: true,
                stdio: "ignore",
                cwd: `${path.parse(appConfig.location).dir}`
            });
    
            child.unref();
        }
    }
}


module.exports = launchApp