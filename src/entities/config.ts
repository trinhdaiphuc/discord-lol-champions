export interface Config {
	DRAGON_VERSION: string;
	CHAMPION_ROLES: {
		[role: string]: string[];
	};
	FALLBACK_ROLES: {
		[role: string]: string[];
	};
}

export interface GuildGenerateConfig {
	guildId: string;
	poolSize: 3 | 4 | 5 | 6;
	historyWindow: number;
	themeId: string;
	updatedAt: number;
}
