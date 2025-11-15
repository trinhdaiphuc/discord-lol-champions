const fs = require("fs").promises;
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "config.json");

async function readConfig() {
	try {
		const configData = await fs.readFile(CONFIG_PATH, "utf-8");
		return JSON.parse(configData);
	} catch (error) {
		console.error("Error reading config file:", error);
		// Fallback to environment variables or default values if config is missing
		return {
			DRAGON_VERSION: process.env.DRAGON_VERSION || "15.22.1",
			CHAMPION_ROLES: {},
			CHAMPION_IMAGE_PATH: "./images",
		};
	}
}

async function writeConfig(config) {
	try {
		await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 4));
	} catch (error) {
		console.error("Error writing config file:", error);
	}
}

module.exports = { readConfig, writeConfig };
