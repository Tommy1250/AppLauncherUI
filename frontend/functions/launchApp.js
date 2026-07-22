const { spawn } = require("child_process");
const parseArgsStringToArgv = require("./parseArgs");
const { shell, dialog } = require("electron");
const path = require("path");

/**
 *
 * @param {{type: "url" | "exe" | "dir", location: string, args?: string, shellMode?: boolean}} appConfig
 */
function launchApp(appConfig, theWindow) {
    if (!appConfig) {
        return dialog.showErrorBox(
            "Shortcut doesn't exist",
            "This shortcut doesn't exist anymore if you want you can add it again anytime"
        );
    }

    if (appConfig.type === "url") {
        shell.openExternal(appConfig.location);
        if (theWindow) theWindow.close();
    } else if (appConfig.type === "exe") {
        const location = appConfig.location;
        const cwd = path.parse(location).dir;
        const args = appConfig.args
            ? parseArgsStringToArgv(appConfig.args)
            : [];

        const ext = path.extname(location).toLowerCase();

        let command = location;
        let spawnArgs = args;
        let options = {
            detached: true,
            stdio: "ignore",
            cwd
        };

        // .bat and .cmd files need to be executed through cmd.exe
        if (ext === ".bat" || ext === ".cmd") {
            command = process.env.ComSpec || "cmd.exe";
            spawnArgs = ["/c", location, ...args];
        }
        
        if (appConfig.shellMode) {
            options.shell = true;
        }

        const child = spawn(command, spawnArgs, options);

        child.unref();

        if (theWindow) {
            theWindow.close();
        }
    } else if (appConfig.type === "dir") {
        shell.openPath(appConfig.location);
    }
}

module.exports = launchApp;
