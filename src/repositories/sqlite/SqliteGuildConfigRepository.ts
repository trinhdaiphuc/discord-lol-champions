import { Database } from "bun:sqlite";
import { mkdir } from "fs/promises";
import { join } from "path";
import type { IGuildConfigRepository } from "../interfaces/IGuildConfigRepository";
import type { GuildGenerateConfig } from "../../entities/config";

const DATA_DIR = join(import.meta.dir, "..", "..", "..", "data");
const DB_PATH = join(DATA_DIR, "channel-config.sqlite");

type GuildConfigRow = {
	guild_id: string;
	pool_size: number;
	history_window?: number;
	theme_id: string;
	updated_at: number;
};

export class SqliteGuildConfigRepository implements IGuildConfigRepository {
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
				CREATE TABLE IF NOT EXISTS guild_generate_config (
					guild_id TEXT PRIMARY KEY,
					pool_size INTEGER NOT NULL,
					history_window INTEGER NOT NULL DEFAULT 1,
					theme_id TEXT NOT NULL,
					updated_at INTEGER NOT NULL
				)
			`);

			// Migration: Add history_window column if it doesn't exist
			const columns = this.db.query(`PRAGMA table_info(guild_generate_config)`).all() as Array<{
				name: string;
			}>;
			if (!columns.some((column) => column.name === "history_window")) {
				this.db.run(
					`ALTER TABLE guild_generate_config ADD COLUMN history_window INTEGER NOT NULL DEFAULT 1`
				);
			}
		})();

		return this.initPromise;
	}

	private mapRow(row: GuildConfigRow): GuildGenerateConfig {
		return {
			guildId: row.guild_id,
			poolSize: row.pool_size as GuildGenerateConfig["poolSize"],
			historyWindow: row.history_window ?? 1,
			themeId: row.theme_id,
			updatedAt: row.updated_at,
		};
	}

	async findByGuildId(guildId: string): Promise<GuildGenerateConfig | null> {
		await this.initDb();
		const row = this.db!
			.query(
				`SELECT guild_id, pool_size, history_window, theme_id, updated_at
				 FROM guild_generate_config
				 WHERE guild_id = ?1`
			)
			.get(guildId) as GuildConfigRow | null;

		return row ? this.mapRow(row) : null;
	}

	async upsert(config: GuildGenerateConfig): Promise<void> {
		await this.initDb();
		this.db!
			.query(
				`
				INSERT INTO guild_generate_config (guild_id, pool_size, history_window, theme_id, updated_at)
				VALUES (?1, ?2, ?3, ?4, ?5)
				ON CONFLICT(guild_id) DO UPDATE SET
					pool_size = excluded.pool_size,
					history_window = excluded.history_window,
					theme_id = excluded.theme_id,
					updated_at = excluded.updated_at
			`
			)
			.run(
				config.guildId,
				config.poolSize,
				config.historyWindow,
				config.themeId,
				config.updatedAt
			);
	}

	async delete(guildId: string): Promise<void> {
		await this.initDb();
		this.db!
			.query(`DELETE FROM guild_generate_config WHERE guild_id = ?1`)
			.run(guildId);
	}
}
