import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { Config } from "../entities/index.ts";

const CONFIG_PATH = join(import.meta.dir, "..", "..", "config.json");
const DEFAULT_CHAMPION_CACHE_TTL_SECONDS = 60 * 60;

export async function readConfig(): Promise<Config> {
	const configData = await readFile(CONFIG_PATH, "utf-8");
	return JSON.parse(configData) as Config;
}

export async function writeConfig(config: Config): Promise<void> {
	try {
		await writeFile(CONFIG_PATH, JSON.stringify(config, null, 4));
	} catch (error) {
		console.error("Error writing config file:", error);
	}
}

export function getChampionCacheTtlSeconds(): number {
	const rawValue = process.env.CHAMPION_CACHE_TTL_SECONDS;
	if (!rawValue) {
		return DEFAULT_CHAMPION_CACHE_TTL_SECONDS;
	}

	const parsedValue = Number.parseInt(rawValue, 10);
	if (Number.isNaN(parsedValue) || parsedValue <= 0) {
		console.warn(
			`Invalid CHAMPION_CACHE_TTL_SECONDS="${rawValue}", falling back to ${DEFAULT_CHAMPION_CACHE_TTL_SECONDS}s`
		);
		return DEFAULT_CHAMPION_CACHE_TTL_SECONDS;
	}

	return parsedValue;
}
