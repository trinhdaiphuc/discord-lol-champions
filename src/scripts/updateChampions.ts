import axios from "axios";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { readConfig, writeConfig } from "../core/config.ts";
import * as championRepository from "../data/championRepository.ts";
import * as championService from "../services/championService.ts";
import { toAwait } from "../core/promise.ts";
import type { ChampionData, Config } from "../types/index.ts";

const IMAGES_PATH = join(import.meta.dir, "..", "..", "images");

async function getLatestVersion(): Promise<string | null> {
	try {
		const response = await axios.get<string[]>(
			"https://ddragon.leagueoflegends.com/api/versions.json"
		);
		return response.data[0];
	} catch (error) {
		console.error("Error fetching latest version:", error);
		return null;
	}
}

interface ChampionAPIResponse {
	data: ChampionData;
}

async function getChampions(version: string): Promise<ChampionData | null> {
	try {
		const response = await axios.get<ChampionAPIResponse>(
			`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
		);
		return response.data.data;
	} catch (error) {
		console.error(`Error fetching champions for version ${version}:`, error);
		return null;
	}
}

function groupChampionsByRole(champions: ChampionData): Record<string, string[]> {
	const roles: Record<string, string[]> = {
		Fighter: [],
		Mage: [],
		Tank: [],
		Marksman: [],
		Assassin: [],
		Support: [],
	};

	for (const champName in champions) {
		const champ = champions[champName];

		// Special case 1: If champion has both Fighter and Assassin tags, prioritize Assassin
		if (champ.tags.includes('Fighter') && champ.tags.includes('Assassin')) {
			roles.Assassin.push(champ.id);
		}
		// Special case 2: If champion has both Tank and Support tags, add to BOTH roles
		else if (champ.tags.includes('Tank') && champ.tags.includes('Support')) {
			roles.Tank.push(champ.id);
			roles.Support.push(champ.id);
		}
		// Default: Use first tag
		else {
			const assignedRole = champ.tags[0];
			if (roles[assignedRole]) {
				roles[assignedRole].push(champ.id);
			}
		}
	}
	return roles;
}

async function updateChampionImages(champions: ChampionData, version: string): Promise<void> {
	console.log("Updating champion images...");
	try {
		await mkdir(IMAGES_PATH, { recursive: true });
	} catch {
		// Ignore if the directory already exists
	}

	let totalSuccess = 0;
	let totalFailed = 0;

	for (const championId in champions) {
		const champion = champions[championId];
		const championImage = champion.image.full;
		const championImageUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championImage}`;
		const imagePath = join(IMAGES_PATH, championImage);
		try {
			const response = await axios.get<ArrayBuffer>(championImageUrl, {
				responseType: "arraybuffer",
			});
			const imageBuffer = Buffer.from(response.data);
			const checksum = championRepository.createChecksum(imageBuffer);

			if (!(await championRepository.verifyChecksum(championImage, checksum))) {
				await writeFile(imagePath, imageBuffer);
				await championRepository.saveChecksum(championImage, checksum);
				console.log(`Updated ${championImage}`);
				totalSuccess++;
			}
		} catch (error) {
			console.error(`Failed to download ${championImage}: ${(error as Error).message}`);
			totalFailed++;
		}
	}
	console.log(`Champion images updated. Success: ${totalSuccess}, Failed: ${totalFailed}`);
}

export async function updateChampions(): Promise<void> {
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

	const newConfig: Config = {
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
if (import.meta.main) {
	updateChampions();
}

