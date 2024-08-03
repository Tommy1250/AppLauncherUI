const { spawn } = require("child_process");
const parseArgsStringToArgv = require("./parseArgs");
const {shell, dialog} = require("electron");
const path = require("path");

/**
 * 
 * @param {{type: "url" | "exe", location: string, args?: string}} appConfig 
 */
function launchApp(appConfig, theWindow) {
    if(!appConfig) {
        return dialog.showErrorBox("Shortcut doesn't exist", "This shortcut doesn't exist anymore if you want you can add it again anytime")
    }

    if (appConfig.type === "url") {
        shell.openExternal(appConfig.location);
        if(theWindow)
            theWindow.close();
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
            if(theWindow)
                theWindow.close();
        } else {
            const child = spawn(`${appConfig.location}`, {
                detached: true,
                stdio: "ignore",
                cwd: `${path.parse(appConfig.location).dir}`
            });
    
            child.unref();
            if(theWindow)
                theWindow.close();
        }
    }
}


module.exports = launchApp