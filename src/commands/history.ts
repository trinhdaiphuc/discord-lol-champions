import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getRecentCompAnalysisHistory } from "../services/compAnalysisHistoryService.ts";
import type { BotCommand } from "../entities/index.ts";

function formatTimestamp(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
	if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
	if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
	return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
}

function formatScores(scores: Record<string, { score: number; label: string }>): string {
	return Object.entries(scores)
		.map(([key, value]) => `**${key}**: ${value.score}/100 (${value.label})`)
		.join("\n");
}

const command: BotCommand = {
	data: new SlashCommandBuilder()
		.setName("history")
		.setDescription("View recent team composition analyses")
		.addIntegerOption((option) =>
			option
				.setName("limit")
				.setDescription("Number of records to retrieve (1-20)")
				.setMinValue(1)
				.setMaxValue(20)
				.setRequired(false)
		),

	async execute(interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply();

		const guildId = interaction.guildId;
		if (!guildId) {
			await interaction.editReply("This command can only be used in a server.");
			return;
		}

		const limit = interaction.options.getInteger("limit") ?? 5;

		try {
			const records = await getRecentCompAnalysisHistory(guildId, limit);

			if (records.length === 0) {
				await interaction.editReply("No team analyses found for this server.");
				return;
			}

			const embeds: EmbedBuilder[] = [];

			for (const record of records) {
				const embed = new EmbedBuilder()
					.setColor(0x5865f2)
					.setTitle(`📊 Team Analysis #${record.id}`)
					.addFields(
						{
							name: "Mode",
							value: record.generationMode,
							inline: true,
						},
						{
							name: "Pool Size",
							value: record.poolSize.toString(),
							inline: true,
						},
						{
							name: "Created",
							value: formatTimestamp(record.createdAt),
							inline: true,
						},
						{
							name: "🔵 Blue Team",
							value: record.blueTeam.join(", "),
							inline: false,
						},
						{
							name: "🔵 Blue Scores",
							value: formatScores(record.blueAnalysis.scores),
							inline: true,
						},
						{
							name: "🔴 Red Team",
							value: record.redTeam.join(", "),
							inline: false,
						},
						{
							name: "🔴 Red Scores",
							value: formatScores(record.redAnalysis.scores),
							inline: true,
						},
						{
							name: "Summary",
							value: record.summaryText.slice(0, 200) + (record.summaryText.length > 200 ? "..." : ""),
							inline: false,
						}
					)
					.setFooter({ text: `Signature: ${record.compositionSignature.slice(0, 16)}...` })
					.setTimestamp(record.createdAt);

				embeds.push(embed);
			}

			// Discord allows max 10 embeds per message
			const embedsToSend = embeds.slice(0, 10);
			await interaction.editReply({
				content: `Showing ${embedsToSend.length} of ${records.length} recent team analyses:`,
				embeds: embedsToSend,
			});
		} catch (error) {
			console.error("Error fetching history:", error);
			await interaction.editReply("An error occurred while fetching team analysis history.");
		}
	},
};

export default command;
