const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const teamService = require("../services/teamService");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("random-team")
		.setDescription("Generates random teams from a voice channel")
		.addChannelOption((option) =>
			option
				.setName("channel")
				.setDescription("The voice channel to get members from")
				.setRequired(true)
				.addChannelTypes(ChannelType.GuildVoice)
		),
	authorizedRoles: ["Admin", "Moderator"],
	async execute(interaction) {
		try {
			const channel = interaction.options.getChannel("channel");
			const members = channel.members.map((member) => member.displayName);

			const { teamA, teamB } = teamService.createRandomTeams(members);

			const embed = new EmbedBuilder()
				.setTitle(`⚔️ Random Teams from ${channel.name}`)
				.addFields(
					{ name: "Team A", value: teamA.join("\n"), inline: true },
					{ name: "Team B", value: teamB.join("\n"), inline: true }
				)
				.setColor("#0099ff");

			await interaction.reply({ embeds: [embed] });
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
