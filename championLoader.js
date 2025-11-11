const fs = require("fs");

let champions;

function loadChampions() {
    try {
        champions = require('./champions.json');
    } catch (error) {
        console.error("Could not load champions.json. Please run the update script manually once.", error);
        // Create an empty champions.json file if it doesn't exist
        fs.writeFileSync('champions.json', JSON.stringify({}, null, 4));
        champions = {};
    }
    return champions;
}

module.exports = { loadChampions };
