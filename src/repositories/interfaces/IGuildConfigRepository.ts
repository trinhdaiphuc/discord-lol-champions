import type { GuildGenerateConfig } from "../../entities/config";

export interface IGuildConfigRepository {
	/**
	 * Find guild configuration by guild ID
	 * @param guildId - The guild ID
	 * @returns The guild config or null if not found
	 */
	findByGuildId(guildId: string): Promise<GuildGenerateConfig | null>;

	/**
	 * Insert or update guild configuration
	 * @param config - The guild configuration to save
	 */
	upsert(config: GuildGenerateConfig): Promise<void>;

	/**
	 * Delete guild configuration
	 * @param guildId - The guild ID
	 */
	delete(guildId: string): Promise<void>;
}
