import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import type { ChampionData, Checksums } from "../types/index.ts";

const CHAMPIONS_PATH = join(import.meta.dir, "..", "..", "champions.json");
const CHECKSUM_PATH = join(import.meta.dir, "..", "..", "checksum.json");

export async function readChampions(): Promise<ChampionData> {
	try {
		const championsData = await readFile(CHAMPIONS_PATH, "utf-8");
		return JSON.parse(championsData) as ChampionData;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			// If the file doesn't exist, create it with an empty object.
			await writeChampions({});
			return {};
		}
		throw error;
	}
}

export async function writeChampions(champions: ChampionData): Promise<void> {
	await writeFile(CHAMPIONS_PATH, JSON.stringify(champions, null, 4));
}

export function createChecksum(data: Buffer | string): string {
	return createHash("sha256").update(data).digest("hex");
}

export async function getChecksums(): Promise<Checksums> {
	try {
		const checksumsData = await readFile(CHECKSUM_PATH, "utf-8");
		return JSON.parse(checksumsData) as Checksums;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return {};
		}
		throw error;
	}
}

export async function saveChecksum(fileName: string, checksum: string): Promise<void> {
	const checksums = await getChecksums();
	const existingChecksum = checksums[fileName];
	if (existingChecksum && existingChecksum.checksum === checksum) {
		return;
	}
	checksums[fileName] = {
		checksum: checksum,
	};
	await writeFile(CHECKSUM_PATH, JSON.stringify(checksums, null, 2));
}

export async function verifyChecksum(fileName: string, checksum: string): Promise<boolean> {
	const checksums = await getChecksums();
	return checksums[fileName] !== undefined && checksums[fileName].checksum === checksum;
}

