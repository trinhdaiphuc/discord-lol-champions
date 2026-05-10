import NodeCache from "node-cache";
import { randomInt } from "crypto";
import { getChampionCacheTtlSeconds, readConfig } from "../core/config.ts";
import type {
	ChampionRoleKey,
	Config,
	RandomTeamResult,
	TeamResult,
	TeamSideRolePools,
} from "../entities/index.ts";

const DEFAULT_CHAMPIONS_PER_ROLE_PER_TEAM = 4;
const MIN_PRIMARY_ROLE_CHAMPIONS = 2;
const ROLE_ORDER: ChampionRoleKey[] = [
	"Fighter",
	"Mage",
	"Tank",
	"Marksman",
	"Assassin",
	"Support",
];

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

interface GuildTeamCacheState {
	usedChampions: UsedChampions;
	recentMatches: string[][];
}

const cache = new NodeCache({
	stdTTL: getChampionCacheTtlSeconds(),
	useClones: false,
});

function createGuildTeamCacheState(): GuildTeamCacheState {
	return {
		usedChampions: new UsedChampions(),
		recentMatches: [],
	};
}

function getCache(guildId: string): GuildTeamCacheState {
	const cachedValue = cache.get(guildId) as GuildTeamCacheState | undefined;
	if (cachedValue) {
		return cachedValue;
	}

	const state = createGuildTeamCacheState();
	cache.set(guildId, state);
	return state;
}

function refreshGuildCacheTtl(guildId: string, state: GuildTeamCacheState): void {
	cache.set(guildId, state, getChampionCacheTtlSeconds());
}

export function clearGuildTeamCache(guildId: string): boolean {
	return cache.del(guildId) > 0;
}

function buildBlockedRecentChampions(
	recentMatches: string[][],
	historyWindow: number
): Set<string> {
	if (historyWindow <= 0 || recentMatches.length === 0) {
		return new Set<string>();
	}

	return new Set(recentMatches.slice(-historyWindow).flat());
}

function recordRecentMatch(
	state: GuildTeamCacheState,
	allChampionsInMatch: string[],
	historyWindow: number
): void {
	if (historyWindow <= 0) {
		state.recentMatches = [];
		return;
	}

	state.recentMatches.push([...allChampionsInMatch]);
	if (state.recentMatches.length > historyWindow) {
		state.recentMatches = state.recentMatches.slice(-historyWindow);
	}
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
	championsPerRolePerTeam: number,
	blockedRecentChampions: Set<string>,
	enforceRecentHistory: boolean
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
			if (enforceRecentHistory && blockedRecentChampions.has(champ)) {
				console.log(`⚠️ Role ${role}: champion ${champ} is blocked by recent history filter`);
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
	historyWindow?: number;
}

function createEmptyRolePools(): TeamSideRolePools {
	return {
		Fighter: [],
		Mage: [],
		Tank: [],
		Marksman: [],
		Assassin: [],
		Support: [],
	};
}

function buildTeamResult(
	blueTeam: string[],
	redTeam: string[],
	blueRolePools: TeamSideRolePools,
	redRolePools: TeamSideRolePools,
	options: { mode: TeamResult["metadata"]["mode"]; poolSize: 3 | 4 | 5 | 6 }
): TeamResult {
	return {
		blueTeam,
		redTeam,
		metadata: {
			mode: options.mode,
			poolSize: options.poolSize,
			roleOrder: ROLE_ORDER,
			blueRolePools,
			redRolePools,
		},
	};
}

export async function generateTeams(
	guildId: string,
	options: GenerateTeamOptions = {}
): Promise<TeamResult> {
	const config = await readConfig();
	const state = getCache(guildId);
	const usedChampions = state.usedChampions;
	const championRoleMembershipCount = buildChampionRoleMembershipCount(config);
	const championsPerRolePerTeam = options.poolSize ?? DEFAULT_CHAMPIONS_PER_ROLE_PER_TEAM;
	const championsPerRolePerMatch = championsPerRolePerTeam * 2;
	const historyWindow = Math.max(0, options.historyWindow ?? 1);
	const blockedRecentChampions = buildBlockedRecentChampions(state.recentMatches, historyWindow);

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
	const blueRolePools = createEmptyRolePools();
	const redRolePools = createEmptyRolePools();

	for (const role of ROLE_ORDER) {
		let roleResult = draftRoleForBothTeams(
			role,
			usedChampions,
			selectedChampions,
			config,
			championRoleMembershipCount,
			championsPerRolePerTeam,
			blockedRecentChampions,
			true
		);
		if (
			blockedRecentChampions.size > 0 &&
			roleResult.blueRolePicks.length + roleResult.redRolePicks.length < championsPerRolePerMatch
		) {
			console.log(`⚠️ Role ${role}: recent history blocked completion, relaxing history filter`);
			roleResult = draftRoleForBothTeams(
				role,
				usedChampions,
				selectedChampions,
				config,
				championRoleMembershipCount,
				championsPerRolePerTeam,
				blockedRecentChampions,
				false
			);
		}
		const { blueRolePicks, redRolePicks } = roleResult;
		console.log(
			`Role ${role}: drafted ${blueRolePicks.length + redRolePicks.length}/${championsPerRolePerMatch}`
		);
		blueRolePools[role] = [...blueRolePicks];
		redRolePools[role] = [...redRolePicks];
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
	recordRecentMatch(state, [...blueTeam, ...redTeam], historyWindow);
	refreshGuildCacheTtl(guildId, state);
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
	return buildTeamResult(blueTeam, redTeam, blueRolePools, redRolePools, {
		mode: "full",
		poolSize: championsPerRolePerTeam,
	});
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
	const blueRolePools = createEmptyRolePools();
	const redRolePools = createEmptyRolePools();
	const normalizedRole = role as ChampionRoleKey;
	blueRolePools[normalizedRole] = [...blueTeam];
	redRolePools[normalizedRole] = [...redTeam];

	return buildTeamResult(blueTeam, redTeam, blueRolePools, redRolePools, {
		mode: "role-only",
		poolSize: championsPerRolePerTeam,
	});
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

export async function generateTeamsWithExclusions(
	guildId: string,
	exclusions: string[],
	options: GenerateTeamOptions = {}
): Promise<TeamResult> {
	const config = await readConfig();
	const state = getCache(guildId);
	const usedChampions = state.usedChampions;
	const championRoleMembershipCount = buildChampionRoleMembershipCount(config);
	const championsPerRolePerTeam = options.poolSize ?? DEFAULT_CHAMPIONS_PER_ROLE_PER_TEAM;
	const championsPerRolePerMatch = championsPerRolePerTeam * 2;
	const historyWindow = Math.max(0, options.historyWindow ?? 1);
	const blockedRecentChampions = buildBlockedRecentChampions(state.recentMatches, historyWindow);

	const exclusionsSet = new Set(exclusions);

	console.log(`Excluding ${exclusionsSet.size} champions for guild ${guildId}`);

	const selectedChampions = new Set<string>();
	const blueTeam: string[] = [];
	const redTeam: string[] = [];
	const blueRolePools = createEmptyRolePools();
	const redRolePools = createEmptyRolePools();

	// local helper versions that respect exclusions
	const getFilteredRoleArray = (roleName: string): string[] =>
		(config.CHAMPION_ROLES[roleName] || []).filter((c) => !exclusionsSet.has(c));

	const getFilteredFallbacks = (roleName: string): string[] =>
		(config.FALLBACK_ROLES[roleName] || []).filter((c) => !exclusionsSet.has(c));

	const prioritizeFiltered = (champions: string[]) =>
		prioritizeRoleSpecificChampions(champions, championRoleMembershipCount);

	const draftRoleForBothTeamsWithExclusions = (
		role: string,
		usedChampionsLocal: UsedChampions,
		selectedChampionsLocal: Set<string>,
		championsPerRolePerTeamLocal: number,
		blockedRecentChampionsLocal: Set<string>,
		enforceRecentHistory: boolean
	): { blueRolePicks: string[]; redRolePicks: string[] } => {
		const championsPerRolePerMatchLocal = championsPerRolePerTeamLocal * 2;
		const primaryRoleChampions = getFilteredRoleArray(role);
		const fallbackRoles = getFilteredFallbacks(role);
		const drafted = new Set<string>();
		const draftedFromRole = new Map<string, string>();
		const blueRolePicks: string[] = [];
		const redRolePicks: string[] = [];
		let primaryPicked = 0;

		const addCandidates = (candidates: string[], sourceRole: string, isPrimary: boolean): void => {
			for (const champ of candidates) {
				if (drafted.size >= championsPerRolePerMatchLocal) break;
				if (selectedChampionsLocal.has(champ) || drafted.has(champ)) continue;
				if (enforceRecentHistory && blockedRecentChampionsLocal.has(champ)) continue;
				drafted.add(champ);
				draftedFromRole.set(champ, sourceRole);
				assignToBalancedTeam(blueRolePicks, redRolePicks, champ, championsPerRolePerTeamLocal);
				if (isPrimary) primaryPicked += 1;
			}
		};

		const getUnusedInRole = (roleName: string): string[] =>
			prioritizeFiltered(
				shuffle(
					getFilteredRoleArray(roleName).filter(
						(champ) => !usedChampionsLocal.getRole(roleName).has(champ)
					)
				)
			);

		const getAnyInRole = (roleName: string): string[] =>
			prioritizeFiltered(shuffle(getFilteredRoleArray(roleName)));

		const logRolePoolSnapshot = (stage: "before" | "after"): void => {
			const primaryTotal = getFilteredRoleArray(role).length;
			const primaryUsed = usedChampionsLocal.getRole(role).size;
			const primaryRemaining = Math.max(0, primaryTotal - primaryUsed);
			const fallbackSummary = (config.FALLBACK_ROLES[role] || [])
				.filter((fbRole) => getFilteredRoleArray(fbRole).length > 0)
				.map((fbRole) => {
					const fbTotal = getFilteredRoleArray(fbRole).length;
					const fbUsed = usedChampionsLocal.getRole(fbRole).size;
					const fbRemaining = Math.max(0, fbTotal - fbUsed);
					return `${fbRole}:${fbRemaining}/${fbTotal}`;
				})
				.join(", ");
			const selectedInMatch = selectedChampionsLocal.size;
			console.log(
				`[POOL][${stage}] role=${role} primary=${primaryRemaining}/${primaryTotal} selectedInMatch=${selectedInMatch} draftedForRole=${drafted.size}/${championsPerRolePerMatchLocal} fallbacks=[${fallbackSummary || "none"}]`
			);
		};

		logRolePoolSnapshot("before");

		addCandidates(getUnusedInRole(role), role, true);
		const minimumPrimary = Math.min(
			MIN_PRIMARY_ROLE_CHAMPIONS,
			primaryRoleChampions.filter((champ) => !selectedChampionsLocal.has(champ)).length
		);
		if (primaryPicked < minimumPrimary) {
			console.log(`⚠️ Role ${role}: ensure minimum primary picks, reset role pool and refill`);
			usedChampionsLocal.resetRole(role);
			addCandidates(getAnyInRole(role), role, true);
		}

		if (drafted.size < championsPerRolePerMatchLocal) {
			for (const fbRole of fallbackRoles) {
				if (drafted.size >= championsPerRolePerMatchLocal) break;
				addCandidates(getUnusedInRole(fbRole), fbRole, false);
			}
		}

		if (drafted.size < championsPerRolePerMatchLocal) {
			console.log(
				`⚠️ Role ${role}: primary and fallback unused exhausted, reset role pool and refill`
			);
			usedChampionsLocal.resetRole(role);
			addCandidates(getAnyInRole(role), role, true);
		}

		if (drafted.size < championsPerRolePerMatchLocal) {
			for (const fbRole of fallbackRoles) {
				if (drafted.size >= championsPerRolePerMatchLocal) break;
				usedChampionsLocal.resetRole(fbRole);
				addCandidates(getAnyInRole(fbRole), fbRole, false);
			}
		}

		if (drafted.size < championsPerRolePerMatchLocal) {
			console.log(`⚠️ Role ${role}: not enough champions even after fallback refill`);
			addCandidates(getAnyInRole(role), role, true);
		}

		for (const champ of blueRolePicks) {
			selectedChampionsLocal.add(champ);
			const sourceRole = draftedFromRole.get(champ) || role;
			usedChampionsLocal.getRole(sourceRole).add(champ);
			usedChampionsLocal.getTotal().add(champ);
		}
		for (const champ of redRolePicks) {
			selectedChampionsLocal.add(champ);
			const sourceRole = draftedFromRole.get(champ) || role;
			usedChampionsLocal.getRole(sourceRole).add(champ);
			usedChampionsLocal.getTotal().add(champ);
		}

		logRolePoolSnapshot("after");

		return { blueRolePicks, redRolePicks };
	};

	console.log(`Used champions for guild ${guildId}: ${usedChampions.getTotal().size}`);
	console.log(
		`[POOL][match-start] ${Object.keys(config.CHAMPION_ROLES)
			.map((role) => {
				const total = getFilteredRoleArray(role).length;
				const used = usedChampions.getRole(role).size;
				const remaining = Math.max(0, total - used);
				return `${role}:${remaining}/${total}`;
			})
			.join(" | ")}`
	);

	for (const role of ROLE_ORDER) {
		let roleResult = draftRoleForBothTeamsWithExclusions(
			role,
			usedChampions,
			selectedChampions,
			championsPerRolePerTeam,
			blockedRecentChampions,
			true
		);
		if (
			blockedRecentChampions.size > 0 &&
			roleResult.blueRolePicks.length + roleResult.redRolePicks.length < championsPerRolePerMatch
		) {
			console.log(`⚠️ Role ${role}: recent history blocked completion, relaxing history filter`);
			roleResult = draftRoleForBothTeamsWithExclusions(
				role,
				usedChampions,
				selectedChampions,
				championsPerRolePerTeam,
				blockedRecentChampions,
				false
			);
		}
		const { blueRolePicks, redRolePicks } = roleResult;
		console.log(
			`Role ${role}: drafted ${blueRolePicks.length + redRolePicks.length}/${championsPerRolePerMatch}`
		);
		blueRolePools[role] = [...blueRolePicks];
		redRolePools[role] = [...redRolePicks];
		blueTeam.push(...blueRolePicks);
		redTeam.push(...redRolePicks);
	}

	const allRolePoolsExhausted = Object.keys(config.CHAMPION_ROLES).every(
		(role) => usedChampions.getRole(role).size >= getFilteredRoleArray(role).length
	);
	if (allRolePoolsExhausted) {
		console.log(`Reset all role pools`);
		usedChampions.reset();
	}
	recordRecentMatch(state, [...blueTeam, ...redTeam], historyWindow);
	refreshGuildCacheTtl(guildId, state);
	console.log(
		`[POOL][match-end] ${Object.keys(config.CHAMPION_ROLES)
			.map((role) => {
				const total = getFilteredRoleArray(role).length;
				const used = usedChampions.getRole(role).size;
				const remaining = Math.max(0, total - used);
				return `${role}:${remaining}/${total}`;
			})
			.join(" | ")}`
	);

	verifyUniqueTeams(blueTeam, redTeam);

	// sanity check: ensure excluded champions not present
	for (const ex of exclusionsSet) {
		if (blueTeam.includes(ex) || redTeam.includes(ex)) {
			throw new Error(`Excluded champion ${ex} ended up in generated teams`);
		}
	}

	return buildTeamResult(blueTeam, redTeam, blueRolePools, redRolePools, {
		mode: "full-with-exclusions",
		poolSize: championsPerRolePerTeam,
	});
}
