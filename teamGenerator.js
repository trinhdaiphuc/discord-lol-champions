const { readConfig } = require("./configManager");

async function generateTeams() {
	const config = await readConfig();
	const usedChampions = {
		Fighter: new Set(),
		Mage: new Set(),
		Tank: new Set(),
		Marksman: new Set(),
		Assassin: new Set(),
		Support: new Set(),
	};
	const globalUsedChampions = new Set();

	let blueTeam = [];
	let redTeam = [];

	const selectFromRole = (roleChampions, team, roleName) => {
		const available = roleChampions.filter(
			(champ) => !usedChampions[roleName].has(champ) && !globalUsedChampions.has(champ),
		);
		if (available.length < 3) {
			usedChampions[roleName].clear();
			return selectFromRole(roleChampions, team, roleName);
		}

		const shuffled = [...available].sort(() => 0.5 - Math.random());
		const selected = shuffled.slice(0, 3);
		selected.forEach((champ) => {
			usedChampions[roleName].add(champ);
			globalUsedChampions.add(champ);
			team.push(champ);
		});
	};

	Object.keys(config.CHAMPION_ROLES).forEach((role) => {
		selectFromRole(config.CHAMPION_ROLES[role], blueTeam, role);
	});

	Object.keys(config.CHAMPION_ROLES).forEach((role) => {
		selectFromRole(config.CHAMPION_ROLES[role], redTeam, role);
	});

	return { blueTeam, redTeam };
}

const verifyUniqueTeams = (teamA, teamB) => {
	const setA = new Set(teamA);
	for (const champ of teamB) {
		if (setA.has(champ)) {
			return false;
		}
	}
	return true;
};

module.exports = { generateTeams, verifyUniqueTeams };
