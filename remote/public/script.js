const appGrid = document.getElementById("appgrid");
const searchForm = document.getElementById("searchForm");
const searchBar = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");

/**
 * @type {{[appName: string]: {gridName: string}}}
 */
let games = {};

window.onload = async () => {
    const res = await fetch("/grid/games", {
        credentials: "same-origin",
        headers: {
            "Content-Type": "Application/json",
        },
    });

    const body = await res.json();
    games = body;

    makeAppGrid(body);
};

function makeAppGrid(entries) {
    appGrid.innerHTML = "";
    for (let i = 0; i < Object.keys(entries).length; i++) {
        const key = Object.keys(entries)[i];

        addItemToGrid({ key, gridName: entries[key].gridName });
    }
}

/**
 *
 * @param {{key: string, gridName: string}} game
 */
function addItemToGrid(game) {
    const appDiv = document.createElement("div");
    const background = document.createElement("div");
    const appImg = document.createElement("img");
    const appName = document.createElement("p");
    // const optionsButton = document.createElement("button");s
    const bottomHolder = document.createElement("div");

    appDiv.className = "app-div";

    background.className = "app-bg";

    appImg.className = "app-img";
    let imagePath = `/grid/image/${game.key}`;
    appImg.src = imagePath;
    appImg.setAttribute("draggable", false);
    appImg.loading = "lazy"

    appDiv.onclick = () => {
        // console.log(`running game ${game}`);

        fetch(`/launch/${game.key}`, {
            credentials: "same-origin",
            headers: {
                "Content-Type": "Application/json",
            },
        });
    };

    appName.innerText = game.gridName;

    appName.onpointerenter = (event) => {
        tooltip.textContent = appName.innerText;
        tooltip.style.left = event.clientX + "px";
        tooltip.style.top = event.clientY - 50 + "px";
        tooltip.style.display = "block";
    };

    appName.onpointerleave = () => {
        tooltip.style.display = "none";
    };

    // optionsButton.className = "fa-solid fa-ellipsis";

    bottomHolder.appendChild(appName);
    // bottomHolder.appendChild(optionsButton);
    bottomHolder.className = "bottom-holder";

    appDiv.appendChild(background);
    appDiv.appendChild(appImg);
    appDiv.appendChild(bottomHolder);

    appGrid.appendChild(appDiv);
}

let gridColumnCount = 0;

window.onresize = () => {
    computeGridSize();
};

function computeGridSize() {
    const gridComputedStyle = window.getComputedStyle(appGrid);

    // get number of grid columns
    gridColumnCount = gridComputedStyle
        .getPropertyValue("grid-template-columns")
        .split(" ").length;
}

computeGridSize();

searchForm.onsubmit = (ev) => {
    ev.preventDefault();
    if (searchBar.value !== "") search(searchBar.value);
    else makeAppGrid(games);
};

searchBar.oninput = () => {
    if (searchBar.value !== "") search(searchBar.value);
    else makeAppGrid(games);
};

clearSearch.onclick = () => {
    searchBar.value = "";
    makeAppGrid(games);
};

function search(query) {
    appGrid.innerHTML = "";
    for (let i = 0; i < Object.keys(games).length; i++) {
        const key = Object.keys(games)[i];

        if (
            key.toLowerCase().includes(query.toLowerCase()) ||
            games[key].gridName.toLowerCase().includes(query.toLowerCase())
        ) {
            addItemToGrid({ key, gridName: games[key].gridName });
        }
    }
}
