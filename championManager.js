const { loadChampions } = require('./championLoader');

let champions = loadChampions();

function getChampions() {
    return champions;
}

function reloadChampions() {
    champions = loadChampions();
}

module.exports = { getChampions, reloadChampions };
