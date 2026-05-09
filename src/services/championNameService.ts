import * as championService from "./championService.ts";

function sanitizeName(name: string): string {
	return name.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function mapNamesToChampionIds(names: string[]): { matched: string[]; unknown: string[] } {
	const champions = championService.getChampions();
	const lookup = new Map<string, string>();

	for (const id of Object.keys(champions)) {
		const champion = champions[id];
		// map by id (e.g., "DrMundo")
		const idKey = sanitizeName(id);
		if (!lookup.has(idKey)) lookup.set(idKey, id);

		// map by display name (champion.name) e.g., "Dr. Mundo" or "Aurelion Sol"
		if (champion && typeof champion.name === "string") {
			const nameKey = sanitizeName(champion.name);
			if (!lookup.has(nameKey)) lookup.set(nameKey, id);
		}
	}

	const matched: string[] = [];
	const unknown: string[] = [];

	for (const raw of names) {
		const s = sanitizeName(raw);
		const id = lookup.get(s);
		if (id) {
			matched.push(id);
		} else {
			unknown.push(raw);
		}
	}

	return { matched, unknown };
}

