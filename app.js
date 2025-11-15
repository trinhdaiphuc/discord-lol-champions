const { getClient, updateChampionJob } = require("./botManager");
const { registerEventHandlers } = require("./eventHandler");
const { downloadChampionImages } = require("./championLoader");
require("dotenv").config();

async function start() {
	await updateChampionJob();
	const client = getClient();
	downloadChampionImages();
	registerEventHandlers(client);

	client.login(process.env.BOT_TOKEN);
}

module.exports = { start };
