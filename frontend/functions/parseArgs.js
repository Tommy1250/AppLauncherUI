function parseArgsStringToArgv(value) {
    const args = [];
    let currentArg = "";
    let inQuotes = false;
    let wasInQuotes = false;

    for (let i = 0; i < value.length; i++) {
        const char = value[i];

        if (char === " " && !inQuotes) {
            if (currentArg.length > 0 || wasInQuotes) {
                args.push(currentArg);
                currentArg = "";
                wasInQuotes = false;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            wasInQuotes = true;
            continue;
        }

        currentArg += char;
    }

    if (currentArg.length > 0 || wasInQuotes) {
        args.push(currentArg);
    }

    return args;
}

module.exports = parseArgsStringToArgv