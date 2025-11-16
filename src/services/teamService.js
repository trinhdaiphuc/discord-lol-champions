const { readConfig } = require("../core/config");
const championService = require("./championService");

const MIN_CHAMPIONS_REQUIRED = 36;

const cache = new Map();

function getUsedChampions(guildId) {
  return cache.get(guildId) || new Set();
}

function addUsedChampions(guildId, champions) {
  const usedChampions = getUsedChampions(guildId);
  for (const champion of champions) {
    usedChampions.add(champion);
  }
  cache.set(guildId, usedChampions);
}

function resetUsedChampions(guildId) {
  cache.delete(guildId);
}

async function generateTeams(guildId) {
	const config = await readConfig();
	const allChampions = Object.values(config.CHAMPION_ROLES).flat();
	let usedChampions = getUsedChampions(guildId);

	let availableChampions = allChampions.filter(
		(champ) => !usedChampions.has(champ),
	);

	if (availableChampions.length < MIN_CHAMPIONS_REQUIRED) {
		resetUsedChampions(guildId);
		usedChampions.clear();
		availableChampions = allChampions;
	}

	const availableChampionsByRole = {};
	for (const role in config.CHAMPION_ROLES) {
		availableChampionsByRole[role] = config.CHAMPION_ROLES[role].filter(
			(champ) => !usedChampions.has(champ),
		);
	}

	const selectedChampions = new Set();
	const blueTeam = [];
	const redTeam = [];

	const selectFromRole = (team, role) => {
		let pool = availableChampionsByRole[role].filter(
			(champ) => !selectedChampions.has(champ),
		);

		if (pool.length < 3) {
			const oldChampionsForRole = config.CHAMPION_ROLES[role].filter((champ) =>
				usedChampions.has(champ),
			);
			pool.push(...oldChampionsForRole);
		}

		const shuffled = [...pool].sort(() => 0.5 - Math.random());
		const selected = shuffled.slice(0, 3);

		selected.forEach((champ) => {
			team.push(champ);
			selectedChampions.add(champ);
		});
	};

	for (const role of Object.keys(config.CHAMPION_ROLES)) {
		selectFromRole(blueTeam, role);
	}

	for (const role of Object.keys(config.CHAMPION_ROLES)) {
		selectFromRole(redTeam, role);
	}

	addUsedChampions(
		guildId,
		[...selectedChampions].filter((champ) => !usedChampions.has(champ)),
	);

	return { blueTeam, redTeam };
}

async function generateTeamsByRole(role) {
	const config = await readConfig();
	const roleChampions = config.CHAMPION_ROLES[role];

	if (!roleChampions) {
		throw new Error(`Invalid role: ${role}`);
	}

	let selectedChampions;
	if (roleChampions.length <= 24) {
		selectedChampions = [...roleChampions];
	} else {
		selectedChampions = [...roleChampions].sort(() => 0.5 - Math.random()).slice(0, 24);
	}

	const shuffledChampions = selectedChampions.sort(() => 0.5 - Math.random());
	const midPoint = Math.ceil(shuffledChampions.length / 2);
	const blueTeam = shuffledChampions.slice(0, midPoint);
	const redTeam = shuffledChampions.slice(midPoint);

	return { blueTeam, redTeam };
}

function createRandomTeams(members) {
  const totalPlayers = 10;
  const memberNames = [...members];

  while (memberNames.length < totalPlayers) {
    memberNames.push(`World-${memberNames.length + 1 - members.length}`);
  }

  const shuffledMembers = memberNames.sort(() => 0.5 - Math.random());

  const teamA = [];
  const teamB = [];

  shuffledMembers.forEach((member, index) => {
    if (index % 2 === 0) {
      teamA.push(member);
    } else {
      teamB.push(member);
    }
  });

  return { teamA, teamB };
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

module.exports = {
	generateTeams,
	generateTeamsByRole,
	verifyUniqueTeams,
	createRandomTeams,
	getUsedChampions,
	addUsedChampions,
	resetUsedChampions,
};
