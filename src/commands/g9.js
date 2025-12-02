const { SlashCommandBuilder } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder().setName("g9").setDescription("Says good night to the server"),
	async execute(interaction) {
		await interaction.reply("Good night, everyone! 🌙");
	},
};
