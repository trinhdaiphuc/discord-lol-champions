import type { PersistedCompAnalysisRecord, PersistCompAnalysisInput } from "../../entities/analysis";

export interface ICompAnalysisRepository {
	/**
	 * Save a new composition analysis record
	 * @returns The ID of the inserted record
	 */
	save(record: PersistCompAnalysisInput): Promise<number>;

	/**
	 * Find recent composition analysis records for a guild
	 * @param guildId - The guild ID
	 * @param limit - Maximum number of records to return
	 * @returns Array of records ordered by createdAt DESC
	 */
	findByGuildId(guildId: string, limit: number): Promise<PersistedCompAnalysisRecord[]>;

	/**
	 * Find a composition analysis by signature (for deduplication)
	 * @param guildId - The guild ID
	 * @param signature - The composition signature
	 * @returns The matching record or null if not found
	 */
	findBySignature(guildId: string, signature: string): Promise<PersistedCompAnalysisRecord | null>;

	/**
	 * Delete old records beyond the keep count
	 * @param guildId - The guild ID
	 * @param keepCount - Number of most recent records to keep
	 */
	deleteOldRecords(guildId: string, keepCount: number): Promise<void>;
}
