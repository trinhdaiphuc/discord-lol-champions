import {
	SlashCommandBuilder,
	EmbedBuilder,
	ChannelType,
	type ChatInputCommandInteraction,
	type VoiceChannel,
} from "discord.js";
import * as teamService from "../services/teamService.ts";
import type { BotCommand } from "../types/index.ts";

const command: BotCommand = {
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
	async execute(interaction: ChatInputCommandInteraction) {
		try {
			const channel = interaction.options.getChannel("channel") as VoiceChannel;
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
				await interaction.editReply(`❌ Error: ${(error as Error).message}`);
			} else {
				await interaction.reply(`❌ Error: ${(error as Error).message}`);
			}
		}
	},
};

export default command;

