import { Database } from "bun:sqlite";
import { mkdir } from "fs/promises";
import { join } from "path";
import type { GuildGenerateConfig } from "../types/index.ts";
import { getDefaultThemeId } from "./themeService.ts";

const dbPath = join(import.meta.dir, "..", "..", "data", "channel-config.sqlite");
const DEFAULT_POOL_SIZE: GuildGenerateConfig["poolSize"] = 4;
const validPoolSizes = new Set([3, 4, 5, 6]);

let db: Database | null = null;
let initPromise: Promise<void> | null = null;
const configCache = new Map<string, GuildGenerateConfig>();

async function initDb(): Promise<void> {
	if (db) {
		return;
	}
	if (initPromise) {
		return initPromise;
	}

	initPromise = (async () => {
		await mkdir(join(import.meta.dir, "..", "..", "data"), { recursive: true });
		db = new Database(dbPath);
		db.run(`
			CREATE TABLE IF NOT EXISTS guild_generate_config (
				guild_id TEXT PRIMARY KEY,
				pool_size INTEGER NOT NULL,
				theme_id TEXT NOT NULL,
				updated_at INTEGER NOT NULL
			)
		`);
	})();

	return initPromise;
}

function assertValidPoolSize(
	poolSize: number
): asserts poolSize is GuildGenerateConfig["poolSize"] {
	if (!validPoolSizes.has(poolSize)) {
		throw new Error("poolSize must be one of: 3, 4, 5, 6");
	}
}

async function buildDefaultConfig(guildId: string): Promise<GuildGenerateConfig> {
	const now = Date.now();
	return {
		guildId,
		poolSize: DEFAULT_POOL_SIZE,
		themeId: await getDefaultThemeId(),
		updatedAt: now,
	};
}

function mapRow(row: {
	guild_id: string;
	pool_size: number;
	theme_id: string;
	updated_at: number;
}): GuildGenerateConfig {
	return {
		guildId: row.guild_id,
		poolSize: row.pool_size as GuildGenerateConfig["poolSize"],
		themeId: row.theme_id,
		updatedAt: row.updated_at,
	};
}

export async function getGuildGenerateConfig(guildId: string): Promise<GuildGenerateConfig> {
	if (configCache.has(guildId)) {
		return configCache.get(guildId)!;
	}

	await initDb();
	const row = db!
		.query(
			`SELECT guild_id, pool_size, theme_id, updated_at FROM guild_generate_config WHERE guild_id = ?1`
		)
		.get(guildId) as {
		guild_id: string;
		pool_size: number;
		theme_id: string;
		updated_at: number;
	} | null;

	if (!row) {
		const defaults = await buildDefaultConfig(guildId);
		configCache.set(guildId, defaults);
		return defaults;
	}

	const config = mapRow(row);
	configCache.set(guildId, config);
	return config;
}

export async function setGuildGenerateConfig(
	guildId: string,
	patch: Partial<Pick<GuildGenerateConfig, "poolSize" | "themeId">>
): Promise<GuildGenerateConfig> {
	await initDb();
	const existing = await getGuildGenerateConfig(guildId);
	const nextPoolSize = patch.poolSize ?? existing.poolSize;
	const nextThemeId = patch.themeId ?? existing.themeId;
	assertValidPoolSize(nextPoolSize);

	const updated: GuildGenerateConfig = {
		guildId,
		poolSize: nextPoolSize,
		themeId: nextThemeId,
		updatedAt: Date.now(),
	};

	db!
		.query(
			`
		INSERT INTO guild_generate_config (guild_id, pool_size, theme_id, updated_at)
		VALUES (?1, ?2, ?3, ?4)
		ON CONFLICT(guild_id) DO UPDATE SET
			pool_size = excluded.pool_size,
			theme_id = excluded.theme_id,
			updated_at = excluded.updated_at
	`
		)
		.run(updated.guildId, updated.poolSize, updated.themeId, updated.updatedAt);

	configCache.set(guildId, updated);
	return updated;
}

export async function reloadGuildGenerateConfig(guildId: string): Promise<GuildGenerateConfig> {
	await initDb();
	const row = db!
		.query(
			`SELECT guild_id, pool_size, theme_id, updated_at FROM guild_generate_config WHERE guild_id = ?1`
		)
		.get(guildId) as {
		guild_id: string;
		pool_size: number;
		theme_id: string;
		updated_at: number;
	} | null;

	if (!row) {
		const defaults = await buildDefaultConfig(guildId);
		configCache.set(guildId, defaults);
		return defaults;
	}

	const reloaded = mapRow(row);
	configCache.set(guildId, reloaded);
	return reloaded;
}
