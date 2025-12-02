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
			await interaction.editReply(`> **Question:** ${question}\n\n${answer}`);
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

