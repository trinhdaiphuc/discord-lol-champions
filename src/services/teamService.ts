import { readConfig } from "../core/config.ts";
import { randomInt } from "crypto";
import type { Config, TeamResult, RandomTeamResult } from "../types/index.ts";

const DEFAULT_CHAMPIONS_PER_ROLE_PER_TEAM = 4;
const MIN_PRIMARY_ROLE_CHAMPIONS = 2;

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

const shuffle = <T>(arr: T[]): T[] => {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
};

const assignToBalancedTeam = (
	blueRolePicks: string[],
	redRolePicks: string[],
	champion: string,
	championsPerRolePerTeam: number
): void => {
	if (blueRolePicks.length >= championsPerRolePerTeam) {
		redRolePicks.push(champion);
		return;
	}
	if (redRolePicks.length >= championsPerRolePerTeam) {
		blueRolePicks.push(champion);
		return;
	}
	if (blueRolePicks.length <= redRolePicks.length) {
		blueRolePicks.push(champion);
	} else {
		redRolePicks.push(champion);
	}
};

const buildChampionRoleMembershipCount = (config: Config): Map<string, number> => {
	const counts = new Map<string, number>();
	for (const roleChampions of Object.values(config.CHAMPION_ROLES)) {
		for (const champ of roleChampions) {
			counts.set(champ, (counts.get(champ) || 0) + 1);
		}
	}
	return counts;
};

const prioritizeRoleSpecificChampions = (
	champions: string[],
	championRoleMembershipCount: Map<string, number>
): string[] =>
	[...champions].sort(
		(a, b) =>
			(championRoleMembershipCount.get(a) || Number.MAX_SAFE_INTEGER) -
			(championRoleMembershipCount.get(b) || Number.MAX_SAFE_INTEGER)
	);

const draftRoleForBothTeams = (
	role: string,
	usedChampions: UsedChampions,
	selectedChampions: Set<string>,
	config: Config,
	championRoleMembershipCount: Map<string, number>,
	championsPerRolePerTeam: number
): { blueRolePicks: string[]; redRolePicks: string[] } => {
	const championsPerRolePerMatch = championsPerRolePerTeam * 2;
	const primaryRoleChampions = config.CHAMPION_ROLES[role] || [];
	const fallbackRoles = config.FALLBACK_ROLES[role] || [];
	const drafted = new Set<string>();
	const draftedFromRole = new Map<string, string>();
	const blueRolePicks: string[] = [];
	const redRolePicks: string[] = [];
	let primaryPicked = 0;

	const addCandidates = (candidates: string[], sourceRole: string, isPrimary: boolean): void => {
		for (const champ of candidates) {
			if (drafted.size >= championsPerRolePerMatch) {
				break;
			}
			if (selectedChampions.has(champ) || drafted.has(champ)) {
				continue;
			}
			drafted.add(champ);
			draftedFromRole.set(champ, sourceRole);
			assignToBalancedTeam(blueRolePicks, redRolePicks, champ, championsPerRolePerTeam);
			if (isPrimary) {
				primaryPicked += 1;
			}
		}
	};

	const getUnusedInRole = (roleName: string): string[] =>
		prioritizeRoleSpecificChampions(
			shuffle(
				(config.CHAMPION_ROLES[roleName] || []).filter(
					(champ) => !usedChampions.getRole(roleName).has(champ)
				)
			),
			championRoleMembershipCount
		);

	const getAnyInRole = (roleName: string): string[] =>
		prioritizeRoleSpecificChampions(
			shuffle(config.CHAMPION_ROLES[roleName] || []),
			championRoleMembershipCount
		);

	const logRolePoolSnapshot = (stage: "before" | "after"): void => {
		const primaryTotal = (config.CHAMPION_ROLES[role] || []).length;
		const primaryUsed = usedChampions.getRole(role).size;
		const primaryRemaining = Math.max(0, primaryTotal - primaryUsed);
		const fallbackSummary = fallbackRoles
			.map((fbRole) => {
				const fbTotal = (config.CHAMPION_ROLES[fbRole] || []).length;
				const fbUsed = usedChampions.getRole(fbRole).size;
				const fbRemaining = Math.max(0, fbTotal - fbUsed);
				return `${fbRole}:${fbRemaining}/${fbTotal}`;
			})
			.join(", ");
		const selectedInMatch = selectedChampions.size;
		console.log(
			`[POOL][${stage}] role=${role} primary=${primaryRemaining}/${primaryTotal} selectedInMatch=${selectedInMatch} draftedForRole=${drafted.size}/${championsPerRolePerMatch} fallbacks=[${fallbackSummary || "none"}]`
		);
	};

	logRolePoolSnapshot("before");

	addCandidates(getUnusedInRole(role), role, true);
	const minimumPrimary = Math.min(
		MIN_PRIMARY_ROLE_CHAMPIONS,
		primaryRoleChampions.filter((champ) => !selectedChampions.has(champ)).length
	);
	if (primaryPicked < minimumPrimary) {
		console.log(`⚠️ Role ${role}: ensure minimum primary picks, reset role pool and refill`);
		usedChampions.resetRole(role);
		addCandidates(getAnyInRole(role), role, true);
	}

	if (drafted.size < championsPerRolePerMatch) {
		for (const fbRole of fallbackRoles) {
			if (drafted.size >= championsPerRolePerMatch) {
				break;
			}
			addCandidates(getUnusedInRole(fbRole), fbRole, false);
		}
	}

	if (drafted.size < championsPerRolePerMatch) {
		console.log(
			`⚠️ Role ${role}: primary and fallback unused exhausted, reset role pool and refill`
		);
		usedChampions.resetRole(role);
		addCandidates(getAnyInRole(role), role, true);
	}

	if (drafted.size < championsPerRolePerMatch) {
		for (const fbRole of fallbackRoles) {
			if (drafted.size >= championsPerRolePerMatch) {
				break;
			}
			usedChampions.resetRole(fbRole);
			addCandidates(getAnyInRole(fbRole), fbRole, false);
		}
	}

	if (drafted.size < championsPerRolePerMatch) {
		console.log(`⚠️ Role ${role}: not enough champions even after fallback refill`);
		addCandidates(getAnyInRole(role), role, true);
	}

	for (const champ of blueRolePicks) {
		selectedChampions.add(champ);
		const sourceRole = draftedFromRole.get(champ) || role;
		usedChampions.getRole(sourceRole).add(champ);
		usedChampions.getTotal().add(champ);
	}
	for (const champ of redRolePicks) {
		selectedChampions.add(champ);
		const sourceRole = draftedFromRole.get(champ) || role;
		usedChampions.getRole(sourceRole).add(champ);
		usedChampions.getTotal().add(champ);
	}

	logRolePoolSnapshot("after");

	return { blueRolePicks, redRolePicks };
};

interface GenerateTeamOptions {
	poolSize?: 3 | 4 | 5 | 6;
}

export async function generateTeams(
	guildId: string,
	options: GenerateTeamOptions = {}
): Promise<TeamResult> {
	const config = await readConfig();
	const usedChampions = getCache(guildId);
	const championRoleMembershipCount = buildChampionRoleMembershipCount(config);
	const championsPerRolePerTeam = options.poolSize ?? DEFAULT_CHAMPIONS_PER_ROLE_PER_TEAM;
	const championsPerRolePerMatch = championsPerRolePerTeam * 2;

	console.log(`Used champions for guild ${guildId}: ${usedChampions.getTotal().size}`);
	console.log(
		`[POOL][match-start] ${Object.keys(config.CHAMPION_ROLES)
			.map((role) => {
				const total = config.CHAMPION_ROLES[role].length;
				const used = usedChampions.getRole(role).size;
				const remaining = Math.max(0, total - used);
				return `${role}:${remaining}/${total}`;
			})
			.join(" | ")}`
	);

	const selectedChampions = new Set<string>();
	const blueTeam: string[] = [];
	const redTeam: string[] = [];

	for (const role of Object.keys(config.CHAMPION_ROLES)) {
		const { blueRolePicks, redRolePicks } = draftRoleForBothTeams(
			role,
			usedChampions,
			selectedChampions,
			config,
			championRoleMembershipCount,
			championsPerRolePerTeam
		);
		console.log(
			`Role ${role}: drafted ${blueRolePicks.length + redRolePicks.length}/${championsPerRolePerMatch}`
		);
		blueTeam.push(...blueRolePicks);
		redTeam.push(...redRolePicks);
	}

	const allRolePoolsExhausted = Object.keys(config.CHAMPION_ROLES).every(
		(role) => usedChampions.getRole(role).size >= config.CHAMPION_ROLES[role].length
	);
	if (allRolePoolsExhausted) {
		console.log(`Reset all role pools`);
		usedChampions.reset();
	}
	console.log(
		`[POOL][match-end] ${Object.keys(config.CHAMPION_ROLES)
			.map((role) => {
				const total = config.CHAMPION_ROLES[role].length;
				const used = usedChampions.getRole(role).size;
				const remaining = Math.max(0, total - used);
				return `${role}:${remaining}/${total}`;
			})
			.join(" | ")}`
	);

	verifyUniqueTeams(blueTeam, redTeam);
	return { blueTeam, redTeam };
}

export async function generateTeamsByRole(
	role: string,
	options: GenerateTeamOptions = {}
): Promise<TeamResult> {
	const config = await readConfig();
	const roleChampions = config.CHAMPION_ROLES[role];
	const championsPerRolePerTeam = options.poolSize ?? DEFAULT_CHAMPIONS_PER_ROLE_PER_TEAM;
	const totalChampionsNeeded = championsPerRolePerTeam * 2;

	if (!roleChampions) {
		throw new Error(`Invalid role: ${role}`);
	}

	let selectedChampions: string[];
	if (roleChampions.length <= totalChampionsNeeded) {
		selectedChampions = [...roleChampions];
	} else {
		selectedChampions = shuffle(roleChampions).slice(0, totalChampionsNeeded);
	}

	if (selectedChampions.length < totalChampionsNeeded) {
		throw new Error(
			`Not enough champions for role ${role}. Needed ${totalChampionsNeeded}, got ${selectedChampions.length}.`
		);
	}

	const shuffledChampions = shuffle(selectedChampions);
	const blueTeam = shuffledChampions.slice(0, championsPerRolePerTeam);
	const redTeam = shuffledChampions.slice(championsPerRolePerTeam, totalChampionsNeeded);

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
