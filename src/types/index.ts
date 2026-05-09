import type {
	Client,
	Collection,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface Champion {
	id: string;
	name: string;
	title: string;
	image: {
		full: string;
		sprite: string;
		group: string;
		x: number;
		y: number;
		w: number;
		h: number;
	};
	tags: string[];
	[key: string]: unknown;
}

export interface ChampionData {
	[key: string]: Champion;
}

export interface Config {
	DRAGON_VERSION: string;
	CHAMPION_ROLES: {
		[role: string]: string[];
	};
	FALLBACK_ROLES: {
		[role: string]: string[];
	};
}

export interface BotCommand {
	data:
		| SlashCommandBuilder
		| SlashCommandOptionsOnlyBuilder
		| SlashCommandSubcommandsOnlyBuilder
		| Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
	authorizedRoles?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BotEvent<T extends unknown[] = any[]> {
	name: string;
	once?: boolean;
	execute: (...args: T) => void | Promise<void>;
}

export interface ExtendedClient extends Client {
	commands: Collection<string, BotCommand>;
}

export interface Checksums {
	[fileName: string]: {
		checksum: string;
	};
}

export type ChampionRoleKey = "Fighter" | "Mage" | "Tank" | "Marksman" | "Assassin" | "Support";

export type SynergyMetricKey =
	| "engage"
	| "damageBalance"
	| "cc"
	| "peel"
	| "scaling"
	| "laneStability";

export interface SynergyMetricScore {
	score: number;
	label: string;
	evidence: string[];
}

export type TeamSynergyScores = Record<SynergyMetricKey, SynergyMetricScore>;

export interface TeamSynergyAnalysis {
	side: "blue" | "red";
	poolSize: number;
	roleOrder: ChampionRoleKey[];
	team: string[];
	rolePools: Record<ChampionRoleKey, string[]>;
	scores: TeamSynergyScores;
	summaryLine: string;
	takeaway: string;
}

export interface PersistedCompAnalysisRecord {
	id: number;
	guildId: string;
	generationMode: "full" | "full-with-exclusions" | "role-only";
	poolSize: number;
	blueTeam: string[];
	redTeam: string[];
	blueAnalysis: TeamSynergyAnalysis;
	redAnalysis: TeamSynergyAnalysis;
	summaryText: string;
	compositionSignature: string;
	createdAt: number;
}

export interface TeamSideRolePools {
	Fighter: string[];
	Mage: string[];
	Tank: string[];
	Marksman: string[];
	Assassin: string[];
	Support: string[];
}

export interface TeamGenerationMetadata {
	mode: "full" | "full-with-exclusions" | "role-only";
	poolSize: 3 | 4 | 5 | 6;
	roleOrder: ChampionRoleKey[];
	blueRolePools: TeamSideRolePools;
	redRolePools: TeamSideRolePools;
}

export interface TeamResult {
	blueTeam: string[];
	redTeam: string[];
	metadata: TeamGenerationMetadata;
}

export interface RandomTeamResult {
	teamA: string[];
	teamB: string[];
}

export interface GuildGenerateConfig {
	guildId: string;
	poolSize: 3 | 4 | 5 | 6;
	historyWindow: number;
	themeId: string;
	updatedAt: number;
}

export interface ImageThemeTokens {
	combinedGradient: [string, string, string, string, string];
	panelBlueGradient: [string, string];
	panelRedGradient: [string, string];
	panelGridBlue: string;
	panelGridRed: string;
	panelBorderBlue: string;
	panelBorderRed: string;
	cardGradient: [string, string, string];
	cardBorderGradient: [string, string, string];
	cardGlossGradient: [string, string, string];
	placeholderBg: string;
	placeholderBorder: string;
	placeholderText: string;
	teamTitle: string;
	teamTitleBlueGlow: string;
	teamTitleRedGlow: string;
	imageBorderBlue: string;
	imageBorderRed: string;
	championName: string;
	championNameShadow: string;
	blobBlue: string;
	blobRed: string;
	centerLine: [string, string, string];
	outerBorder: string;
	vsText: string;
}

export interface ImageTheme {
	id: string;
	name: string;
	description: string;
	tokens: ImageThemeTokens;
}

export interface ThemeManifestItem {
	id: string;
	name: string;
	description: string;
	file: string;
}
