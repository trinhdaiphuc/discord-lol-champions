const { createCanvas, loadImage } = require("canvas");
const fs = require("fs").promises;
const path = require("path");
const championService = require("./championService");

const imageCache = new Map();
const imagesDir = path.join(__dirname, "..", "..", "images");

async function getChampionImage(championImage) {
	if (imageCache.has(championImage)) {
		return imageCache.get(championImage);
	}

	const imagePath = path.join(imagesDir, championImage);
	try {
		const imageBuffer = await fs.readFile(imagePath);
		imageCache.set(championImage, imageBuffer);
		return imageBuffer;
	} catch (error) {
		console.error(`Failed to read image ${championImage}: ${error.message}`);
		return null;
	}
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
	ctx.lineTo(x, y + radius);
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
}

function drawPlaceholder(ctx, x, y, size, champName) {
	ctx.save();
	drawRoundedRect(ctx, x, y, size, size, 15);
	ctx.clip();

	ctx.fillStyle = "#2d3748"; // Dark gray
	ctx.fillRect(x, y, size, size);

	ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
	ctx.lineWidth = 2;
	ctx.stroke();

	ctx.fillStyle = "#e2e8f0";
	ctx.font = "bold 40px Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("?", x + size / 2, y + size / 2);
	ctx.restore();
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
		const championsData = championService.getChampions();
		const canvasWidth = 800;
		
		const colsPerRow = 3;
		const rows = Math.ceil(team.length / colsPerRow);
		const startY = 120;
		const spacingY = 200; // Increased spacing
		// Calculate required height: startY + (rows-1)*spacingY + cardHeight (approx 180) + bottomPadding
		const minHeight = 900;
		const calculatedHeight = startY + (rows > 0 ? (rows - 1) * spacingY : 0) + 250;
		const canvasHeight = Math.max(minHeight, calculatedHeight);

		const canvas = createCanvas(canvasWidth, canvasHeight);
		const ctx = canvas.getContext("2d");

		// Liquid Glass Background
		const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
		if (isBlueTeam) {
			gradient.addColorStop(0, "rgba(29, 78, 216, 0.2)"); // Blue-700 low opacity
			gradient.addColorStop(1, "rgba(30, 58, 138, 0.4)"); // Blue-900 med opacity
		} else {
			gradient.addColorStop(0, "rgba(185, 28, 28, 0.2)"); // Red-700 low opacity
			gradient.addColorStop(1, "rgba(127, 29, 29, 0.4)"); // Red-900 med opacity
		}
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		// Glass shine effect
		const shine = ctx.createLinearGradient(0, 0, canvasWidth, 0);
		shine.addColorStop(0, "rgba(255, 255, 255, 0)");
		shine.addColorStop(0.5, "rgba(255, 255, 255, 0.05)");
		shine.addColorStop(1, "rgba(255, 255, 255, 0)");
		ctx.fillStyle = shine;
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		// Team Name
		ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
		ctx.shadowBlur = 10;
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "bold 40px Arial";
		ctx.textAlign = "center";
		ctx.fillText(teamName, canvasWidth / 2, 60);
		ctx.shadowBlur = 0;

		const champSize = 100;
		// Center the grid: (800 - (3 cols * 100 width + 2 spaces * 200 pitch? No))
		// Grid logic: x = startX + col * spacingX.
		// Col 0: startX. Col 1: startX + 200. Col 2: startX + 400.
		// Width covered: startX to startX + 400 + 100 = startX + 500.
		// Content width = 500.
		// Margin = (800 - 500) / 2 = 150.
		const startX = 150; 
		const spacingX = 200;

		for (let i = 0; i < team.length; i++) {
			const championId = team[i];
			const championName = championsData[championId]?.name || championId;
			const championImageFile = `${championId}.png`;

			const rowIndex = Math.floor(i / colsPerRow);
			const colIndex = i % colsPerRow;

			const x = startX + colIndex * spacingX;
			const y = startY + rowIndex * spacingY;

			// Card Background (Glass)
			ctx.save();
			// Increased height to 80 to accommodate 2 lines of text
			drawRoundedRect(ctx, x - 10, y - 10, champSize + 20, champSize + 80, 20);
			ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
			ctx.fill();
			ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.restore();

			try {
				const imageBuffer = await getChampionImage(championImageFile);
				let image;

				if (imageBuffer) {
					image = await loadImage(imageBuffer);
				}

				if (image) {
					ctx.save();
					drawRoundedRect(ctx, x, y, champSize, champSize, 15);
					ctx.clip();
					ctx.drawImage(image, x, y, champSize, champSize);
					ctx.restore();

					// Image Border
					ctx.save();
					drawRoundedRect(ctx, x, y, champSize, champSize, 15);
					ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
					ctx.lineWidth = 2;
					ctx.stroke();
					ctx.restore();
				} else {
					drawPlaceholder(ctx, x, y, champSize, championName);
				}

				// Champion Name
				ctx.font = "bold 18px Arial"; // Reduced slightly to 18px
				ctx.textAlign = "center";
				ctx.fillStyle = "#f0e6d2"; // Light gold/parchment text
				ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
				ctx.shadowBlur = 4;
				// Max width constrained to card width (120px)
				wrapText(ctx, championName, x + champSize / 2, y + champSize + 30, champSize + 20, 22);
				ctx.shadowBlur = 0;
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
		
		const combinedHeight = Math.max(blueCanvas.height, redCanvas.height) + 20;
		const combinedCanvas = createCanvas(1620, combinedHeight);
		const ctx = combinedCanvas.getContext("2d");

		// Main Background (Dark Hextech Theme)
		const gradient = ctx.createRadialGradient(
			combinedCanvas.width / 2,
			combinedCanvas.height / 2,
			0,
			combinedCanvas.width / 2,
			combinedCanvas.height / 2,
			combinedCanvas.width,
		);
		gradient.addColorStop(0, "#1e2328"); // Dark grey/blue center
		gradient.addColorStop(1, "#090a0c"); // Almost black edges
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

		// Add a subtle border/frame
		ctx.strokeStyle = "#c8aa6e"; // Gold color
		ctx.lineWidth = 4;
		ctx.strokeRect(0, 0, combinedCanvas.width, combinedCanvas.height);

		ctx.drawImage(blueCanvas, 10, 10);
		ctx.drawImage(redCanvas, 810, 10);

		// VS Text
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "bold 60px Arial";
		ctx.textAlign = "center";
		ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
		ctx.shadowBlur = 20;
		ctx.fillText("VS", combinedCanvas.width / 2, combinedCanvas.height / 2);

		console.log("💾 Saving...");
		const buffer = combinedCanvas.toBuffer("image/png");
		console.log("✅ Team image generated");
		return buffer;
	} catch (error) {
		console.error("❌ Error in generateTeamImage:", error);
		throw error;
	}
}

module.exports = { generateTeamImage, getChampionImage };
