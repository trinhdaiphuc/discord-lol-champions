import {
	SlashCommandBuilder,
	AttachmentBuilder,
	type ChatInputCommandInteraction,
} from "discord.js";
import * as teamService from "../services/teamService.ts";
import * as imageService from "../services/imageService.ts";
import { getGuildGenerateConfig } from "../services/channelConfigService.ts";
import { getThemeDisplayName, resolveThemeForGenerate } from "../services/themeService.ts";
import * as championNameService from "../services/championNameService.ts";
import type { BotCommand } from "../types/index.ts";

const command: BotCommand = {
	data: new SlashCommandBuilder()
		.setName("gen-exclude")
		.setDescription("Generates a champion team image while excluding specified champions")
		.addStringOption((option) =>
			option
				.setName("exclude")
				.setDescription("Comma-separated list of champion names to exclude (e.g. ahri, garen)")
				.setRequired(false)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		try {
			await interaction.reply("🎲 Generating teams with exclusions...");
			const guildId = interaction.guildId;
			if (!guildId) {
				await interaction.editReply("\u274c This command can only be used inside a server.");
				return;
			}

			const guildConfig = await getGuildGenerateConfig(guildId);
			const theme = await resolveThemeForGenerate(guildConfig.themeId);
			const configuredThemeName = await getThemeDisplayName(guildConfig.themeId);

			// parse exclude option
			const excludeRaw = interaction.options.getString("exclude");
			let exclusions: string[] = [];
			let unknownExclusions: string[] = [];
			if (excludeRaw && excludeRaw.trim().length > 0) {
				const parts = excludeRaw
					.split(/[,\n]/)
					.map((p) => p.trim())
					.filter((p) => p.length > 0);
				if (parts.length > 0) {
					const mapped = championNameService.mapNamesToChampionIds(parts);
					exclusions = mapped.matched;
					unknownExclusions = mapped.unknown;
				}
			}

			let teams;
			if (exclusions.length > 0) {
				teams = await teamService.generateTeamsWithExclusions(guildId, exclusions, {
					poolSize: guildConfig.poolSize,
				});
			} else {
				teams = await teamService.generateTeams(guildId, {
					poolSize: guildConfig.poolSize,
				});
			}

			const imageBuffer = await imageService.generateTeamImage(
				teams.blueTeam,
				teams.redTeam,
				theme,
				guildConfig.poolSize
			);
			const attachment = new AttachmentBuilder(imageBuffer, { name: "team.jpg" });

			let content = `⚔️ ARAM Teams (6 roles × ${guildConfig.poolSize} champions) • Theme: ${configuredThemeName} • Using: ${theme.name}`;
			if (exclusions.length > 0) {
				content += `\n🔕 Excluded: ${exclusions.join(", ")}`;
			}
			if (unknownExclusions.length > 0) {
				content += `\n❓ Unknown exclusions: ${unknownExclusions.join(", ")}`;
			}

			await interaction.editReply({ files: [attachment], content });
		} catch (error) {
			console.error("Bot error in gen-exclude:", error);
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply(`\u274c Error: ${(error as Error).message}`);
			} else {
				await interaction.reply(`\u274c Error: ${(error as Error).message}`);
			}
		}
	},
};

export default command;

