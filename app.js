const { getClient, updateChampionJob } = require("./botManager");
const { registerEventHandlers } = require("./eventHandler");
const { downloadChampionImages } = require("./championLoader");
require("dotenv").config();

async function start() {
	await updateChampionJob();
	const client = getClient();
	client.login(process.env.BOT_TOKEN);
	registerEventHandlers(client);
}

module.exports = { start };
