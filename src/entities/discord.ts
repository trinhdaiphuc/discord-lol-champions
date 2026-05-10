import type {
	Client,
	Collection,
	ChatInputCommandInteraction,
	AutocompleteInteraction,
	SlashCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface BotCommand {
	data:
		| SlashCommandBuilder
		| SlashCommandOptionsOnlyBuilder
		| SlashCommandSubcommandsOnlyBuilder
		| Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand">;
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
	autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
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
