import * as championRepository from "../data/championRepository.ts";
import type { Champion, ChampionData } from "../entities/index.ts";

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

export function getChampionById(championId: string): Champion {
	const champion = getChampions()[championId];
	if (!champion) {
		throw new Error(`Unknown champion: ${championId}`);
	}
	return champion;
}
