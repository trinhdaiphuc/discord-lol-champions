import * as championRepository from "../data/championRepository.ts";
import type { ChampionData } from "../types/index.ts";

let champions: ChampionData | null = null;

export async function loadChampions(): Promise<ChampionData> {
	champions = await championRepository.readChampions();
	return champions;
}

export function getChampions(): ChampionData {
	if (!champions) {
		throw new Error("Champions not loaded. Please call loadChampions() first.");
	}
	return champions;
}

export async function reloadChampions(): Promise<ChampionData> {
	return await loadChampions();
}

