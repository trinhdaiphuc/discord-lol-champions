export interface ImageThemeTokens {
	combinedGradient: [string, string, string, string, string];
	panelBlueGradient: [string, string];
	panelRedGradient: [string, string];
	panelGridBlue: string;
	panelGridRed: string;
	panelBorderBlue: string;
	panelBorderRed: string;
	cardGradient: [string, string, string];
	cardBorderGradient: [string, string, string];
	cardGlossGradient: [string, string, string];
	placeholderBg: string;
	placeholderBorder: string;
	placeholderText: string;
	teamTitle: string;
	teamTitleBlueGlow: string;
	teamTitleRedGlow: string;
	imageBorderBlue: string;
	imageBorderRed: string;
	championName: string;
	championNameShadow: string;
	blobBlue: string;
	blobRed: string;
	centerLine: [string, string, string];
	outerBorder: string;
	vsText: string;
}

export interface ImageTheme {
	id: string;
	name: string;
	description: string;
	tokens: ImageThemeTokens;
}

export interface ThemeManifestItem {
	id: string;
	name: string;
	description: string;
	file: string;
}
