import type { IGuildConfigRepository } from "../repositories/interfaces/IGuildConfigRepository.ts";
import { SqliteGuildConfigRepository } from "../repositories/sqlite/SqliteGuildConfigRepository.ts";
import type { GuildGenerateConfig } from "../entities/index.ts";
import { getDefaultThemeId } from "./themeService.ts";

const DEFAULT_POOL_SIZE: GuildGenerateConfig["poolSize"] = 4;
const DEFAULT_HISTORY_WINDOW = 1;
const MAX_HISTORY_WINDOW = 5;
const validPoolSizes = new Set([3, 4, 5, 6]);

export class ChannelConfigService {
	private configCache = new Map<string, GuildGenerateConfig>();

	constructor(private readonly repository: IGuildConfigRepository) {}

	private assertValidPoolSize(
		poolSize: number
	): asserts poolSize is GuildGenerateConfig["poolSize"] {
		if (!validPoolSizes.has(poolSize)) {
			throw new Error("poolSize must be one of: 3, 4, 5, 6");
		}
	}

	private assertValidHistoryWindow(historyWindow: number): void {
		if (!Number.isInteger(historyWindow) || historyWindow < 0 || historyWindow > MAX_HISTORY_WINDOW) {
			throw new Error(`historyWindow must be an integer between 0 and ${MAX_HISTORY_WINDOW}`);
		}
	}

	private async buildDefaultConfig(guildId: string): Promise<GuildGenerateConfig> {
		const now = Date.now();
		return {
			guildId,
			poolSize: DEFAULT_POOL_SIZE,
			historyWindow: DEFAULT_HISTORY_WINDOW,
			themeId: await getDefaultThemeId(),
			updatedAt: now,
		};
	}

	async getGuildGenerateConfig(guildId: string): Promise<GuildGenerateConfig> {
		if (this.configCache.has(guildId)) {
			return this.configCache.get(guildId)!;
		}

		const config = await this.repository.findByGuildId(guildId);

		if (!config) {
			const defaults = await this.buildDefaultConfig(guildId);
			this.configCache.set(guildId, defaults);
			return defaults;
		}

		this.configCache.set(guildId, config);
		return config;
	}

	async setGuildGenerateConfig(
		guildId: string,
		patch: Partial<Pick<GuildGenerateConfig, "poolSize" | "historyWindow" | "themeId">>
	): Promise<GuildGenerateConfig> {
		const existing = await this.getGuildGenerateConfig(guildId);
		const nextPoolSize = patch.poolSize ?? existing.poolSize;
		const nextHistoryWindow = patch.historyWindow ?? existing.historyWindow;
		const nextThemeId = patch.themeId ?? existing.themeId;
		this.assertValidPoolSize(nextPoolSize);
		this.assertValidHistoryWindow(nextHistoryWindow);

		const updated: GuildGenerateConfig = {
			guildId,
			poolSize: nextPoolSize,
			historyWindow: nextHistoryWindow,
			themeId: nextThemeId,
			updatedAt: Date.now(),
		};

		await this.repository.upsert(updated);
		this.configCache.set(guildId, updated);
		return updated;
	}

	async reloadGuildGenerateConfig(guildId: string): Promise<GuildGenerateConfig> {
		const config = await this.repository.findByGuildId(guildId);

		if (!config) {
			const defaults = await this.buildDefaultConfig(guildId);
			this.configCache.set(guildId, defaults);
			return defaults;
		}

		this.configCache.set(guildId, config);
		return config;
	}
}

// Default singleton instance for backward compatibility
const defaultRepository = new SqliteGuildConfigRepository();
const defaultService = new ChannelConfigService(defaultRepository);

// Export functions that delegate to default instance
export const getGuildGenerateConfig = (guildId: string) =>
	defaultService.getGuildGenerateConfig(guildId);

export const setGuildGenerateConfig = (
	guildId: string,
	patch: Partial<Pick<GuildGenerateConfig, "poolSize" | "historyWindow" | "themeId">>
) => defaultService.setGuildGenerateConfig(guildId, patch);

export const reloadGuildGenerateConfig = (guildId: string) =>
	defaultService.reloadGuildGenerateConfig(guildId);

