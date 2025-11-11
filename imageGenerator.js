const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const { readConfig } = require("./configManager");
const championsData = require("./champions.json");

// Create a mapping from champion ID to champion name
const championIdToName = {};
for (const key in championsData) {
	const champion = championsData[key];
	championIdToName[champion.id] = champion.name;
}

async function downloadImage(url, filepath) {
	try {
		const response = await axios.get(url, {
			responseType: "arraybuffer",
			timeout: 5000,
		});
		if (!response.data) {
			console.error(`❌ Download failed for ${url}: Response data is empty.`);
			return null;
		}
		fs.writeFileSync(filepath, response.data);
		return filepath;
	} catch (error) {
		console.error(`❌ Download failed for ${url}:`, error.message);
		return null;
	}
}

function drawPlaceholder(ctx, x, y, size, champName) {
	ctx.fillStyle = "#888888";
	ctx.fillRect(x, y, size, size);

	ctx.strokeStyle = "#FFFFFF";
	ctx.lineWidth = 2;
	ctx.strokeRect(x, y, size, size);

	ctx.fillStyle = "#FFFFFF";
	ctx.font = "10px Arial";
	ctx.textAlign = "center";
	ctx.fillText("?", x + size / 2, y + size / 2 + 5);
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
	const words = text.split(" ");
	let line = "";
	let testLine;
	let metrics;
	let testWidth;

	for (let n = 0; n < words.length; n++) {
		testLine = line + words[n] + " ";
		metrics = context.measureText(testLine);
		testWidth = metrics.width;
		if (testWidth > maxWidth && n > 0) {
			context.fillText(line, x, y);
			line = words[n] + " ";
			y += lineHeight;
		} else {
			line = testLine;
		}
	}
	context.fillText(line, x, y);
}

async function drawTeamOnCanvas(team, teamName, isBlueTeam) {
	try {
		const config = await readConfig();
		const canvasWidth = 800;
		const canvasHeight = 800;
		const canvas = createCanvas(canvasWidth, canvasHeight);
		const ctx = canvas.getContext("2d");

		const gradient = ctx.createRadialGradient(
			canvasWidth / 2,
			canvasHeight / 2,
			0,
			canvasWidth / 2,
			canvasHeight / 2,
			canvasHeight / 2,
		);
		if (isBlueTeam) {
			gradient.addColorStop(0, "#0e49afff");
			gradient.addColorStop(1, "#3c79ddff");
		} else {
			gradient.addColorStop(0, "#bc2525ff");
			gradient.addColorStop(1, "#e36b6bff");
		}
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		ctx.strokeStyle = "black";
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "bold 30px Arial";
		ctx.textAlign = "center";
		ctx.fillText(teamName, canvasWidth / 2 - (teamName.length / 2) * 15, 40);

		if (!fs.existsSync(config.CHAMPION_IMAGE_PATH)) {
			fs.mkdirSync(config.CHAMPION_IMAGE_PATH, { recursive: true });
		}

		const champSize = 80;
		const startX = 120;
		const startY = 80;
		const spacingX = 180;
		const spacingY = 120;
		const colsPerRow = 3;

		for (let i = 0; i < team.length; i++) {
			const championId = team[i];
			const championName = championIdToName[championId] || championId;

			const rowIndex = Math.floor(i / colsPerRow);
			const colIndex = i % colsPerRow;

			const x = startX + colIndex * spacingX;
			const y = startY + rowIndex * spacingY;

			const champImagePath = `${config.CHAMPION_IMAGE_PATH}/${championId.replace(/'/g, "")}.png`;

			try {
				if (!fs.existsSync(champImagePath)) {
					const imageUrl = `https://ddragon.leagueoflegends.com/cdn/${config.DRAGON_VERSION}/img/champion/${championId}.png`;

					const downloaded = await downloadImage(imageUrl, champImagePath);

					if (!downloaded) {
						drawPlaceholder(ctx, x, y, champSize, championName);
						continue;
					}
				}

				const image = await loadImage(champImagePath);

				if (!image) {
					drawPlaceholder(ctx, x, y, champSize, championName);
					continue;
				}

				ctx.drawImage(image, x, y, champSize, champSize);

				ctx.strokeStyle = "#FFFFFF";
				ctx.lineWidth = 2;
				ctx.strokeRect(x, y, champSize, champSize);

				ctx.font = "bold 16px Arial";
				ctx.textAlign = "center";
				ctx.strokeStyle = "black";
				ctx.lineWidth = 3;
				ctx.fillStyle = "#ffffffff";
				wrapText(ctx, championName, x + champSize / 2, y + champSize + 17, champSize, 15);
			} catch (error) {
				console.error(`❌ Error with ${championName}:`, error.message);
				drawPlaceholder(ctx, x, y, champSize, championName);
			}
		}

		console.log(`✅ Team canvas created with ${team.length} champions`);
		return canvas;
	} catch (error) {
		console.error("❌ Error in drawTeamOnCanvas:", error);
		throw error;
	}
}

async function generateTeamImage(blueTeam, redTeam) {
	try {
		console.log("🎨 Drawing blue team...");
		const blueCanvas = await drawTeamOnCanvas(blueTeam, "BLUE TEAM", true);

		if (!blueCanvas) {
			throw new Error("Failed to create blue canvas");
		}

		console.log("🎨 Drawing red team...");
		const redCanvas = await drawTeamOnCanvas(redTeam, "RED TEAM", false);

		if (!redCanvas) {
			throw new Error("Failed to create red canvas");
		}

		console.log("📐 Combining...");
		const combinedCanvas = createCanvas(1420, 820);
		const ctx = combinedCanvas.getContext("2d");

		ctx.fillStyle = "#1A202C";
		ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

		ctx.drawImage(blueCanvas, 10, 10);
		ctx.drawImage(redCanvas, 710, 10);

		console.log("💾 Saving...");
		const buffer = combinedCanvas.toBuffer("image/png");
		console.log("✅ Team image generated");
		return buffer;
	} catch (error) {
		console.error("❌ Error in generateTeamImage:", error);
		throw error;
	}
}

module.exports = { generateTeamImage };
