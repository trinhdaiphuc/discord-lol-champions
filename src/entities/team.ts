import type { ChampionRoleKey } from "./champion";

export type SynergyMetricKey =
	| "engage"
	| "damageBalance"
	| "cc"
	| "peel"
	| "scaling"
	| "laneStability";

export interface SynergyMetricScore {
	score: number;
	label: string;
	evidence: string[];
}

export type TeamSynergyScores = Record<SynergyMetricKey, SynergyMetricScore>;

export interface TeamSynergyAnalysis {
	side: "blue" | "red";
	poolSize: number;
	roleOrder: ChampionRoleKey[];
	team: string[];
	rolePools: Record<ChampionRoleKey, string[]>;
	scores: TeamSynergyScores;
	summaryLine: string;
	takeaway: string;
}

export type GenerationMode = "full" | "full-with-exclusions" | "role-only";

export interface TeamSideRolePools {
	Fighter: string[];
	Mage: string[];
	Tank: string[];
	Marksman: string[];
	Assassin: string[];
	Support: string[];
}

export interface TeamGenerationMetadata {
	mode: GenerationMode;
	poolSize: 3 | 4 | 5 | 6;
	roleOrder: ChampionRoleKey[];
	blueRolePools: TeamSideRolePools;
	redRolePools: TeamSideRolePools;
}

export interface TeamResult {
	blueTeam: string[];
	redTeam: string[];
	metadata: TeamGenerationMetadata;
}

export interface RandomTeamResult {
	teamA: string[];
	teamB: string[];
}
