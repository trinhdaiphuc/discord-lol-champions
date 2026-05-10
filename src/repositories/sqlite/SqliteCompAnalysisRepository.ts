import { Database } from "bun:sqlite";
import { mkdir } from "fs/promises";
import { join } from "path";
import type { ICompAnalysisRepository } from "../interfaces/ICompAnalysisRepository";
import type {
	PersistedCompAnalysisRecord,
	PersistCompAnalysisInput,
} from "../../entities/analysis";
import type { TeamSynergyAnalysis } from "../../entities/team";

const DATA_DIR = join(import.meta.dir, "..", "..", "..", "data");
const DB_PATH = join(DATA_DIR, "channel-config.sqlite");

type CompAnalysisRow = {
	id: number;
	guild_id: string;
	generation_mode: PersistCompAnalysisInput["generationMode"];
	pool_size: number;
	blue_team_json: string;
	red_team_json: string;
	blue_scores_json: string;
	red_scores_json: string;
	summary_text: string;
	composition_signature: string;
	created_at: number;
};

export class SqliteCompAnalysisRepository implements ICompAnalysisRepository {
	private db: Database | null = null;
	private initPromise: Promise<void> | null = null;

	private async initDb(): Promise<void> {
		if (this.db) {
			return;
		}
		if (this.initPromise) {
			return this.initPromise;
		}

		this.initPromise = (async () => {
			await mkdir(DATA_DIR, { recursive: true });
			this.db = new Database(DB_PATH);
			this.db.run(`
				CREATE TABLE IF NOT EXISTS comp_analysis_history (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					guild_id TEXT NOT NULL,
					generation_mode TEXT NOT NULL,
					pool_size INTEGER NOT NULL,
					blue_team_json TEXT NOT NULL,
					red_team_json TEXT NOT NULL,
					blue_scores_json TEXT NOT NULL,
					red_scores_json TEXT NOT NULL,
					summary_text TEXT NOT NULL,
					composition_signature TEXT NOT NULL,
					created_at INTEGER NOT NULL
				)
			`);
			this.db.run(`
				CREATE INDEX IF NOT EXISTS idx_comp_analysis_history_guild_created_at
				ON comp_analysis_history (guild_id, created_at DESC)
			`);
			this.db.run(`
				CREATE INDEX IF NOT EXISTS idx_comp_analysis_history_guild_signature
				ON comp_analysis_history (guild_id, composition_signature)
			`);
		})();

		return this.initPromise;
	}

	private mapRow(row: CompAnalysisRow): PersistedCompAnalysisRecord {
		return {
			id: row.id,
			guildId: row.guild_id,
			generationMode: row.generation_mode,
			poolSize: row.pool_size,
			blueTeam: JSON.parse(row.blue_team_json) as string[],
			redTeam: JSON.parse(row.red_team_json) as string[],
			blueAnalysis: JSON.parse(row.blue_scores_json) as TeamSynergyAnalysis,
			redAnalysis: JSON.parse(row.red_scores_json) as TeamSynergyAnalysis,
			summaryText: row.summary_text,
			compositionSignature: row.composition_signature,
			createdAt: row.created_at,
		};
	}

	async save(record: PersistCompAnalysisInput): Promise<number> {
		await this.initDb();

		const createdAt = Date.now();
		const result = this.db!
			.query(
				`
					INSERT INTO comp_analysis_history (
						guild_id,
						generation_mode,
						pool_size,
						blue_team_json,
						red_team_json,
						blue_scores_json,
						red_scores_json,
						summary_text,
						composition_signature,
						created_at
					)
					VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
				`
			)
			.run(
				record.guildId,
				record.generationMode,
				record.poolSize,
				JSON.stringify(record.blueTeam),
				JSON.stringify(record.redTeam),
				JSON.stringify(record.blueAnalysis),
				JSON.stringify(record.redAnalysis),
				record.summaryText,
				record.compositionSignature,
				createdAt
			);

		return Number(result.lastInsertRowid);
	}

	async findByGuildId(guildId: string, limit: number): Promise<PersistedCompAnalysisRecord[]> {
		await this.initDb();
		const rows = this.db!
			.query(
				`
					SELECT
						id,
						guild_id,
						generation_mode,
						pool_size,
						blue_team_json,
						red_team_json,
						blue_scores_json,
						red_scores_json,
						summary_text,
						composition_signature,
						created_at
					FROM comp_analysis_history
					WHERE guild_id = ?1
					ORDER BY created_at DESC
					LIMIT ?2
				`
			)
			.all(guildId, limit) as CompAnalysisRow[];

		return rows.map((row) => this.mapRow(row));
	}

	async findBySignature(
		guildId: string,
		signature: string
	): Promise<PersistedCompAnalysisRecord | null> {
		await this.initDb();
		const row = this.db!
			.query(
				`
					SELECT
						id,
						guild_id,
						generation_mode,
						pool_size,
						blue_team_json,
						red_team_json,
						blue_scores_json,
						red_scores_json,
						summary_text,
						composition_signature,
						created_at
					FROM comp_analysis_history
					WHERE guild_id = ?1 AND composition_signature = ?2
					ORDER BY created_at DESC
					LIMIT 1
				`
			)
			.get(guildId, signature) as CompAnalysisRow | null;

		return row ? this.mapRow(row) : null;
	}

	async deleteOldRecords(guildId: string, keepCount: number): Promise<void> {
		await this.initDb();
		this.db!
			.query(
				`
					DELETE FROM comp_analysis_history
					WHERE guild_id = ?1
					AND id NOT IN (
						SELECT id FROM comp_analysis_history
						WHERE guild_id = ?1
						ORDER BY created_at DESC
						LIMIT ?2
					)
				`
			)
			.run(guildId, keepCount);
	}
}
