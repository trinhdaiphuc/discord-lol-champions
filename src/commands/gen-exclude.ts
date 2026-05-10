import {
	SlashCommandBuilder,
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	type AutocompleteInteraction,
} from "discord.js";
import * as teamService from "../services/teamService.ts";
import * as imageService from "../services/imageService.ts";
import { getGuildGenerateConfig } from "../services/channelConfigService.ts";
import { analyzeAndStoreGeneratedTeams } from "../services/compAnalysisHistoryService.ts";
import { formatDiscordCompactSummary } from "../services/synergyAnalysisService.ts";
import { getThemeDisplayName, resolveThemeForGenerate } from "../services/themeService.ts";
import * as championNameService from "../services/championNameService.ts";
import * as championService from "../services/championService.ts";
import type { BotCommand } from "../entities/index.ts";

// Normalize string for fuzzy matching
function normalizeString(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.trim();
}

// Get champion suggestions based on user input
function getChampionSuggestions(query: string): Array<{ name: string; value: string }> {
	try {
		const champions = championService.getChampions();
		const normalizedQuery = normalizeString(query);

		if (!normalizedQuery) {
			// Return first 25 champions if no query
			return Object.keys(champions)
				.sort()
				.slice(0, 25)
				.map((id) => ({
					name: champions[id]?.name || id,
					value: id,
				}));
		}

		// Filter champions by name match
		const matches = Object.keys(champions)
			.filter((id) => {
				const champion = champions[id];
				const championName = normalizeString(champion?.name || id);
				const championId = normalizeString(id);
				return championName.includes(normalizedQuery) || championId.includes(normalizedQuery);
			})
			.sort()
			.slice(0, 25) // Discord limit
			.map((id) => ({
				name: champions[id]?.name || id,
				value: id,
			}));

		return matches;
	} catch {
		return [];
	}
}

const command: BotCommand = {
	data: new SlashCommandBuilder()
		.setName("gen-exclude")
		.setDescription("Generates a champion team image while excluding specified champions")
		.addStringOption((option) =>
			option
				.setName("champion1")
				.setDescription("Type to search and select champion to exclude")
				.setAutocomplete(true)
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName("champion2")
				.setDescription("Type to search and select champion to exclude")
				.setAutocomplete(true)
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName("champion3")
				.setDescription("Type to search and select champion to exclude")
				.setAutocomplete(true)
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName("champion4")
				.setDescription("Type to search and select champion to exclude")
				.setAutocomplete(true)
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName("champion5")
				.setDescription("Type to search and select champion to exclude")
				.setAutocomplete(true)
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName("exclude")
				.setDescription("Comma-separated list of champion names to exclude (e.g. ahri, garen)")
				.setRequired(false)
		),

	async autocomplete(interaction: AutocompleteInteraction) {
		try {
			const focusedOption = interaction.options.getFocused(true);

			// Only handle autocomplete for champion options
			if (focusedOption.name.startsWith("champion")) {
				const suggestions = getChampionSuggestions(focusedOption.value);
				await interaction.respond(suggestions);
			}
		} catch (error) {
			console.error("Autocomplete error:", error);
			await interaction.respond([]);
		}
	},
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
					exclusions.push(...mapped.matched);
					unknownExclusions.push(...mapped.unknown);
				}
			}

			// Collect from champion selection options (champion1, champion2, etc.)
			for (let i = 1; i <= 5; i++) {
				const championId = interaction.options.getString(`champion${i}`);
				if (championId) {
					exclusions.push(championId);
				}
			}

			// Remove duplicates
			exclusions = [...new Set(exclusions)];

			let teamResult;
			if (exclusions.length > 0) {
				teamResult = await teamService.generateTeamsWithExclusions(guildId, exclusions, {
					poolSize: guildConfig.poolSize,
					historyWindow: guildConfig.historyWindow,
				});
			} else {
				teamResult = await teamService.generateTeams(guildId, {
					poolSize: guildConfig.poolSize,
					historyWindow: guildConfig.historyWindow,
				});
			}
			const { analysis } = await analyzeAndStoreGeneratedTeams(guildId, teamResult);

			const imageBuffer = await imageService.generateTeamImage(
				teamResult.blueTeam,
				teamResult.redTeam,
				theme,
				guildConfig.poolSize
			);
			const attachment = new AttachmentBuilder(imageBuffer, { name: "team.jpg" });

			let content = [
				`⚔️ **Đội ARAM** (6 role × ${guildConfig.poolSize} tướng) • Theme: ${configuredThemeName} • Đang dùng: ${theme.name}`,
				formatDiscordCompactSummary(analysis.blue, analysis.red),
			].join("\n");
			if (exclusions.length > 0) {
				content += `\n🔕 **Loại trừ:** ${exclusions.join(", ")}`;
			}
			if (unknownExclusions.length > 0) {
				content += `\n❓ **Không nhận diện được:** ${unknownExclusions.join(", ")}`;
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
