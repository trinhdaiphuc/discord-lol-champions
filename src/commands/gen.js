const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const teamService = require("../services/teamService");
const imageService = require("../services/imageService");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("gen")
		.setDescription("Generates a random champion team image"),
	async execute(interaction) {
		try {
			await interaction.reply("🎲 Generating teams...");

			const { blueTeam, redTeam } = await teamService.generateTeams(interaction.guildId);
			const imageBuffer = await imageService.generateTeamImage(blueTeam, redTeam);
			const attachment = new AttachmentBuilder(imageBuffer, { name: "team.png" });

			await interaction.editReply({
				files: [attachment],
				content: "⚔️ ARAM Teams (6 roles × 3 champions)",
			});
		} catch (error) {
			console.error("❌ Bot error:", error);
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply(`❌ Error: ${error.message}`);
			} else {
				await interaction.reply(`❌ Error: ${error.message}`);
			}
		}
	},
};
