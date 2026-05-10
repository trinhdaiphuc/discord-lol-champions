import {
	SlashCommandBuilder,
	AttachmentBuilder,
	type ChatInputCommandInteraction,
} from "discord.js";
import * as teamService from "../services/teamService.ts";
import * as imageService from "../services/imageService.ts";
import { getGuildGenerateConfig } from "../services/channelConfigService.ts";
import { getRoleOnlyAnalysisNotice } from "../services/synergyAnalysisService.ts";
import { getThemeDisplayName, resolveThemeForGenerate } from "../services/themeService.ts";
import type { BotCommand } from "../entities/index.ts";

const command: BotCommand = {
	data: new SlashCommandBuilder()
		.setName("gen-role")
		.setDescription("Generates a random champion team image for a specific role")
		.addStringOption((option) =>
			option
				.setName("role")
				.setDescription("The role to generate champions for")
				.setRequired(true)
				.addChoices(
					{ name: "Fighter", value: "Fighter" },
					{ name: "Mage", value: "Mage" },
					{ name: "Tank", value: "Tank" },
					{ name: "Marksman", value: "Marksman" },
					{ name: "Assassin", value: "Assassin" },
					{ name: "Support", value: "Support" }
				)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		try {
			await interaction.reply("🎲 Generating teams for a specific role...");
			const role = interaction.options.getString("role");
			const guildId = interaction.guildId;
			if (!guildId) {
				await interaction.editReply("❌ This command can only be used inside a server.");
				return;
			}
			const guildConfig = await getGuildGenerateConfig(guildId);
			const theme = await resolveThemeForGenerate(guildConfig.themeId);
			const configuredThemeName = await getThemeDisplayName(guildConfig.themeId);

			const teamResult = await teamService.generateTeamsByRole(role!, {
				poolSize: guildConfig.poolSize,
			});
			const imageBuffer = await imageService.generateTeamImage(
				teamResult.blueTeam,
				teamResult.redTeam,
				theme,
				guildConfig.poolSize
			);
			const attachment = new AttachmentBuilder(imageBuffer, { name: "team.jpg" });

			await interaction.editReply({
				files: [attachment],
				content: [
					`⚔️ **Đội theo role ${role}** (${guildConfig.poolSize} tướng mỗi bên) • Theme: ${configuredThemeName} • Đang dùng: ${theme.name}`,
					getRoleOnlyAnalysisNotice(role!, guildConfig.poolSize),
				].join("\n"),
			});
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
