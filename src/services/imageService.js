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
		const spacingY = 280; // Increased spacing
		// Calculate required height: startY + (rows-1)*spacingY + cardHeight (approx 180) + bottomPadding
		const minHeight = 900;
		const calculatedHeight = startY + (rows > 0 ? (rows - 1) * spacingY : 0) + 250;
		const canvasHeight = Math.max(minHeight, calculatedHeight);

		const canvas = createCanvas(canvasWidth, canvasHeight);
		const ctx = canvas.getContext("2d");

		// Background is now handled in generateTeamImage for a unified look

		// Team Name
		ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
		ctx.shadowBlur = 15;
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "bold 40px Arial";
		ctx.textAlign = "center";
		ctx.fillText(teamName, canvasWidth / 2, 60);
		ctx.shadowBlur = 0;

		const champSize = 140; // Reduced size slightly
		const startX = 100; 
		const spacingX = 250;

		for (let i = 0; i < team.length; i++) {
			const championId = team[i];
			const championName = championsData[championId]?.name || championId;
			const championImageFile = `${championId}.png`;

			const rowIndex = Math.floor(i / colsPerRow);
			const colIndex = i % colsPerRow;

			const x = startX + colIndex * spacingX;
			const y = startY + rowIndex * spacingY;

			// --- Card Background (Glass) ---
			ctx.save();
			// Expand card dimensions to fit long names
			const cardPaddingX = 20; // Reduced padding relative to size
			const cardWidth = champSize + (cardPaddingX * 2); 
			const cardHeight = champSize + 80; // Adjusted height
			
			// Center card relative to image (image is at x, y)
			const cardX = x - cardPaddingX;
			const cardY = y - 10;
			const cardRadius = 25;

			// Drop Shadow for the card
			ctx.shadowColor = "rgba(0, 0, 0, 0.7)"; // Darker shadow
			ctx.shadowBlur = 30; // Increased blur
			ctx.shadowOffsetY = 20;
			
			// Glass Gradient Fill
			const cardGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
			cardGradient.addColorStop(0, "rgba(255, 255, 255, 0.25)"); // More opaque
			cardGradient.addColorStop(0.4, "rgba(255, 255, 255, 0.15)");
			cardGradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");
			
			drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
			ctx.fillStyle = cardGradient;
			ctx.fill();
			
			// Reset shadow for border
			ctx.shadowColor = "transparent";
			ctx.shadowBlur = 0;
			ctx.shadowOffsetY = 0;

			// Glass Border (Light to Dark)
			const borderGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
			borderGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)"); // Brighter border start
			borderGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.3)");
			borderGradient.addColorStop(1, "rgba(255, 255, 255, 0.15)");
			
			ctx.strokeStyle = borderGradient;
			ctx.lineWidth = 2; // Slightly thicker
			ctx.stroke();

			// Inner Gloss/Highlight
			ctx.save();
			ctx.clip(); // Clip to card shape
			const glossGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight / 2);
			glossGradient.addColorStop(0, "rgba(255, 255, 255, 0.2)"); // Stronger gloss
			glossGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
			ctx.fillStyle = glossGradient;
			ctx.fillRect(cardX, cardY, cardWidth, cardHeight / 2);
			ctx.restore();

			ctx.restore();
			// --- End Card Background ---

			try {
				const imageBuffer = await getChampionImage(championImageFile);
				let image;

				if (imageBuffer) {
					image = await loadImage(imageBuffer);
				}

				if (image) {
					ctx.save();
					// Image Shadow
					ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
					ctx.shadowBlur = 10;
					
					drawRoundedRect(ctx, x, y, champSize, champSize, 20);
					ctx.clip();
					ctx.drawImage(image, x, y, champSize, champSize);
					ctx.restore();

					// Image Border
					ctx.save();
					drawRoundedRect(ctx, x, y, champSize, champSize, 20);
					ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
					ctx.lineWidth = 2;
					ctx.stroke();
					ctx.restore();
				} else {
					drawPlaceholder(ctx, x, y, champSize, championName);
				}

				// Champion Name
				ctx.font = "bold 24px Arial";
				ctx.textAlign = "center";
				ctx.fillStyle = "#f0e6d2"; // Light gold/parchment text
				ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
				ctx.shadowBlur = 4;
				// Wrap text with wider width
				wrapText(ctx, championName, x + champSize / 2, y + champSize + 35, cardWidth - 10, 28);
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
		const combinedCanvas = createCanvas(1900, combinedHeight); // Increased width for more space
		const ctx = combinedCanvas.getContext("2d");

		// Main Background (Dark Hextech Theme)
		// Main Background (Dark Hextech Theme - Blue to Red Split)
		const gradient = ctx.createLinearGradient(0, 0, combinedCanvas.width, 0);
		gradient.addColorStop(0, "#020617"); // Slate-950 (Darker Blue side)
		gradient.addColorStop(0.45, "#1e3a8a"); // Blue-900 (Deep Blue meeting point)
		gradient.addColorStop(0.55, "#991b1b"); // Red-800 (Deep Red meeting point)
		gradient.addColorStop(1, "#2a0a0a"); // Darker Red side
		
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

		// Add "liquid" blobs for texture (Blue side)
		ctx.save();
		ctx.globalCompositeOperation = "overlay";
		for (let k = 0; k < 5; k++) {
			const blobX = Math.random() * (combinedCanvas.width / 2);
			const blobY = Math.random() * combinedCanvas.height;
			const blobRadius = 150 + Math.random() * 200;
			const blobGradient = ctx.createRadialGradient(blobX, blobY, 0, blobX, blobY, blobRadius);
			blobGradient.addColorStop(0, "rgba(56, 189, 248, 0.15)"); // Sky-400, lower opacity
			blobGradient.addColorStop(1, "rgba(0,0,0,0)");
			ctx.fillStyle = blobGradient;
			ctx.beginPath();
			ctx.arc(blobX, blobY, blobRadius, 0, Math.PI * 2);
			ctx.fill();
		}
		// Add "liquid" blobs for texture (Red side)
		for (let k = 0; k < 5; k++) {
			const blobX = (combinedCanvas.width / 2) + Math.random() * (combinedCanvas.width / 2);
			const blobY = Math.random() * combinedCanvas.height;
			const blobRadius = 150 + Math.random() * 200;
			const blobGradient = ctx.createRadialGradient(blobX, blobY, 0, blobX, blobY, blobRadius);
			blobGradient.addColorStop(0, "rgba(251, 146, 60, 0.15)"); // Orange-400, lower opacity
			blobGradient.addColorStop(1, "rgba(0,0,0,0)");
			ctx.fillStyle = blobGradient;
			ctx.beginPath();
			ctx.arc(blobX, blobY, blobRadius, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();

		// Global Shine
		const shine = ctx.createLinearGradient(0, 0, combinedCanvas.width, combinedCanvas.height);
		shine.addColorStop(0, "rgba(255, 255, 255, 0)");
		shine.addColorStop(0.5, "rgba(255, 255, 255, 0.02)"); // More subtle
		shine.addColorStop(1, "rgba(255, 255, 255, 0)");
		ctx.fillStyle = shine;
		ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

		// Add a central "energy" line to blend them
		const centerLine = ctx.createLinearGradient(combinedCanvas.width / 2 - 50, 0, combinedCanvas.width / 2 + 50, 0);
		centerLine.addColorStop(0, "rgba(30, 58, 138, 0)"); // Blue-900 transparent
		centerLine.addColorStop(0.5, "rgba(255, 255, 255, 0.15)"); // White highlight
		centerLine.addColorStop(1, "rgba(153, 27, 27, 0)"); // Red-800 transparent
		ctx.fillStyle = centerLine;
		ctx.fillRect(combinedCanvas.width / 2 - 50, 0, 100, combinedCanvas.height);

		// Add a subtle border/frame
		ctx.strokeStyle = "#c8aa6e"; // Gold color
		ctx.lineWidth = 4;
		ctx.strokeRect(0, 0, combinedCanvas.width, combinedCanvas.height);

		// Calculate centered positions
		const gap = 100;
		const totalContentWidth = blueCanvas.width + gap + redCanvas.width;
		const startX = (combinedCanvas.width - totalContentWidth) / 2;
		
		ctx.drawImage(blueCanvas, startX, 10);
		ctx.drawImage(redCanvas, startX + blueCanvas.width + gap, 10);

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
