import { Database } from "bun:sqlite";
import { mkdir } from "fs/promises";
import { join } from "path";
import { CHANNEL_CONFIG_DB_PATH } from "./channelConfigService.ts";
import {
	analyzeGeneratedTeams,
	createCompositionSignature,
} from "./synergyAnalysisService.ts";
import type {
	PersistCompAnalysisInput,
	PersistedCompAnalysisRecord,
	TeamResult,
	TeamSynergyAnalysis,
} from "../types/index.ts";

const DATA_DIR = join(import.meta.dir, "..", "..", "data");

let db: Database | null = null;
let initPromise: Promise<void> | null = null;

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

async function initDb(): Promise<void> {
	if (db) {
		return;
	}
	if (initPromise) {
		return initPromise;
	}

	initPromise = (async () => {
		await mkdir(DATA_DIR, { recursive: true });
		db = new Database(CHANNEL_CONFIG_DB_PATH);
		db.run(`
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
		db.run(`
			CREATE INDEX IF NOT EXISTS idx_comp_analysis_history_guild_created_at
			ON comp_analysis_history (guild_id, created_at DESC)
		`);
		db.run(`
			CREATE INDEX IF NOT EXISTS idx_comp_analysis_history_guild_signature
			ON comp_analysis_history (guild_id, composition_signature)
		`);
	})();

	return initPromise;
}

function assertValidPersistInput(record: PersistCompAnalysisInput): void {
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

function parseAnalysis(json: string): TeamSynergyAnalysis {
	return JSON.parse(json) as TeamSynergyAnalysis;
}

function mapRow(row: CompAnalysisRow): PersistedCompAnalysisRecord {
	return {
		id: row.id,
		guildId: row.guild_id,
		generationMode: row.generation_mode,
		poolSize: row.pool_size,
		blueTeam: JSON.parse(row.blue_team_json) as string[],
		redTeam: JSON.parse(row.red_team_json) as string[],
		blueAnalysis: parseAnalysis(row.blue_scores_json),
		redAnalysis: parseAnalysis(row.red_scores_json),
		summaryText: row.summary_text,
		compositionSignature: row.composition_signature,
		createdAt: row.created_at,
	};
}

export async function saveCompAnalysisHistory(
	record: PersistCompAnalysisInput
): Promise<PersistedCompAnalysisRecord> {
	assertValidPersistInput(record);
	await initDb();

	const createdAt = Date.now();
	const result = db!
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

	return {
		id: Number(result.lastInsertRowid),
		guildId: record.guildId,
		generationMode: record.generationMode,
		poolSize: record.poolSize,
		blueTeam: [...record.blueTeam],
		redTeam: [...record.redTeam],
		blueAnalysis: record.blueAnalysis,
		redAnalysis: record.redAnalysis,
		summaryText: record.summaryText,
		compositionSignature: record.compositionSignature,
		createdAt,
	};
}

export async function getRecentCompAnalysisHistory(
	guildId: string,
	limit = 10
): Promise<PersistedCompAnalysisRecord[]> {
	await initDb();
	const rows = db!
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

	return rows.map(mapRow);
}

export async function findCompAnalysisBySignature(
	guildId: string,
	compositionSignature: string
): Promise<PersistedCompAnalysisRecord | null> {
	await initDb();
	const row = db!
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
		.get(guildId, compositionSignature) as CompAnalysisRow | null;

	return row ? mapRow(row) : null;
}

export async function analyzeAndStoreGeneratedTeams(guildId: string, teamResult: TeamResult): Promise<{
	analysis: Awaited<ReturnType<typeof analyzeGeneratedTeams>>;
	record: PersistedCompAnalysisRecord;
}> {
	const analysis = await analyzeGeneratedTeams(teamResult);
	const record = await saveCompAnalysisHistory({
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
