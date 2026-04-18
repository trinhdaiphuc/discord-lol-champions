import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import {
	getGuildGenerateConfig,
	reloadGuildGenerateConfig,
	setGuildGenerateConfig,
} from "../services/channelConfigService.ts";
import {
	getThemeById,
	getThemeDisplayName,
	getThemeChoicesForCommandSync,
	listThemeManifestItems,
	RANDOM_THEME_ID,
	RANDOM_THEME_NAME,
} from "../services/themeService.ts";
import type { BotCommand } from "../types/index.ts";

const themeChoices = getThemeChoicesForCommandSync();

const command: BotCommand = {
	data: new SlashCommandBuilder()
		.setName("config")
		.setDescription("Configure champion generation for this server")
		.addSubcommand((subcommand) =>
			subcommand.setName("view").setDescription("Show current server configuration")
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("pool")
				.setDescription("Set champions per role per side (3-6)")
				.addIntegerOption((option) =>
					option
						.setName("size")
						.setDescription("Champions per role for each side")
						.setRequired(true)
						.addChoices(
							{ name: "3 per side", value: 3 },
							{ name: "4 per side (default)", value: 4 },
							{ name: "5 per side", value: 5 },
							{ name: "6 per side", value: 6 }
						)
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("theme")
				.setDescription("Set image theme for this server")
				.addStringOption((option) => {
					const withChoices = option.setName("name").setDescription("Theme name").setRequired(true);
					for (const choice of themeChoices) {
						withChoices.addChoices({ name: choice.name, value: choice.value });
					}
					return withChoices;
				})
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("reload")
				.setDescription("Reload this server config from persistent storage")
		),
	async execute(interaction: ChatInputCommandInteraction) {
		try {
			const guildId = interaction.guildId;
			if (!guildId) {
				await interaction.reply("❌ This command can only be used inside a server.");
				return;
			}
			const subcommand = interaction.options.getSubcommand();

			if (subcommand === "view") {
				const config = await getGuildGenerateConfig(guildId);
				const themeName = await getThemeDisplayName(config.themeId);
				const allThemes = await listThemeManifestItems();
				await interaction.reply(
					`⚙️ Server config\n- Pool size: ${config.poolSize}\n- Theme: ${themeName}\n- Available themes: ${[RANDOM_THEME_NAME, ...allThemes.map((item) => item.name)].join(", ")}`
				);
				return;
			}

			if (subcommand === "pool") {
				const poolSize = interaction.options.getInteger("size", true) as 3 | 4 | 5 | 6;
				const updated = await setGuildGenerateConfig(guildId, { poolSize });
				const themeName = await getThemeDisplayName(updated.themeId);
				await interaction.reply(
					`✅ Updated server config\n- Pool size: ${updated.poolSize}\n- Theme: ${themeName}`
				);
				return;
			}

			if (subcommand === "theme") {
				const themeId = interaction.options.getString("name", true);
				if (themeId !== RANDOM_THEME_ID && !(await getThemeById(themeId))) {
					throw new Error(`Invalid theme id: ${themeId}`);
				}
				const updated = await setGuildGenerateConfig(guildId, { themeId });
				const themeName = await getThemeDisplayName(updated.themeId);
				await interaction.reply(
					`✅ Updated server config\n- Pool size: ${updated.poolSize}\n- Theme: ${themeName}`
				);
				return;
			}

			if (subcommand === "reload") {
				const reloaded = await reloadGuildGenerateConfig(guildId);
				const themeName = await getThemeDisplayName(reloaded.themeId);
				await interaction.reply(
					`🔄 Reloaded config for this server\n- Pool size: ${reloaded.poolSize}\n- Theme: ${themeName}`
				);
				return;
			}

			await interaction.reply("Unsupported config subcommand");
		} catch (error) {
			console.error("❌ Config command error:", error);
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply(`❌ Error: ${(error as Error).message}`);
			} else {
				await interaction.reply(`❌ Error: ${(error as Error).message}`);
			}
		}
	},
};

export default command;
