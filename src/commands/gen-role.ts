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

			const { blueTeam, redTeam } = await teamService.generateTeamsByRole(role!, {
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
				content: `⚔️ Teams for role: ${role} (${guildConfig.poolSize} per side) • Theme: ${configuredThemeName} • Using: ${theme.name}`,
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
