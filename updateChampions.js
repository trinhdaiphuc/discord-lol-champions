const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const { readConfig, writeConfig } = require("./configManager");
const { createChecksum, saveChecksum, verifyChecksum } = require("./checksum");

const CHAMPIONS_PATH = path.join(__dirname, "champions.json");
const IMAGES_PATH = path.join(__dirname, "images");

async function getLatestVersion() {
	try {
		const response = await axios.get("https://ddragon.leagueoflegends.com/api/versions.json");
		return response.data[0];
	} catch (error) {
		console.error("Error fetching latest version:", error);
		return null;
	}
}

async function getChampions(version) {
	try {
		const response = await axios.get(
			`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`,
		);
		return response.data.data;
	} catch (error) {
		console.error(`Error fetching champions for version ${version}:`, error);
		return null;
	}
}

function groupChampionsByRole(champions) {
	const roles = {
		Fighter: [],
		Mage: [],
		Tank: [],
		Marksman: [],
		Assassin: [],
		Support: [],
	};

	for (const champName in champions) {
		const champ = champions[champName];
		champ.tags.forEach((tag) => {
			if (roles[tag]) {
				roles[tag].push(champ.id);
			}
		});
	}
	return roles;
}

async function updateChampionImages(champions, version) {
	console.log("Updating champion images...");
	if (!fs.existsSync(IMAGES_PATH)) {
		await fs.mkdir(IMAGES_PATH);
	}

	for (const championId in champions.data) {
		const champion = champions.data[championId];
		const championImage = champion.image.full;
		const championImageUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championImage}`;
		const imagePath = path.join(IMAGES_PATH, championImage);
		try {
			const response = await axios.get(championImageUrl, { responseType: "arraybuffer" });
			const imageBuffer = Buffer.from(response.data, "binary");
			const checksum = createChecksum(imageBuffer);

			if (!verifyChecksum(championImage, checksum)) {
				await fs.writeFile(imagePath, imageBuffer);
				saveChecksum(championImage, checksum);
				console.log(`Updated ${championImage}`);
			}
		} catch (error) {
			console.error(`Failed to download ${championImage}: ${error.message}`);
		}
	}
}

async function updateChampions() {
	console.log("Checking for new champion data...");
	const config = await readConfig();
	const latestVersion = await getLatestVersion();

	if (!latestVersion) {
		console.log("Could not fetch latest version. Skipping update.");
		return;
	}

	if (latestVersion === config.DRAGON_VERSION) {
		console.log("Champion data is up to date.");
		return;
	}

	console.log(`New version found: ${latestVersion}. Updating champions...`);

	const champions = await getChampions(latestVersion);
	if (!champions) {
		console.log("Could not fetch champions. Skipping update.");
		return;
	}

	const newRoles = groupChampionsByRole(champions);

	config.DRAGON_VERSION = latestVersion;
	config.CHAMPION_ROLES = newRoles;

	await writeConfig(config);

	// Also, update the champions.json file for the bot to use
	try {
		await fs.writeFile(CHAMPIONS_PATH, JSON.stringify(championsData, null, 4));
		console.log("Champions data updated successfully.");
	} catch (error) {
		console.error("Error writing champions.json file:", error);
	}
	await updateChampionImages(championsData, latestVersion);
}

// Run the update function directly if the script is executed from the command line
if (require.main === module) {
	updateChampions();
}

module.exports = { updateChampions };
