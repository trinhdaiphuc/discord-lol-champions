import type { ICompAnalysisRepository } from "../repositories/interfaces/ICompAnalysisRepository.ts";
import { SqliteCompAnalysisRepository } from "../repositories/sqlite/SqliteCompAnalysisRepository.ts";
import {
	analyzeGeneratedTeams,
	createCompositionSignature,
} from "./synergyAnalysisService.ts";
import type {
	PersistCompAnalysisInput,
	PersistedCompAnalysisRecord,
	TeamResult,
} from "../entities/index.ts";

export class CompAnalysisHistoryService {
	constructor(private readonly repository: ICompAnalysisRepository) {}

	private assertValidPersistInput(record: PersistCompAnalysisInput): void {
		if (!record.guildId.trim()) {
			throw new Error("guildId is required to persist comp analysis history.");
		}
		if (record.poolSize < 1) {
			throw new Error("poolSize must be greater than zero.");
		}
		if (!record.summaryText.trim()) {
			throw new Error("summaryText is required to persist comp analysis history.");
		}
		if (!record.compositionSignature.trim()) {
			throw new Error("compositionSignature is required to persist comp analysis history.");
		}
	}

	async saveCompAnalysisHistory(
		record: PersistCompAnalysisInput
	): Promise<PersistedCompAnalysisRecord> {
		this.assertValidPersistInput(record);
		const id = await this.repository.save(record);

		return {
			id,
			guildId: record.guildId,
			generationMode: record.generationMode,
			poolSize: record.poolSize,
			blueTeam: [...record.blueTeam],
			redTeam: [...record.redTeam],
			blueAnalysis: record.blueAnalysis,
			redAnalysis: record.redAnalysis,
			summaryText: record.summaryText,
			compositionSignature: record.compositionSignature,
			createdAt: Date.now(),
		};
	}

	async getRecentCompAnalysisHistory(
		guildId: string,
		limit = 10
	): Promise<PersistedCompAnalysisRecord[]> {
		return this.repository.findByGuildId(guildId, limit);
	}

	async findCompAnalysisBySignature(
		guildId: string,
		compositionSignature: string
	): Promise<PersistedCompAnalysisRecord | null> {
		return this.repository.findBySignature(guildId, compositionSignature);
	}

	async analyzeAndStoreGeneratedTeams(guildId: string, teamResult: TeamResult): Promise<{
		analysis: Awaited<ReturnType<typeof analyzeGeneratedTeams>>;
		record: PersistedCompAnalysisRecord;
	}> {
		const analysis = await analyzeGeneratedTeams(teamResult);
		const record = await this.saveCompAnalysisHistory({
			guildId,
			generationMode: teamResult.metadata.mode,
			poolSize: teamResult.metadata.poolSize,
			blueTeam: teamResult.blueTeam,
			redTeam: teamResult.redTeam,
			blueAnalysis: analysis.blue,
			redAnalysis: analysis.red,
			summaryText: analysis.summaryText,
			compositionSignature: createCompositionSignature(teamResult),
		});

		return { analysis, record };
	}
}

// Default singleton instance for backward compatibility
const defaultRepository = new SqliteCompAnalysisRepository();
const defaultService = new CompAnalysisHistoryService(defaultRepository);

// Export functions that delegate to default instance
export const saveCompAnalysisHistory = (record: PersistCompAnalysisInput) =>
	defaultService.saveCompAnalysisHistory(record);

export const getRecentCompAnalysisHistory = (guildId: string, limit?: number) =>
	defaultService.getRecentCompAnalysisHistory(guildId, limit);

export const findCompAnalysisBySignature = (guildId: string, compositionSignature: string) =>
	defaultService.findCompAnalysisBySignature(guildId, compositionSignature);

export const analyzeAndStoreGeneratedTeams = (guildId: string, teamResult: TeamResult) =>
	defaultService.analyzeAndStoreGeneratedTeams(guildId, teamResult);

