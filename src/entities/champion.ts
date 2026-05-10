export interface Champion {
	key: string;
	id: string;
	name: string;
	title: string;
	info: {
		attack: number;
		defense: number;
		magic: number;
		difficulty: number;
	};
	stats: {
		hp: number;
		hpperlevel: number;
		mp: number;
		mpperlevel: number;
		movespeed: number;
		armor: number;
		armorperlevel: number;
		spellblock: number;
		spellblockperlevel: number;
		attackrange: number;
		hpregen: number;
		hpregenperlevel: number;
		mpregen: number;
		mpregenperlevel: number;
		crit: number;
		critperlevel: number;
		attackdamage: number;
		attackdamageperlevel: number;
		attackspeedperlevel: number;
		attackspeed: number;
	};
	image: {
		full: string;
		sprite: string;
		group: string;
		x: number;
		y: number;
		w: number;
		h: number;
	};
	tags: string[];
	mobalytics?: ChampionMobalyticsData;
	[key: string]: unknown;
}

export interface ChampionData {
	[key: string]: Champion;
}

export interface ChampionDifficultyDescriptor {
	slug: string;
	name: string;
	color: string;
	level: number;
}

export interface ChampionAbilityStatValue {
	slug: string;
	value: string;
}

export interface ChampionEnrichedAbility {
	activationKey: string;
	name: string;
	slug: string;
	riotDesc: string;
	mobaDesc: string;
	stats: ChampionAbilityStatValue[];
	customStats: ChampionAbilityStatValue[];
	tags: string[];
	ccTypes: string[];
}

export interface ChampionAramCombo {
	sequence: string[];
	description: string;
	difficulty: string | null;
}

export interface ChampionAramBalance {
	damageDealt: string | null;
	damageReceived: string | null;
	otherEffects: string | null;
}

export interface ChampionMobalyticsAramData {
	sourceUrl: string;
	winRate: string | null;
	pickRate: string | null;
	tier: string | null;
	matches: number | null;
	balance: ChampionAramBalance;
	combos: ChampionAramCombo[];
}

export interface ChampionMobalyticsData {
	slug: string;
	tags: string[];
	types: string[];
	difficulty: ChampionDifficultyDescriptor | null;
	customDifficulty: ChampionDifficultyDescriptor | null;
	damageType: number | null;
	playStyle: number | null;
	preMobility: number | null;
	preToughness: number | null;
	preControl: number | null;
	preDamage: number | null;
	abilities: ChampionEnrichedAbility[];
	abilityTags: string[];
	ccTypes: string[];
	hasCc: boolean;
	hasAoe: boolean;
	aram: ChampionMobalyticsAramData | null;
	enrichedAt: string;
}

export interface Checksums {
	[fileName: string]: {
		checksum: string;
	};
}

export type ChampionRoleKey = "Fighter" | "Mage" | "Tank" | "Marksman" | "Assassin" | "Support";
