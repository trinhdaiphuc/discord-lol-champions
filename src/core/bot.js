const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");
const { updateChampions } = require("../scripts/updateChampions");
const championService = require("../services/championService");
const { readConfig } = require("./config");

function createClient() {
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildVoiceStates,
		],
	});

	// Cron job to update champions daily
	cron.schedule("0 0 * * *", async () => {
		console.log("Running daily champion update...");
		await updateChampions();
		// Reload config and champions after update
		const config = await readConfig();
		console.log("Config data loaded successfully.");
		console.log("Current version:", config.DRAGON_VERSION);
		await championService.reloadChampions();
	});

	return client;
}

module.exports = { createClient };
