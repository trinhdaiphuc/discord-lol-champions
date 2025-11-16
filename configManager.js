const fs = require("fs").promises;
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "config.json");

async function readConfig() {
	const configData = await fs.readFile(CONFIG_PATH, "utf-8");
	return JSON.parse(configData);
}

async function writeConfig(config) {
	try {
		await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 4));
	} catch (error) {
		console.error("Error writing config file:", error);
	}
}

module.exports = { readConfig, writeConfig };
