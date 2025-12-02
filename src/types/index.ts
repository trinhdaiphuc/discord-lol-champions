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

export interface TeamResult {
	blueTeam: string[];
	redTeam: string[];
}

export interface RandomTeamResult {
	teamA: string[];
	teamB: string[];
}

