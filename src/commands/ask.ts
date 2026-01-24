import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { askAI } from "../services/aiService.ts";
import type { BotCommand } from "../types/index.ts";

const command: BotCommand = {
	data: new SlashCommandBuilder()
		.setName("ask")
		.setDescription("Ask a question to AI")
		.addStringOption((option) =>
			option.setName("question").setDescription("The question to ask").setRequired(true)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();
		const question = interaction.options.getString("question");

		try {
			const answer = await askAI(question!);
			const fullMessage = `> **Question:** ${question}\n\n${answer}`;

			// Discord has a 2000 character limit
			const MAX_LENGTH = 2000;
			const truncatedMessage = fullMessage.length > MAX_LENGTH
				? fullMessage.slice(0, MAX_LENGTH - 15) + "...(truncated)"
				: fullMessage;

			await interaction.editReply(truncatedMessage);
		} catch (error) {
			console.error(error);
			await interaction.editReply(
				(error as Error).message ||
				"Sorry, I encountered an error while processing your request."
			);
		}
	},
};

export default command;

