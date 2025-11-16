const fs = require("fs");
const { generateTeamImage } = require("./imageGenerator");
const { generateTeams, generateTeamsByRole } = require("./teamGenerator");
const { AttachmentBuilder } = require("discord.js");

async function handleGenCommand(interaction) {
	try {
		await interaction.reply("🎲 Generating teams...");

		const { blueTeam, redTeam } = await generateTeams(interaction.guildId);
		const imageBuffer = await generateTeamImage(blueTeam, redTeam);
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
}

async function handleGenRoleCommand(interaction) {
	try {
		await interaction.reply("🎲 Generating teams for a specific role...");
		const role = interaction.options.getString("role");

		const { blueTeam, redTeam } = await generateTeamsByRole(role);
		const imageBuffer = await generateTeamImage(blueTeam, redTeam);
		const attachment = new AttachmentBuilder(imageBuffer, { name: "team.png" });

		await interaction.editReply({
			files: [attachment],
			content: `⚔️ Teams for role: ${role}`,
		});
	} catch (error) {
		console.error("❌ Bot error:", error);
		if (interaction.deferred || interaction.replied) {
			await interaction.editReply(`❌ Error: ${error.message}`);
		} else {
			await interaction.reply(`❌ Error: ${error.message}`);
		}
	}
}

module.exports = { handleGenCommand, handleGenRoleCommand };
