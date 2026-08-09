import { describe, test, expect } from "bun:test";
import { mergeMobalytics } from "./updateChampions.ts";
import type { ChampionMobalyticsData } from "../entities/index.ts";

function makeData(overrides: Partial<ChampionMobalyticsData> = {}): ChampionMobalyticsData {
	return {
		slug: "ahri",
		tags: ["Mage"],
		types: ["Mage"],
		difficulty: null,
		customDifficulty: null,
		damageType: 1,
		playStyle: 2,
		preMobility: 3,
		preToughness: 4,
		preControl: 5,
		preDamage: 6,
		abilities: [
			{
				activationKey: "Q",
				name: "Orb of Deception",
				slug: "ahri-q",
				riotDesc: "",
				mobaDesc: "",
				stats: [],
				customStats: [],
				tags: ["CC"],
				ccTypes: ["charm"],
			},
		],
		abilityTags: ["CC"],
		ccTypes: ["charm"],
		hasCc: true,
		hasAoe: false,
		aram: {
			sourceUrl: "https://mobalytics.gg/lol/champions/ahri/aram-builds",
			winRate: "52.0%",
			pickRate: "1.0%",
			tier: "S",
			matches: 1000,
			balance: { damageDealt: "+5.0%", damageReceived: null, otherEffects: null },
			combos: [],
		},
		enrichedAt: "2026-06-27T00:00:00.000Z",
		...overrides,
	};
}

describe("mergeMobalytics", () => {
	test("keeps previous ARAM data when the scrape came back empty", () => {
		const previous = makeData();
		const fresh = makeData({ aram: null, enrichedAt: "2026-08-09T00:00:00.000Z" });

		const merged = mergeMobalytics(fresh, previous);

		expect(merged.aram).toEqual(previous.aram);
		expect(merged.enrichedAt).toBe("2026-08-09T00:00:00.000Z"); // abilities were fresh
	});

	test("keeps previous abilities and static fields when the static query failed", () => {
		const previous = makeData();
		const fresh = makeData({
			abilities: [],
			abilityTags: [],
			ccTypes: [],
			hasCc: false,
			damageType: null,
			playStyle: null,
			aram: null,
			enrichedAt: "2026-08-09T00:00:00.000Z",
		});

		const merged = mergeMobalytics(fresh, previous);

		expect(merged.abilities).toEqual(previous.abilities);
		expect(merged.abilityTags).toEqual(["CC"]);
		expect(merged.hasCc).toBe(true);
		expect(merged.damageType).toBe(1);
		expect(merged.playStyle).toBe(2);
		expect(merged.aram).toEqual(previous.aram);
		// Nothing fresh arrived, so the timestamp must not claim a successful run.
		expect(merged.enrichedAt).toBe(previous.enrichedAt);
	});

	test("fresh data wins when the scrape succeeded", () => {
		const previous = makeData();
		const fresh = makeData({
			aram: { ...makeData().aram!, winRate: "48.6%", tier: "D" },
			enrichedAt: "2026-08-09T00:00:00.000Z",
		});

		const merged = mergeMobalytics(fresh, previous);

		expect(merged.aram?.winRate).toBe("48.6%");
		expect(merged.aram?.tier).toBe("D");
		expect(merged.enrichedAt).toBe("2026-08-09T00:00:00.000Z");
	});

	test("returns fresh data untouched when there is no previous entry", () => {
		const fresh = makeData({ aram: null });
		expect(mergeMobalytics(fresh, undefined)).toEqual(fresh);
	});
});
