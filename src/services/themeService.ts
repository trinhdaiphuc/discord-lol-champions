import { readFile, readdir } from "fs/promises";
import { readFileSync } from "fs";
import { join } from "path";
import type { ImageTheme, ThemeManifestItem } from "../types/index.ts";

interface ThemeManifestFile {
	defaultThemeId: string;
	themes: ThemeManifestItem[];
}

export const RANDOM_THEME_ID = "random";
export const RANDOM_THEME_NAME = "Random (Every Generate)";

const themesDir = join(import.meta.dir, "..", "..", "themes");
const manifestPath = join(themesDir, "index.json");

let manifestCache: ThemeManifestFile | null = null;
const themeCache = new Map<string, ImageTheme>();

function parseManifest(content: string): ThemeManifestFile {
	const manifest = JSON.parse(content) as ThemeManifestFile;
	if (!manifest.defaultThemeId || !Array.isArray(manifest.themes)) {
		throw new Error("Invalid themes/index.json format");
	}
	return manifest;
}

function getManifestSync(): ThemeManifestFile {
	if (manifestCache) {
		return manifestCache;
	}
	const content = readFileSync(manifestPath, "utf-8");
	manifestCache = parseManifest(content);
	return manifestCache;
}

async function getManifest(): Promise<ThemeManifestFile> {
	if (manifestCache) {
		return manifestCache;
	}
	const content = await readFile(manifestPath, "utf-8");
	manifestCache = parseManifest(content);
	return manifestCache;
}

export function getThemeChoicesForCommandSync(): Array<{ name: string; value: string }> {
	const manifest = getManifestSync();
	return [
		{ name: RANDOM_THEME_NAME, value: RANDOM_THEME_ID },
		...manifest.themes.map((theme) => ({ name: theme.name, value: theme.id })),
	];
}

export async function listThemeManifestItems(): Promise<ThemeManifestItem[]> {
	const manifest = await getManifest();
	return manifest.themes;
}

export async function getDefaultThemeId(): Promise<string> {
	const manifest = await getManifest();
	return manifest.defaultThemeId;
}

export async function getThemeById(themeId: string): Promise<ImageTheme | null> {
	if (themeCache.has(themeId)) {
		return themeCache.get(themeId)!;
	}

	const manifest = await getManifest();
	const item = manifest.themes.find((theme) => theme.id === themeId);
	if (!item) {
		return null;
	}

	const raw = await readFile(join(themesDir, item.file), "utf-8");
	const parsed = JSON.parse(raw) as ImageTheme;
	themeCache.set(themeId, parsed);
	return parsed;
}

export async function getThemeByIdOrDefault(themeId: string): Promise<ImageTheme> {
	const theme = await getThemeById(themeId);
	if (theme) {
		return theme;
	}

	const defaultThemeId = await getDefaultThemeId();
	const defaultTheme = await getThemeById(defaultThemeId);
	if (!defaultTheme) {
		throw new Error(`Default theme not found: ${defaultThemeId}`);
	}
	return defaultTheme;
}

export async function resolveThemeForGenerate(themeId: string): Promise<ImageTheme> {
	if (themeId === RANDOM_THEME_ID) {
		const manifest = await getManifest();
		if (manifest.themes.length === 0) {
			throw new Error("No themes available for random mode");
		}
		const randomIndex = Math.floor(Math.random() * manifest.themes.length);
		const randomThemeId = manifest.themes[randomIndex].id;
		const picked = await getThemeById(randomThemeId);
		if (!picked) {
			throw new Error(`Random theme not found: ${randomThemeId}`);
		}
		return picked;
	}
	return getThemeByIdOrDefault(themeId);
}

export async function getThemeDisplayName(themeId: string): Promise<string> {
	if (themeId === RANDOM_THEME_ID) {
		return RANDOM_THEME_NAME;
	}
	const theme = await getThemeByIdOrDefault(themeId);
	return theme.name;
}

export async function listThemeIds(): Promise<string[]> {
	const manifest = await getManifest();
	return [RANDOM_THEME_ID, ...manifest.themes.map((theme) => theme.id)];
}

export async function reloadThemesFromDisk(): Promise<void> {
	manifestCache = null;
	themeCache.clear();
	const files = await readdir(themesDir);
	if (!files.includes("index.json")) {
		throw new Error("themes/index.json not found");
	}
}
