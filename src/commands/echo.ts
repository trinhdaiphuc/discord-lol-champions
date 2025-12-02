import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../types/index.ts";

const command: BotCommand = {
	data: new SlashCommandBuilder()
		.setName("echo")
		.setDescription("Replies with your input")
		.addStringOption((option) =>
			option.setName("input").setDescription("The input to echo back").setRequired(true)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		const input = interaction.options.getString("input");
		await interaction.reply(`${input}`);
	},
};

export default command;

