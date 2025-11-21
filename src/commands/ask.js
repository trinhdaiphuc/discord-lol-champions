const { SlashCommandBuilder } = require("discord.js");
const { askAI } = require("../services/aiService");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ask")
		.setDescription("Ask a question to AI")
		.addStringOption((option) =>
			option.setName("question").setDescription("The question to ask").setRequired(true),
		),
	async execute(interaction) {
		await interaction.deferReply();
		const question = interaction.options.getString("question");

		try {
			const answer = await askAI(question);
			await interaction.editReply(`> **Question:** ${question}\n\n${answer}`);
		} catch (error) {
			console.error(error);
			await interaction.editReply(
				error.message || "Sorry, I encountered an error while processing your request.",
			);
		}
	},
};
