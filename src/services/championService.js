const championRepository = require("../data/championRepository");

let champions;

async function loadChampions() {
	champions = await championRepository.readChampions();
	return champions;
}

function getChampions() {
	if (!champions) {
		throw new Error("Champions not loaded. Please call loadChampions() first.");
	}
	return champions;
}

async function reloadChampions() {
	return await loadChampions();
}

module.exports = {
	loadChampions,
	getChampions,
	reloadChampions,
};
