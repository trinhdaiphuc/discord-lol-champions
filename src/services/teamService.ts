import { readConfig } from "../core/config.ts";
import * as championService from "./championService.ts";
import { randomInt } from "crypto";
import type { Config, TeamResult, RandomTeamResult } from "../types/index.ts";

class UsedChampions {
	total: Set<string>;
	roles: Map<string, Set<string>>;

	constructor() {
		this.total = new Set();
		this.roles = new Map();
	}

	getRole(role: string): Set<string> {
		if (!this.roles.has(role)) {
			this.roles.set(role, new Set());
		}
		return this.roles.get(role)!;
	}

	getTotal(): Set<string> {
		return this.total;
	}

	resetTotal(): void {
		this.total = new Set();
	}

	resetRole(role: string): void {
		this.roles.set(role, new Set());
	}

	reset(): void {
		this.total = new Set();
		this.roles = new Map();
	}
}

const cache = new Map<string, UsedChampions>();

function getCache(guildId: string): UsedChampions {
	if (!cache.has(guildId)) {
		cache.set(guildId, new UsedChampions());
	}
	return cache.get(guildId)!;
}

const getPoll = (
	role: string,
	usedChampions: UsedChampions,
	selectedChampions: Set<string>,
	availableChampionsByRole: Record<string, string[]>,
	config: Config
): string[] => {
	if (availableChampionsByRole[role].length < 3) {
		const pool = availableChampionsByRole[role].filter((champ) => !selectedChampions.has(champ));
		usedChampions.resetRole(role);
		let remainingChampions = config.CHAMPION_ROLES[role].filter(
			(champ) =>
				!(
					usedChampions.getTotal().has(champ) ||
					selectedChampions.has(champ) ||
					pool.includes(champ)
				)
		);
		if (remainingChampions.length + pool.length >= 3) {
			return [...pool, ...remainingChampions.sort(() => 0.5 - Math.random())].slice(0, 3);
		}

		remainingChampions = config.CHAMPION_ROLES[role].filter(
			(champ) => !(selectedChampions.has(champ) || pool.includes(champ))
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
			)
	);
	if (pool.length >= 3) {
		pool = pool.sort(() => 0.5 - Math.random());
		return pool.slice(0, 3);
	}

	usedChampions.resetRole(role);

	let remainingChampions = config.CHAMPION_ROLES[role].filter(
		(champ) =>
			!(usedChampions.getTotal().has(champ) || selectedChampions.has(champ) || pool.includes(champ))
	);

	if (pool.length + remainingChampions.length >= 3) {
		return [...pool, ...remainingChampions.sort(() => randomInt(2) - 0.5)].slice(0, 3);
	}

	remainingChampions = config.CHAMPION_ROLES[role]
		.filter((champ) => !(selectedChampions.has(champ) || pool.includes(champ)))
		.sort(() => randomInt(2) - 0.5);

	return [...pool, ...remainingChampions].slice(0, 3);
};

const selectFromRole = (
	team: string[],
	role: string,
	usedChampions: UsedChampions,
	selectedChampions: Set<string>,
	availableChampionsByRole: Record<string, string[]>,
	config: Config
): void => {
	const pool = getPoll(role, usedChampions, selectedChampions, availableChampionsByRole, config);

	pool.forEach((champ) => {
		team.push(champ);
		selectedChampions.add(champ);
		usedChampions.getRole(role).add(champ);
		usedChampions.getTotal().add(champ);
	});
};

export async function generateTeams(guildId: string): Promise<TeamResult> {
	const config = await readConfig();
	const usedChampions = getCache(guildId);

	console.log(`Used champions: ${usedChampions.getTotal().size}`);

	const availableChampionsByRole: Record<string, string[]> = {};
	for (const role in config.CHAMPION_ROLES) {
		availableChampionsByRole[role] = config.CHAMPION_ROLES[role].filter(
			(champ) => !(usedChampions.getRole(role).has(champ) || usedChampions.getTotal().has(champ))
		);
		console.log(`Available champions for role ${role}: ${availableChampionsByRole[role].length}`);
	}

	const selectedChampions = new Set<string>();
	const blueTeam: string[] = [];
	const redTeam: string[] = [];

	for (const role of Object.keys(config.CHAMPION_ROLES)) {
		selectFromRole(
			blueTeam,
			role,
			usedChampions,
			selectedChampions,
			availableChampionsByRole,
			config
		);
	}

	for (const role of Object.keys(config.CHAMPION_ROLES)) {
		selectFromRole(
			redTeam,
			role,
			usedChampions,
			selectedChampions,
			availableChampionsByRole,
			config
		);
	}

	if (usedChampions.getTotal().size >= Object.keys(championService.getChampions()).length) {
		console.log(`Reset total`);
		usedChampions.resetTotal();
	}

	verifyUniqueTeams(blueTeam, redTeam);
	return { blueTeam, redTeam };
}

export async function generateTeamsByRole(role: string): Promise<TeamResult> {
	const config = await readConfig();
	const roleChampions = config.CHAMPION_ROLES[role];

	if (!roleChampions) {
		throw new Error(`Invalid role: ${role}`);
	}

	let selectedChampions: string[];
	if (roleChampions.length <= 24) {
		selectedChampions = [...roleChampions];
	} else {
		selectedChampions = [...roleChampions].sort(() => randomInt(2) - 0.5).slice(0, 24);
	}

	const shuffledChampions = selectedChampions.sort(() => randomInt(2) - 0.5);
	const midPoint = Math.ceil(shuffledChampions.length / 2);
	const blueTeam = shuffledChampions.slice(0, midPoint);
	const redTeam = shuffledChampions.slice(midPoint);

	return { blueTeam, redTeam };
}

export function createRandomTeams(members: string[]): RandomTeamResult {
	const totalPlayers = 10;
	const memberNames = [...members];

	while (memberNames.length < totalPlayers) {
		memberNames.push(`World-${memberNames.length + 1 - members.length}`);
	}

	const shuffledMembers = memberNames.sort(() => randomInt(2) - 0.5);

	const teamA: string[] = [];
	const teamB: string[] = [];

	shuffledMembers.forEach((member, index) => {
		if (index % 2 === 0) {
			teamA.push(member);
		} else {
			teamB.push(member);
		}
	});

	return { teamA, teamB };
}

export const verifyUniqueTeams = (teamA: string[], teamB: string[]): boolean => {
	const setA = new Set(teamA);
	for (const champ of teamB) {
		if (setA.has(champ)) {
			console.log(`⚠️ Warning: Champion ${champ} is in both teams`);
			return false;
		}
	}
	return true;
};

