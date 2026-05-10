import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../entities/index.ts";

const command: BotCommand = {
	data: new SlashCommandBuilder().setName("g9").setDescription("Says good night to the server"),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply("Good night, everyone! 🌙");
	},
};

export default command;

