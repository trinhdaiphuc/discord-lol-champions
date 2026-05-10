import type { GenerationMode, TeamSynergyAnalysis } from "./team";

export interface PersistedCompAnalysisRecord {
	id: number;
	guildId: string;
	generationMode: GenerationMode;
	poolSize: number;
	blueTeam: string[];
	redTeam: string[];
	blueAnalysis: TeamSynergyAnalysis;
	redAnalysis: TeamSynergyAnalysis;
	summaryText: string;
	compositionSignature: string;
	createdAt: number;
}

export interface PersistCompAnalysisInput {
	guildId: string;
	generationMode: GenerationMode;
	poolSize: number;
	blueTeam: string[];
	redTeam: string[];
	blueAnalysis: TeamSynergyAnalysis;
	redAnalysis: TeamSynergyAnalysis;
	summaryText: string;
	compositionSignature: string;
}
