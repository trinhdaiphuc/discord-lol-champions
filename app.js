const { getClient, updateChampionJob } = require("./botManager");
const { registerEventHandlers } = require("./eventHandler");
require("dotenv").config();

async function start() {
	await updateChampionJob();
	const client = getClient();
	registerEventHandlers(client);

	client.login(process.env.BOT_TOKEN);
}

module.exports = { start };
