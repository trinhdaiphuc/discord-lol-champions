const { readConfig } = require("../core/config");
const championService = require("./championService");
const crypto = require("crypto");

const MIN_CHAMPIONS_REQUIRED = 36;

const cache = new Map();

class UsedChampions {
	constructor () {
		this.total = new Set();
		this.roles = new Map();
	}

	getRole(role) {
		if (!this.roles.has(role)) {
			this.roles.set(role, new Set());
		}
		return this.roles.get(role);
	}

	getTotal() {
		return this.total;
	}

	resetTotal() {
		this.total = new Set();
	}

	resetRole(role) {
		this.roles.set(role, new Set());
	}

	reset() {
		this.total = new Set();
		this.roles = new Map();
	}
}

function getCache(guildId) {
	if (!cache.has(guildId)) {
		cache.set(guildId, new UsedChampions());
	}
	return cache.get(guildId);
}

// 1. Nếu tướng dư > 3 thì trả về random 3 tướng
// 2. Nếu tướng dư < 3 thì bỏ 3 tướng đó vô pool trước. Sau đó lấy random tướng còn lại đã được sử dụng trong role đó mà không trùng với tướng đã gen ở total và đã chọn
// 		2.1 Nếu tướng đủ thì trả về
// 		2.2 Nếu tướng còn lại + tướng đã chọn < 3 thì lấy random tướng còn lại đã được sử dụng trong role đó mà không trùng với tướng đã gen ở total và đã chọn
const getPoll = (role, usedChampions, selectedChampions, availableChampionsByRole, config) => {
	if (availableChampionsByRole[role].length < 3) {
		let pool = availableChampionsByRole[role].filter((champ) => !selectedChampions.has(champ));
		usedChampions.resetRole(role);
		let remainingChampions = config.CHAMPION_ROLES[role].filter(
			(champ) =>
				!(
					usedChampions.getTotal().has(champ) ||
					selectedChampions.has(champ) ||
					pool.includes(champ)
				),
		);
		if (remainingChampions.length + pool.length >= 3) {
			return [...pool, ...remainingChampions.sort(() => 0.5 - Math.random())].slice(0, 3);
		}

		remainingChampions = config.CHAMPION_ROLES[role].filter(
			(champ) => !(selectedChampions.has(champ) || pool.includes(champ)),
		);

		if (remainingChampions.length + pool.length < 3) {
			console.log(`⚠️ Not enough champions for role ${role}`);
		}

		return [...pool, ...remainingChampions.sort(() => 0.5 - Math.random())].slice(0, 3);
	}

	let pool = availableChampionsByRole[role].filter(
		(champ) =>
			!(
				selectedChampions.has(champ) ||
				usedChampions.getTotal().has(champ) ||
				usedChampions.getRole(role).has(champ)
			),
	);
	if (pool.length >= 3) {
		pool = pool.sort(() => 0.5 - Math.random());
		return pool.slice(0, 3);
	}

	usedChampions.resetRole(role);

	let remainingChampions = config.CHAMPION_ROLES[role].filter(
		(champ) =>
			!(
				usedChampions.getTotal().has(champ) ||
				selectedChampions.has(champ) ||
				pool.includes(champ)
			),
	);

	if (pool.length + remainingChampions.length >= 3) {
		return [...pool, ...remainingChampions.sort(() => crypto.randomInt(2) - 0.5)].slice(0, 3);
	}

	remainingChampions = config.CHAMPION_ROLES[role]
		.filter((champ) => !(selectedChampions.has(champ) || pool.includes(champ)))
		.sort(() => crypto.randomInt(2) - 0.5);

	return [...pool, ...remainingChampions].slice(0, 3);
};

const selectFromRole = (
	team,
	role,
	usedChampions,
	selectedChampions,
	availableChampionsByRole,
	config,
) => {
	const pool = getPoll(role, usedChampions, selectedChampions, availableChampionsByRole, config);

	pool.forEach((champ) => {
		team.push(champ);
		selectedChampions.add(champ);
		usedChampions.getRole(role).add(champ);
		usedChampions.getTotal().add(champ);
	});
};

async function generateTeams(guildId) {
	const config = await readConfig();
	const usedChampions = getCache(guildId);

	console.log(`Used champions: ${usedChampions.getTotal().size}`);

	const availableChampionsByRole = {};
	for (const role in config.CHAMPION_ROLES) {
		availableChampionsByRole[role] = config.CHAMPION_ROLES[role].filter(
			(champ) => !(usedChampions.getRole(role).has(champ) || usedChampions.getTotal().has(champ)),
		);
		console.log(`Available champions for role ${role}: ${availableChampionsByRole[role].length}`);
	}

	const selectedChampions = new Set();
	const blueTeam = [];
	const redTeam = [];

	for (const role of Object.keys(config.CHAMPION_ROLES)) {
		selectFromRole(
			blueTeam,
			role,
			usedChampions,
			selectedChampions,
			availableChampionsByRole,
			config,
		);
	}

	for (const role of Object.keys(config.CHAMPION_ROLES)) {
		selectFromRole(
			redTeam,
			role,
			usedChampions,
			selectedChampions,
			availableChampionsByRole,
			config,
		);
	}

	if (usedChampions.getTotal().size >= Object.keys(championService.getChampions()).length) {
		console.log(`Reset total`);
		usedChampions.resetTotal();
	}

	verifyUniqueTeams(blueTeam, redTeam);
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
		selectedChampions = [...roleChampions].sort(() => crypto.randomInt(2) - 0.5).slice(0, 24);
	}

	const shuffledChampions = selectedChampions.sort(() => crypto.randomInt(2) - 0.5);
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

	const shuffledMembers = memberNames.sort(() => crypto.randomInt(2) - 0.5);

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
			console.log(`⚠️ Warning: Champion ${champ} is in both teams`);
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
};
