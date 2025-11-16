const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const { readConfig, writeConfig } = require("../core/config");
const championRepository = require("../data/championRepository");
const championService = require("../services/championService");
const toAwait = require("../core/promise");

const IMAGES_PATH = path.join(__dirname, "..", "..", "images");

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
	try {
		await fs.mkdir(IMAGES_PATH, { recursive: true });
	} catch (error) {
		// Ignore if the directory already exists
	}

	let totalSuccess = 0;
	let totalFailed = 0;

	for (const championId in champions) {
		const champion = champions[championId];
		const championImage = champion.image.full;
		const championImageUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championImage}`;
		const imagePath = path.join(IMAGES_PATH, championImage);
		try {
			const response = await axios.get(championImageUrl, { responseType: "arraybuffer" });
			const imageBuffer = Buffer.from(response.data, "binary");
			const checksum = championRepository.createChecksum(imageBuffer);

			if (!(await championRepository.verifyChecksum(championImage, checksum))) {
				await fs.writeFile(imagePath, imageBuffer);
				await championRepository.saveChecksum(championImage, checksum);
				console.log(`Updated ${championImage}`);
				totalSuccess++;
			}
		} catch (error) {
			console.error(`Failed to download ${championImage}: ${error.message}`);
			totalFailed++;
		}
	}
	console.log(`Champion images updated. Success: ${totalSuccess}, Failed: ${totalFailed}`);
}

async function updateChampions() {
	console.log("Checking for new champion data...");
	const [config] = await toAwait(readConfig());
	const latestVersion = await getLatestVersion();

	if (!latestVersion) {
		console.log("Could not fetch latest version. Skipping update.");
		return;
	}

	if (latestVersion === config?.DRAGON_VERSION) {
		console.log("Champion data is up to date.");
		return;
	}

	console.log(`New version found: ${latestVersion}. Updating champions...`);

	const champions = await getChampions(latestVersion);
	if (!champions) {
		console.log("Could not fetch champions. Skipping update.");
		return;
	}

	console.log(`Get champions successfully. ${Object.keys(champions).length} champions found.`);

	const newRoles = groupChampionsByRole(champions);

	const newConfig = {
		...config,
		DRAGON_VERSION: latestVersion,
		CHAMPION_ROLES: newRoles,
	};

	await writeConfig(newConfig);

	// Also, update the champions.json file for the bot to use
	try {
		console.log("Writing champions.json file...");
		await championRepository.writeChampions(champions);
		console.log("Champions data updated successfully.");
	} catch (error) {
		console.error("Error writing champions.json file:", error);
	}

	await championService.reloadChampions();
	await updateChampionImages(champions, latestVersion);
}

// Run the update function directly if the script is executed from the command line
if (require.main === module) {
	updateChampions();
}

module.exports = { updateChampions };
