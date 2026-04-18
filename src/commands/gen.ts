import {
	SlashCommandBuilder,
	AttachmentBuilder,
	type ChatInputCommandInteraction,
} from "discord.js";
import * as teamService from "../services/teamService.ts";
import * as imageService from "../services/imageService.ts";
import { getGuildGenerateConfig } from "../services/channelConfigService.ts";
import { getThemeDisplayName, resolveThemeForGenerate } from "../services/themeService.ts";
import type { BotCommand } from "../types/index.ts";

const command: BotCommand = {
	data: new SlashCommandBuilder()
		.setName("gen")
		.setDescription("Generates a random champion team image"),
	async execute(interaction: ChatInputCommandInteraction) {
		try {
			await interaction.reply(`🎲 Generating teams...`);
			const guildId = interaction.guildId;
			if (!guildId) {
				await interaction.editReply("❌ This command can only be used inside a server.");
				return;
			}
			const guildConfig = await getGuildGenerateConfig(guildId);
			const theme = await resolveThemeForGenerate(guildConfig.themeId);
			const configuredThemeName = await getThemeDisplayName(guildConfig.themeId);

			const { blueTeam, redTeam } = await teamService.generateTeams(guildId, {
				poolSize: guildConfig.poolSize,
			});
			const imageBuffer = await imageService.generateTeamImage(
				blueTeam,
				redTeam,
				theme,
				guildConfig.poolSize
			);
			const attachment = new AttachmentBuilder(imageBuffer, { name: "team.jpg" });

			await interaction.editReply({
				files: [attachment],
				content: `⚔️ ARAM Teams (6 roles × ${guildConfig.poolSize} champions) • Theme: ${configuredThemeName} • Using: ${theme.name}`,
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
