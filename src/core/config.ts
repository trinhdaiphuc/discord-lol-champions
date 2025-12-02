import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { Config } from "../types/index.ts";

const CONFIG_PATH = join(import.meta.dir, "..", "..", "config.json");

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

