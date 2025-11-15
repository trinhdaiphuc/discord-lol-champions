const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createChecksum, saveChecksum, verifyChecksum } = require("./checksum");

let champions;

function loadChampions() {
	try {
		champions = require("./champions.json");
	} catch (error) {
		console.error(
			"Could not load champions.json. Please run the update script manually once.",
			error,
		);
		// Create an empty champions.json file if it doesn't exist
		fs.writeFileSync("champions.json", JSON.stringify({}, null, 4));
		champions = {};
	}
	return champions;
}

async function downloadChampionImages() {
	const champions = loadChampions();
	const imageDir = path.join(__dirname, "images");
	if (!fs.existsSync(imageDir)) {
		fs.mkdirSync(imageDir);
	}

	for (const championId in champions) {
		const champion = champions[championId];
		const championImage = champion.image.full;
		const championImageUrl = `https://ddragon.leagueoflegends.com/cdn/${champion.version}/img/champion/${championImage}`;
		const imagePath = path.join(imageDir, championImage);
		try {
			const response = await axios.get(championImageUrl, { responseType: "arraybuffer" });
			const imageBuffer = Buffer.from(response.data, "binary");
			const checksum = createChecksum(imageBuffer);

			if (!verifyChecksum(championImage, checksum)) {
				fs.writeFileSync(imagePath, imageBuffer);
				saveChecksum(championImage, checksum);
				console.log(`Downloaded and saved ${championImage}`);
			}
		} catch (error) {
			console.error(`Failed to download ${championImage}: ${error.message}`);
		}
	}
}

module.exports = { loadChampions, downloadChampionImages };
