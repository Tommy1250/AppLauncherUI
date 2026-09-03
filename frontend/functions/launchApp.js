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

        let isError = false;

        const child = spawn(command, spawnArgs, options);

        child.once("error", (err) => {
            if (
                process.platform === "win32" &&
                !appConfig.shellMode &&
                (err.code === "EPERM" || err.code === "UNKNOWN" || err.code === "EACCES")
            ) {
                // Likely ERROR_ELEVATION_REQUIRED — exe's manifest demands admin.
                // Retry through UAC instead of failing outright.
                launchElevated(location, args, cwd);
            } else {
                isError = true;
                dialog.showErrorBox(
                    "Failed to launch",
                    `Could not start "${location}": ${err.message}`
                );
            }
        });

        child.unref();

        if (theWindow && !isError) {
            theWindow.close();
        }
    } else if (appConfig.type === "dir") {
        shell.openPath(appConfig.location);
    }
}

/**
 * Launches an exe elevated via UAC, without elevating the launcher itself.
 * @param {string} location
 * @param {string[]} args
 * @param {string} cwd
 */
function launchElevated(location, args, cwd) {
    const escape = (s) => s.replace(/'/g, "''");

    const argList = args.length
        ? `-ArgumentList @(${args.map((a) => `'${escape(a)}'`).join(",")}) `
        : "";

    const psCommand =
        `Start-Process -FilePath '${escape(location)}' ` +
        `-WorkingDirectory '${escape(cwd)}' ` +
        argList +
        `-Verb RunAs`;

    const elevated = spawn(
        "powershell.exe",
        ["-NoProfile", "-WindowStyle", "Hidden", "-Command", psCommand],
        { detached: true, stdio: "ignore", shell: true }
    );

    elevated.once("error", (err) => {
        dialog.showErrorBox(
            "Failed to launch as administrator",
            `Could not start "${location}" elevated: ${err.message}`
        );
    });

    elevated.unref();
}

module.exports = launchApp;
