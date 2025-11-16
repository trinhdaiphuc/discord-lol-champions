const { Client, GatewayIntentBits } = require("discord.js");
const cron = require("node-cron");
const { updateChampions } = require("./updateChampions");
const { reloadChampions } = require("./championManager");
const { readConfig } = require("./configManager");

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildVoiceStates,
	],
});

// Cron job to update champions daily
cron.schedule("0 0 * * *", updateChampionJob);

async function updateChampionJob() {
	console.log("Running daily champion update...");
	await updateChampions();
	// Reload config and champions after update
	const config = await readConfig();
	console.log("Config data loaded successfully.");
	console.log("Current version:", config.DRAGON_VERSION);
	reloadChampions();
}

function getClient() {
	return client;
}

module.exports = { getClient, updateChampionJob };
