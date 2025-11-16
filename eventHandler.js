const { handleGenCommand, handleGenRoleCommand } = require("./commandHandler");
const { SlashCommandBuilder } = require("discord.js");

function registerEventHandlers(client) {
	client.on("clientReady", () => {
		console.log(`✅ Bot is online as ${client.user.tag}!`);
		const ping = new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!");

		const echo = new SlashCommandBuilder()
			.setName("echo")
			.setDescription("Replies with your input")
			.addStringOption((option) =>
				option.setName("input").setDescription("The input to echo back").setRequired(true),
			);

		const gen = new SlashCommandBuilder()
			.setName("gen")
			.setDescription("Generates a random champion team image");

		const genRole = new SlashCommandBuilder()
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
						{ name: "Support", value: "Support" },
					),
			);

		client.application.commands.create(ping);
		client.application.commands.create(echo);
		client.application.commands.create(gen);
		client.application.commands.create(genRole);
	});

	client.on("interactionCreate", async (interaction) => {
		if (!interaction.isChatInputCommand()) return;

		switch (interaction.commandName) {
			case "ping":
				await interaction.reply("Pong!");
				break;
			case "echo":
				const input = interaction.options.getString("input");
				await interaction.reply(`You said: ${input}`);
				break;
			case "gen":
				await handleGenCommand(interaction);
				break;
			case "gen-role":
				await handleGenRoleCommand(interaction);
				break;
			default:
				await interaction.reply("Unknown command!");
		}
	});
}

module.exports = { registerEventHandlers };
