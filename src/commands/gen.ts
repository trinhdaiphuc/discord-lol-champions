import { SlashCommandBuilder, AttachmentBuilder, type ChatInputCommandInteraction } from "discord.js";
import * as teamService from "../services/teamService.ts";
import * as imageService from "../services/imageService.ts";
import type { BotCommand } from "../types/index.ts";

const command: BotCommand = {
	data: new SlashCommandBuilder()
		.setName("gen")
		.setDescription("Generates a random champion team image"),
	async execute(interaction: ChatInputCommandInteraction) {
		try {
			await interaction.reply(`🎲 Generating teams...`);

			const { blueTeam, redTeam } = await teamService.generateTeams(interaction.guildId!);
			const imageBuffer = await imageService.generateTeamImage(blueTeam, redTeam);
			const attachment = new AttachmentBuilder(imageBuffer, { name: "team.jpg" });

			await interaction.editReply({
				files: [attachment],
				content: `⚔️ ARAM Teams (6 roles × 4 champions)`,
			});
		} catch (error) {
			console.error(`❌ Bot error for ${interaction.guildId}:`, error);
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply(`❌ Error: ${(error as Error).message}`);
			} else {
				await interaction.reply(`❌ Error: ${(error as Error).message}`);
			}
		}
	},
};

export default command;
