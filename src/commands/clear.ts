import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { clearGuildTeamCache } from "../services/teamService.ts";
import type { BotCommand } from "../entities/index.ts";

const command: BotCommand = {
	data: new SlashCommandBuilder()
		.setName("clear")
		.setDescription("Clear all champion cache for this server"),
	async execute(interaction: ChatInputCommandInteraction) {
		try {
			const guildId = interaction.guildId;
			if (!guildId) {
				await interaction.reply("❌ This command can only be used inside a server.");
				return;
			}

			const hadCache = clearGuildTeamCache(guildId);
			await interaction.reply(
				hadCache
					? "✅ Cleared champion cache for this server."
					: "ℹ️ No champion cache found for this server."
			);
		} catch (error) {
			console.error(`❌ Clear command error for ${interaction.guildId}:`, error);
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply(`❌ Error: ${(error as Error).message}`);
			} else {
				await interaction.reply(`❌ Error: ${(error as Error).message}`);
			}
		}
	},
};

export default command;
