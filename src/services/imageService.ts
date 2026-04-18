import { createCanvas, loadImage, type Canvas, type CanvasRenderingContext2D } from "canvas";
import { readFile } from "fs/promises";
import { join } from "path";
import * as championService from "./championService.ts";
import type { ImageTheme } from "../types/index.ts";

const TEAM_CANVAS_WIDTH = 900;
const DEFAULT_TEAM_COLS = 4;

const imageCache = new Map<string, Buffer>();
const imagesDir = join(import.meta.dir, "..", "..", "images");

const defaultTheme: ImageTheme = {
	id: "hextech-current",
	name: "Hextech Current",
	description: "Current default look with blue-vs-red contrast.",
	tokens: {
		combinedGradient: ["#0f172a", "#1d4ed8", "#e2e8f0", "#b91c1c", "#18181b"],
		panelBlueGradient: ["rgba(15, 23, 42, 0.92)", "rgba(30, 58, 138, 0.78)"],
		panelRedGradient: ["rgba(24, 24, 27, 0.92)", "rgba(153, 27, 27, 0.78)"],
		panelGridBlue: "rgba(56, 189, 248, 0.2)",
		panelGridRed: "rgba(251, 113, 133, 0.2)",
		panelBorderBlue: "rgba(56, 189, 248, 0.8)",
		panelBorderRed: "rgba(251, 113, 133, 0.8)",
		cardGradient: ["rgba(255, 255, 255, 0.28)", "rgba(255, 255, 255, 0.13)", "rgba(148, 163, 184, 0.08)"],
		cardBorderGradient: ["rgba(255, 255, 255, 0.9)", "rgba(255, 255, 255, 0.28)", "rgba(255, 255, 255, 0.08)"],
		placeholderBg: "#111827",
		placeholderBorder: "rgba(148, 163, 184, 0.6)",
		placeholderText: "#cbd5e1",
		teamTitle: "#f8fafc",
		teamTitleBlueGlow: "rgba(56, 189, 248, 0.45)",
		teamTitleRedGlow: "rgba(251, 113, 133, 0.45)",
		imageBorderBlue: "rgba(56, 189, 248, 0.55)",
		imageBorderRed: "rgba(251, 113, 133, 0.55)",
		championName: "#f8fafc",
		championNameShadow: "rgba(15, 23, 42, 0.95)",
		blobBlue: "rgba(56, 189, 248, 0.15)",
		blobRed: "rgba(251, 146, 60, 0.15)",
		centerLine: ["rgba(30, 58, 138, 0)", "rgba(255, 255, 255, 0.15)", "rgba(153, 27, 27, 0)"],
		outerBorder: "#fbbf24",
		vsText: "#FFFFFF",
	},
};

interface TeamLayoutProfile {
	sidePadding: number;
	cardGap: number;
	rowGap: number;
	startY: number;
	bottomPadding: number;
	minChampionSize: number;
	maxChampionSize: number;
}

function getTeamLayoutProfile(colsPerRow: number): TeamLayoutProfile {
	if (colsPerRow <= 3) {
		return {
			sidePadding: 10,
			cardGap: 42,
			rowGap: 14,
			startY: 82,
			bottomPadding: 56,
			minChampionSize: 116,
			maxChampionSize: 184,
		};
	}

	if (colsPerRow === 4) {
		return {
			sidePadding: 14,
			cardGap: 34,
			rowGap: 14,
			startY: 84,
			bottomPadding: 60,
			minChampionSize: 102,
			maxChampionSize: 152,
		};
	}

	if (colsPerRow === 5) {
		return {
			sidePadding: 24,
			cardGap: 18,
			rowGap: 20,
			startY: 96,
			bottomPadding: 78,
			minChampionSize: 94,
			maxChampionSize: 128,
		};
	}

	return {
		sidePadding: 38,
		cardGap: 12,
		rowGap: 18,
		startY: 88,
		bottomPadding: 64,
		minChampionSize: 84,
		maxChampionSize: 110,
	};
}

export async function getChampionImage(championImage: string): Promise<Buffer | null> {
	if (imageCache.has(championImage)) {
		return imageCache.get(championImage)!;
	}

	const imagePath = join(imagesDir, championImage);
	try {
		const imageBuffer = await readFile(imagePath);
		imageCache.set(championImage, imageBuffer);
		return imageBuffer;
	} catch (error) {
		console.error(`Failed to read image ${championImage}: ${(error as Error).message}`);
		return null;
	}
}

function drawRoundedRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number
): void {
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

function drawPlaceholder(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	theme: ImageTheme
): void {
	ctx.save();
	drawRoundedRect(ctx, x, y, size, size, 15);
	ctx.clip();

	ctx.fillStyle = theme.tokens.placeholderBg;
	ctx.fillRect(x, y, size, size);

	ctx.strokeStyle = theme.tokens.placeholderBorder;
	ctx.lineWidth = 2;
	ctx.stroke();

	ctx.fillStyle = theme.tokens.placeholderText;
	ctx.font = "bold 36px sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("?", x + size / 2, y + size / 2);
	ctx.restore();
}

function drawPanelBackground(
	ctx: CanvasRenderingContext2D,
	canvasWidth: number,
	canvasHeight: number,
	isBlueTeam: boolean,
	theme: ImageTheme
): void {
	const panelGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
	if (isBlueTeam) {
		panelGradient.addColorStop(0, theme.tokens.panelBlueGradient[0]);
		panelGradient.addColorStop(1, theme.tokens.panelBlueGradient[1]);
	} else {
		panelGradient.addColorStop(0, theme.tokens.panelRedGradient[0]);
		panelGradient.addColorStop(1, theme.tokens.panelRedGradient[1]);
	}

	drawRoundedRect(ctx, 10, 10, canvasWidth - 20, canvasHeight - 20, 28);
	ctx.fillStyle = panelGradient;
	ctx.fill();

	ctx.save();
	drawRoundedRect(ctx, 10, 10, canvasWidth - 20, canvasHeight - 20, 28);
	ctx.clip();
	ctx.strokeStyle = isBlueTeam ? theme.tokens.panelGridBlue : theme.tokens.panelGridRed;
	ctx.lineWidth = 1;
	for (let x = 20; x < canvasWidth; x += 36) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvasHeight);
		ctx.stroke();
	}
	for (let y = 20; y < canvasHeight; y += 30) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(canvasWidth, y);
		ctx.stroke();
	}
	ctx.restore();

	ctx.strokeStyle = isBlueTeam ? theme.tokens.panelBorderBlue : theme.tokens.panelBorderRed;
	ctx.lineWidth = 2.5;
	drawRoundedRect(ctx, 10, 10, canvasWidth - 20, canvasHeight - 20, 28);
	ctx.stroke();
}

async function drawTeamOnCanvas(
	team: string[],
	teamName: string,
	isBlueTeam: boolean,
	theme: ImageTheme,
	layoutCols: number
): Promise<Canvas> {
	try {
		const championsData = championService.getChampions();
		const canvasWidth = TEAM_CANVAS_WIDTH;

		const colsPerRow = Math.max(1, Math.min(layoutCols, team.length || 1));
		const layoutProfile = getTeamLayoutProfile(colsPerRow);
		const cardPaddingX = 18;
		const cardPaddingTop = 16;
		const textAreaHeight = 34;
		const sidePadding = layoutProfile.sidePadding;
		const cardGap = layoutProfile.cardGap;
		const availableCardWidth =
			canvasWidth - sidePadding * 2 - cardGap * (colsPerRow - 1);
		const maxChampSizeFromCardWidth =
			Math.floor(availableCardWidth / colsPerRow) - cardPaddingX * 2;
		const champSize = Math.max(
			layoutProfile.minChampionSize,
			Math.min(layoutProfile.maxChampionSize, maxChampSizeFromCardWidth)
		);
		const cardWidth = champSize + cardPaddingX * 2;
		const rowGap = layoutProfile.rowGap;

		const rows = Math.ceil(team.length / colsPerRow);
		const startY = layoutProfile.startY;
		const rowStep = champSize + textAreaHeight + rowGap + cardPaddingTop;
		const calculatedHeight =
			startY +
			(rows > 0 ? (rows - 1) * rowStep : 0) +
			champSize +
			layoutProfile.bottomPadding;
		const minHeight = rows <= 2 ? 360 : rows <= 4 ? 700 : 920;
		const canvasHeight = Math.max(minHeight, calculatedHeight);

		const canvas = createCanvas(canvasWidth, canvasHeight);
		const ctx = canvas.getContext("2d");
		drawPanelBackground(ctx, canvasWidth, canvasHeight, isBlueTeam, theme);

		// Team Name
		ctx.shadowColor = isBlueTeam ? theme.tokens.teamTitleBlueGlow : theme.tokens.teamTitleRedGlow;
		ctx.shadowBlur = 18;
		ctx.fillStyle = theme.tokens.teamTitle;
		ctx.font = "bold 42px sans-serif";
		ctx.textAlign = "center";
		ctx.fillText(teamName, canvasWidth / 2, 60);
		ctx.shadowBlur = 0;

		for (let i = 0; i < team.length; i++) {
			const championId = team[i];
			const championName = championsData[championId]?.name || championId;
			const championImageFile = `${championId}.png`;

			const rowIndex = Math.floor(i / colsPerRow);
			const colIndex = i % colsPerRow;
			const remainingItems = team.length - rowIndex * colsPerRow;
			const itemsInRow = Math.min(colsPerRow, remainingItems);
			const rowCardsWidth = itemsInRow * cardWidth + (itemsInRow - 1) * cardGap;
			const rowStartX = Math.floor((canvasWidth - rowCardsWidth) / 2);
			const cardX = rowStartX + colIndex * (cardWidth + cardGap);

			const x = cardX + cardPaddingX;
			const y = startY + rowIndex * rowStep;

			// --- Card Background (Glass) ---
			ctx.save();
			const cardPaddingBottom = textAreaHeight + 6;
			const cardHeight = champSize + cardPaddingTop + cardPaddingBottom;

			const cardY = y - cardPaddingTop;
			const cardRadius = 20;

			// Drop Shadow
			ctx.shadowColor = "rgba(2, 6, 23, 0.8)";
			ctx.shadowBlur = 24;
			ctx.shadowOffsetY = 16;
			ctx.shadowOffsetX = 4;

			// Glass Gradient Fill
			const cardGradient = ctx.createLinearGradient(
				cardX,
				cardY,
				cardX + cardWidth,
				cardY + cardHeight
			);
			cardGradient.addColorStop(0, theme.tokens.cardGradient[0]);
			cardGradient.addColorStop(0.4, theme.tokens.cardGradient[1]);
			cardGradient.addColorStop(1, theme.tokens.cardGradient[2]);

			drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
			ctx.fillStyle = cardGradient;
			ctx.fill();

			// Reset shadow
			ctx.shadowColor = "transparent";
			ctx.shadowBlur = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowOffsetX = 0;

			// Glass Border
			const borderGradient = ctx.createLinearGradient(
				cardX,
				cardY,
				cardX + cardWidth,
				cardY + cardHeight
			);
			borderGradient.addColorStop(0, theme.tokens.cardBorderGradient[0]);
			borderGradient.addColorStop(0.6, theme.tokens.cardBorderGradient[1]);
			borderGradient.addColorStop(1, theme.tokens.cardBorderGradient[2]);

			ctx.strokeStyle = borderGradient;
			ctx.lineWidth = 1.25;
			ctx.stroke();

			// Inner Gloss
			ctx.save();
			ctx.clip();
			const glossGradient = ctx.createRadialGradient(
				cardX + cardWidth * 0.3,
				cardY + cardHeight * 0.2,
				0,
				cardX + cardWidth * 0.3,
				cardY + cardHeight * 0.2,
				cardWidth * 0.8
			);
			glossGradient.addColorStop(0, "rgba(255, 255, 255, 0.25)");
			glossGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.08)");
			glossGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
			ctx.fillStyle = glossGradient;
			ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
			ctx.restore();

			ctx.restore();

			try {
				const imageBuffer = await getChampionImage(championImageFile);

				if (imageBuffer) {
					const image = await loadImage(imageBuffer);
					ctx.save();
					ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
					ctx.shadowBlur = 10;

					drawRoundedRect(ctx, x, y, champSize, champSize, 20);
					ctx.clip();
					ctx.drawImage(image, x, y, champSize, champSize);
					ctx.restore();

					// Image Border
					ctx.save();
					drawRoundedRect(ctx, x, y, champSize, champSize, 20);
					ctx.strokeStyle = isBlueTeam ? theme.tokens.imageBorderBlue : theme.tokens.imageBorderRed;
					ctx.lineWidth = 1.75;
					ctx.stroke();
					ctx.restore();
				} else {
					drawPlaceholder(ctx, x, y, champSize, theme);
				}

				// Champion Name
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillStyle = theme.tokens.championName;
				ctx.shadowColor = theme.tokens.championNameShadow;
				ctx.shadowBlur = 4;

				let fontSize = 20;
				ctx.font = `bold ${fontSize}px sans-serif`;
				while (ctx.measureText(championName).width > cardWidth - 20 && fontSize > 14) {
					fontSize -= 1;
					ctx.font = `bold ${fontSize}px sans-serif`;
				}

				const textY = y + champSize + textAreaHeight / 2;
				ctx.fillText(championName, x + champSize / 2, textY);
				ctx.shadowBlur = 0;
				ctx.textBaseline = "alphabetic";
			} catch (error) {
				console.error(`❌ Error with ${championName}:`, (error as Error).message);
				drawPlaceholder(ctx, x, y, champSize, theme);
			}
		}

		console.log(`✅ Team canvas created with ${team.length} champions`);
		return canvas;
	} catch (error) {
		console.error("❌ Error in drawTeamOnCanvas:", error);
		throw error;
	}
}

export async function generateTeamImage(
	blueTeam: string[],
	redTeam: string[],
	theme: ImageTheme = defaultTheme,
	layoutCols: number = DEFAULT_TEAM_COLS
): Promise<Buffer> {
	try {
		console.log("🎨 Drawing blue team...");
		const blueCanvas = await drawTeamOnCanvas(blueTeam, "BLUE TEAM", true, theme, layoutCols);

		if (!blueCanvas) {
			throw new Error("Failed to create blue canvas");
		}

		console.log("🎨 Drawing red team...");
		const redCanvas = await drawTeamOnCanvas(redTeam, "RED TEAM", false, theme, layoutCols);

		if (!redCanvas) {
			throw new Error("Failed to create red canvas");
		}

		console.log("📐 Combining...");

		const combinedHeight = Math.max(blueCanvas.height, redCanvas.height) + 20;
		const combinedCanvas = createCanvas(1960, combinedHeight);
		const ctx = combinedCanvas.getContext("2d");

		// Background gradient
		const gradient = ctx.createLinearGradient(0, 0, combinedCanvas.width, 0);
		gradient.addColorStop(0, theme.tokens.combinedGradient[0]);
		gradient.addColorStop(0.46, theme.tokens.combinedGradient[1]);
		gradient.addColorStop(0.5, theme.tokens.combinedGradient[2]);
		gradient.addColorStop(0.54, theme.tokens.combinedGradient[3]);
		gradient.addColorStop(1, theme.tokens.combinedGradient[4]);

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

		// Liquid blobs (Blue side)
		ctx.save();
		ctx.globalCompositeOperation = "overlay";
		for (let k = 0; k < 5; k++) {
			const blobX = Math.random() * (combinedCanvas.width / 2);
			const blobY = Math.random() * combinedCanvas.height;
			const blobRadius = 150 + Math.random() * 200;
			const blobGradient = ctx.createRadialGradient(blobX, blobY, 0, blobX, blobY, blobRadius);
			blobGradient.addColorStop(0, theme.tokens.blobBlue);
			blobGradient.addColorStop(1, "rgba(0,0,0,0)");
			ctx.fillStyle = blobGradient;
			ctx.beginPath();
			ctx.arc(blobX, blobY, blobRadius, 0, Math.PI * 2);
			ctx.fill();
		}
		// Liquid blobs (Red side)
		for (let k = 0; k < 5; k++) {
			const blobX = combinedCanvas.width / 2 + Math.random() * (combinedCanvas.width / 2);
			const blobY = Math.random() * combinedCanvas.height;
			const blobRadius = 150 + Math.random() * 200;
			const blobGradient = ctx.createRadialGradient(blobX, blobY, 0, blobX, blobY, blobRadius);
			blobGradient.addColorStop(0, theme.tokens.blobRed);
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
		shine.addColorStop(0.5, "rgba(255, 255, 255, 0.02)");
		shine.addColorStop(1, "rgba(255, 255, 255, 0)");
		ctx.fillStyle = shine;
		ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

		// Center energy line
		const centerLine = ctx.createLinearGradient(
			combinedCanvas.width / 2 - 50,
			0,
			combinedCanvas.width / 2 + 50,
			0
		);
		centerLine.addColorStop(0, theme.tokens.centerLine[0]);
		centerLine.addColorStop(0.5, theme.tokens.centerLine[1]);
		centerLine.addColorStop(1, theme.tokens.centerLine[2]);
		ctx.fillStyle = centerLine;
		ctx.fillRect(combinedCanvas.width / 2 - 50, 0, 100, combinedCanvas.height);

		// Border
		ctx.strokeStyle = theme.tokens.outerBorder;
		ctx.lineWidth = 4;
		ctx.strokeRect(0, 0, combinedCanvas.width, combinedCanvas.height);

		// Draw teams
		const halfWidth = combinedCanvas.width / 2;
		const blueX = (halfWidth - blueCanvas.width) / 2;
		ctx.drawImage(blueCanvas, blueX, 10);

		const redX = halfWidth + (halfWidth - redCanvas.width) / 2;
		ctx.drawImage(redCanvas, redX, 10);

		// VS Text
		ctx.fillStyle = theme.tokens.vsText;
		ctx.font = "bold 64px sans-serif";
		ctx.textAlign = "center";
		ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
		ctx.shadowBlur = 20;
		ctx.fillText("VS", combinedCanvas.width / 2, combinedCanvas.height / 2);

		console.log("💾 Saving...");
		const buffer = combinedCanvas.toBuffer("image/jpeg", { quality: 0.85 });
		console.log("✅ Team image generated");
		return buffer;
	} catch (error) {
		console.error("❌ Error in generateTeamImage:", error);
		throw error;
	}
}
