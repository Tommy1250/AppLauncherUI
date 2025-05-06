const express = require("express");
const app = express();

const { settingsFile, imagesPath, orderPath, shortcutsPath, addToLatestAndLaunch } = require("..");
const fs = require("fs");
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.text());

app.get("/", (req, res) => {
    if(!req.headers.cookie)
        return res.redirect("/login")
    const passcode = readCookie(req.headers.cookie);
    if(passcode !== settingsFile.serverPassword)
        return res.redirect("/login");

    res.sendFile(path.join(__dirname, "views", "index.html"));
})

app.get("/login", (req, res) => {
    if(!req.headers.cookie)
        return res.sendFile(path.join(__dirname, "views", "login.html"));

    const passcode = readCookie(req.headers.cookie);
    if(passcode === settingsFile.serverPassword)
        return res.redirect("/");
    
    res.sendFile(path.join(__dirname, "views", "login.html"))
})

function makeTheSendPackage(){
    const orderFile = JSON.parse(fs.readFileSync(orderPath, "utf-8"));
    const saveFile = JSON.parse(fs.readFileSync(shortcutsPath, "utf-8"));

    /**
     * @type {{[appName: string]: {gridName: string}}}
    */
   let sendPackage = {};
   for (let i = 0; i < orderFile.length; i++) {
       const gameName = orderFile[i];
       const gameInfo = saveFile[gameName];
       
       sendPackage[gameName] = {
           gridName: gameInfo.gridName
        }
    }
    
    return sendPackage
}

/**
 * 
 * @param {string} cookies 
 * @returns 
 */
function readCookie(cookies) {
    let name = "passcode=";
    let ca = cookies.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function authUser(req, res, next) {
    if(!req.headers.cookie)
        return res.status(403).send({msg: "UnAuthenticated"})
    const passcode = readCookie(req.headers.cookie);
    if(passcode !== settingsFile.serverPassword)
        return res.status(403).send({msg: "UnAuthenticated"})
    next()
}

app.get("/grid/games", authUser, (req, res) => {
    res.send(makeTheSendPackage())
})

app.get("/grid/image/:gameId", authUser, (req, res) => {
    if(!req.params.gameId) return res.status(400).send({msg: "gameId not provided"})
    if(!fs.existsSync(path.join(imagesPath, `${req.params.gameId}.png`)))
        return res.sendFile(path.join(__dirname, "public", "missing.png"));
    
    res.sendFile(path.join(imagesPath, `${req.params.gameId}.png`))
})

app.get("/launch/:gameId", authUser, (req, res) => {
    if(!req.params.gameId) return res.status(400).send({msg: "gameId not provided"})
    addToLatestAndLaunch(req.params.gameId);
    res.send({msg: "Game Launched"});
})

app.post("/auth/login", (req, res) => {
    if (req.body === settingsFile.serverPassword) {
        res.status(202)
            .cookie("passcode", req.body, {
                maxAge: 2629800000,
            })
            .send({ msg: "Authorised" });
    } else {
        res.status(403).send({ msg: "Wrong password" });
    }
})

app.listen(settingsFile.serverPort, () => {
    console.log(`Listening on: ${settingsFile.serverPort}`)
})