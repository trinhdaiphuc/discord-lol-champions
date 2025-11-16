const fs = require("node:fs");
const path = require("node:path");
const { Collection } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { createClient } = require("./src/core/bot");
const { createServer } = require("./src/core/server");
const { readConfig } = require("./src/core/config");
const championService = require("./src/services/championService");
require("dotenv").config();

async function main() {
	// Load config and champions
	const config = await readConfig();
	await championService.loadChampions();
	console.log("✅ Champion data loaded.");

	// Create Discord client
	const client = createClient();
	client.commands = new Collection();

	// Load commands
	const commandsPath = path.join(__dirname, "src", "commands");
	const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		client.commands.set(command.data.name, command);
	}
	console.log(`✅ Loaded ${client.commands.size} commands.`);

	// Load events
	const eventsPath = path.join(__dirname, "src", "events");
	const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
		} else {
			client.on(event.name, (...args) => event.execute(...args));
		}
	}
	console.log(`✅ Loaded ${eventFiles.length} events.`);

	// Command registration
	if (process.argv.includes("--register-commands")) {
		const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN);
		try {
			console.log("Started refreshing application (/) commands.");
			await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
				body: client.commands.map((c) => c.data.toJSON()),
			});
			console.log("Successfully reloaded application (/) commands.");
		} catch (error) {
			console.error(error);
		}
		return;
	}

	// Login to Discord
	client.login(process.env.BOT_TOKEN);

	// Start server
	const app = createServer();
	const port = process.env.PORT || 3000;
	app.listen(port, () => {
		console.log(`✅ Server listening at http://localhost:${port}`);
	});
}

main().catch(console.error);
