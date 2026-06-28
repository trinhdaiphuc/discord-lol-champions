import axios from "axios";
import initCycleTLS, { type CycleTLSClient } from "cycletls";
import { access, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { readConfig, writeConfig } from "../core/config.ts";
import * as championRepository from "../data/championRepository.ts";
import * as championService from "../services/championService.ts";
import { sendTelegramAlert } from "../services/alertService.ts";
import { toAwait } from "../core/promise.ts";
import type {
	Champion,
	ChampionAramCombo,
	ChampionData,
	ChampionDifficultyDescriptor,
	ChampionEnrichedAbility,
	ChampionMobalyticsAramData,
	Config,
} from "../entities/index.ts";

const IMAGES_PATH = join(import.meta.dir, "..", "..", "images");
const MOBA_BASE_URL = "https://mobalytics.gg";
const MOBA_STATIC_GQL_URL = `${MOBA_BASE_URL}/api/league/gql/static/v1`;
const MAX_CONCURRENT_ENRICHES = 4;
const HTML_ENTITY_MAP: Record<string, string> = {
	"&nbsp;": " ",
	"&amp;": "&",
	"&quot;": '"',
	"&#39;": "'",
	"&#x27;": "'",
	"&lt;": "<",
	"&gt;": ">",
};

// Mobalytics sits behind Cloudflare, which blocks non-browser clients (axios/fetch)
// at the TLS-fingerprint layer with a "Just a moment..." challenge regardless of
// request headers. cycletls impersonates Chrome's JA3 fingerprint to pass it.
const MOBA_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const MOBA_JA3 =
	"771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24,0";

const MOBA_HEADERS = {
	accept: "*/*",
	"accept-language": "en_us",
	"content-type": "application/json",
	origin: MOBA_BASE_URL,
	referer: `${MOBA_BASE_URL}/lol`,
	"x-moba-client": "mobalytics-web",
};

const ALL_CHAMPIONS_STATIC_QUERY = `
	query MobalyticsChampionsIndexQuery {
		champions: queryChampionsV1Contents(top: 250) {
			flatData {
				riotId
				slug
				name
				title
				type {
					flatData {
						slug
						name
					}
				}
				difficulty {
					flatData {
						slug
						name
						color
						level
					}
				}
				customDifficulty {
					flatData {
						slug
						name
						color
						level
					}
				}
			}
		}
	}
`;

const CHAMPION_STATIC_QUERY = `
	query MobalyticsChampionStaticQuery($filter: String!) {
		championCommonInfo: queryChampionsV1Contents(filter: $filter) {
			flatData {
				riotId
				slug
				name
				title
				lore
				tags
				damageType
				playStyle
				preMobility
				preToughness
				preControl
				preDamage
				type {
					flatData {
						slug
						name
					}
				}
				difficulty {
					flatData {
						slug
						name
						color
						level
					}
				}
				customDifficulty {
					flatData {
						slug
						name
						color
						level
					}
				}
				abilities {
					flatData {
						slug
						name
						activationKey
					}
				}
			}
		}
	}
`;

const ABILITY_QUERY = `
	query LolChampionAbilityBySlug($filter: String!) {
		items: queryChampionsAbilitiesV1Contents(filter: $filter) {
			flatData {
				activationKey
				riotDesc: ddragonDescription
				mobaDesc: description
				name
				slug
				stats {
					slug
					value
				}
				customStats {
					slug
					value
				}
			}
		}
	}
`;

const CC_RULES = [
	{ type: "stun", pattern: /\bstun(?:ned|s)?\b/i },
	{ type: "slow", pattern: /\bslow(?:ed|s|ing)?\b/i },
	{ type: "root", pattern: /\b(root(?:ed|s|ing)?|snare(?:d|s|ing)?)\b/i },
	{ type: "knockup", pattern: /\b(knock(?:s|ed)? up|knockup|airborne)\b/i },
	{ type: "pull", pattern: /\b(pull(?:s|ed)?|drag(?:s|ged)?)\b/i },
	{ type: "push", pattern: /\b(push(?:es|ed)?|knock(?:s|ed)? back)\b/i },
	{ type: "taunt", pattern: /\btaunt(?:ed|s)?\b/i },
	{ type: "fear", pattern: /\bfear(?:ed|s|ing)?\b/i },
	{ type: "charm", pattern: /\bcharm(?:ed|s|ing)?\b/i },
	{ type: "sleep", pattern: /\bsleep(?:s|ing)?\b/i },
	{ type: "silence", pattern: /\bsilenc(?:e|ed|es|ing)\b/i },
	{ type: "suppression", pattern: /\bsuppress(?:ed|es|ion)\b/i },
	{ type: "berserk", pattern: /\bberserk\b/i },
	{ type: "blind", pattern: /\bblind(?:ed|s)?\b/i },
	{ type: "grounded", pattern: /\bground(?:ed|ing)\b/i },
	{ type: "polymorph", pattern: /\bpolymorph(?:ed|s)?\b/i },
];

interface ChampionAPIResponse {
	data: ChampionData;
}

interface MobalyticsFlatReference {
	riotId: number;
	slug: string;
	name: string;
	title: string;
	type?: Array<{ flatData?: { slug: string; name: string } }>;
	difficulty?: Array<{ flatData?: ChampionDifficultyDescriptor }>;
	customDifficulty?: Array<{ flatData?: ChampionDifficultyDescriptor }>;
}

interface MobalyticsAbilityReference {
	slug: string;
	name: string;
	activationKey: string;
}

interface MobalyticsChampionStaticResponse {
	riotId: number;
	slug: string;
	name: string;
	title: string;
	lore: string;
	tags: string[];
	damageType: number;
	playStyle: number;
	preMobility: number;
	preToughness: number;
	preControl: number;
	preDamage: number;
	type?: Array<{ flatData?: { slug: string; name: string } }>;
	difficulty?: Array<{ flatData?: ChampionDifficultyDescriptor }>;
	customDifficulty?: Array<{ flatData?: ChampionDifficultyDescriptor }>;
	abilities?: Array<{ flatData?: MobalyticsAbilityReference }>;
}

interface MobalyticsAbilityResponse {
	activationKey: string;
	riotDesc: string;
	mobaDesc: string;
	name: string;
	slug: string;
	stats?: Array<{ slug: string; value: string }>;
	customStats?: Array<{ slug: string; value: string }>;
}

// cycletls spawns a Go helper process per init. We lazily create a single
// instance and tear it down via closeMobalyticsClient() so the long-running bot
// (daily cron) does not leak helper processes between runs.
let _mobalyticsClient: CycleTLSClient | null = null;

async function getMobalyticsClient(): Promise<CycleTLSClient> {
	if (!_mobalyticsClient) {
		_mobalyticsClient = await initCycleTLS();
	}
	return _mobalyticsClient;
}

async function closeMobalyticsClient(): Promise<void> {
	if (_mobalyticsClient) {
		await _mobalyticsClient.exit();
		_mobalyticsClient = null;
	}
}

function decodeHtmlEntities(input: string): string {
	return input.replace(
		/&nbsp;|&amp;|&quot;|&#39;|&#x27;|&lt;|&gt;/g,
		(entity) => HTML_ENTITY_MAP[entity] ?? entity
	);
}

function normalizeText(input: string): string {
	return decodeHtmlEntities(input).replace(/\r/g, "").replace(/\s+/g, " ").trim();
}

function htmlToTextLines(html: string): string[] {
	return decodeHtmlEntities(
		html
			.replace(/<script[\s\S]*?<\/script>/gi, " ")
			.replace(/<style[\s\S]*?<\/style>/gi, " ")
			.replace(/<!--[\s\S]*?-->/g, "")
			.replace(/<[^>]+>/g, "\n")
	)
		.split(/\n+/)
		.map((line) => normalizeText(line))
		.filter(Boolean);
}

function firstDifficulty(
	items?: Array<{ flatData?: ChampionDifficultyDescriptor }>
): ChampionDifficultyDescriptor | null {
	return items?.[0]?.flatData ?? null;
}

async function getLatestVersion(): Promise<string | null> {
	try {
		const response = await axios.get<string[]>(
			"https://ddragon.leagueoflegends.com/api/versions.json"
		);
		return response.data[0];
	} catch (error) {
		console.error("Error fetching latest version:", error);
		return null;
	}
}

async function getChampions(version: string): Promise<ChampionData | null> {
	try {
		const response = await axios.get<ChampionAPIResponse>(
			`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
		);
		return response.data.data;
	} catch (error) {
		console.error(`Error fetching champions for version ${version}:`, error);
		return null;
	}
}

function groupChampionsByRole(champions: ChampionData): Record<string, string[]> {
	const roles: Record<string, string[]> = {
		Fighter: [],
		Mage: [],
		Tank: [],
		Marksman: [],
		Assassin: [],
		Support: [],
	};

	for (const champName in champions) {
		const champ = champions[champName];

		if (champ.tags.includes("Fighter") && champ.tags.includes("Assassin")) {
			roles.Assassin.push(champ.id);
		} else if (champ.tags.includes("Tank") && champ.tags.includes("Support")) {
			roles.Tank.push(champ.id);
			roles.Support.push(champ.id);
		} else {
			const assignedRole = champ.tags[0];
			if (roles[assignedRole]) {
				roles[assignedRole].push(champ.id);
			}
		}
	}
	return roles;
}

async function imageExists(imagePath: string): Promise<boolean> {
	try {
		await access(imagePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Downloads champion images from Data Dragon.
 *
 * When `onlyMissing` is true (default for an unchanged Dragon version) only
 * images that are not already present on disk are fetched — this keeps the
 * daily run cheap while still picking up champions added within the same patch
 * (e.g. a newly released champion). When false (Dragon version changed) every
 * image is re-checked against its stored checksum so updated splash art is
 * refreshed.
 */
async function updateChampionImages(
	champions: ChampionData,
	version: string,
	options: { onlyMissing?: boolean } = {}
): Promise<void> {
	const { onlyMissing = false } = options;
	console.log(
		onlyMissing ? "Checking for missing champion images..." : "Updating champion images..."
	);
	try {
		await mkdir(IMAGES_PATH, { recursive: true });
	} catch {
		// Ignore if the directory already exists
	}

	let totalSuccess = 0;
	let totalFailed = 0;
	let totalSkipped = 0;

	for (const championId in champions) {
		const champion = champions[championId];
		const championImage = champion.image.full;
		const championImageUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championImage}`;
		const imagePath = join(IMAGES_PATH, championImage);

		if (onlyMissing && (await imageExists(imagePath))) {
			totalSkipped++;
			continue;
		}

		try {
			const response = await axios.get<ArrayBuffer>(championImageUrl, {
				responseType: "arraybuffer",
			});
			const imageBuffer = Buffer.from(response.data);
			const checksum = championRepository.createChecksum(imageBuffer);

			if (!(await championRepository.verifyChecksum(championImage, checksum))) {
				await writeFile(imagePath, imageBuffer);
				await championRepository.saveChecksum(championImage, checksum);
				console.log(`Updated ${championImage}`);
				totalSuccess++;
			}
		} catch (error) {
			console.error(`Failed to download ${championImage}: ${(error as Error).message}`);
			totalFailed++;
		}
	}
	console.log(
		`Champion images updated. Success: ${totalSuccess}, Failed: ${totalFailed}, Skipped (already present): ${totalSkipped}`
	);
}

// Reads a short, single-line snippet of a (failed) cycletls response body for
// diagnostics. Cloudflare/edge rejections (e.g. status 495) return an HTML
// challenge or error page; capturing it tells us whether we are blocked by IP
// reputation, a TLS challenge, or something else. Best-effort: never throws.
async function readResponseBodySnippet(response: {
	text: () => Promise<string>;
}): Promise<string> {
	try {
		const body = await response.text();
		return body.replace(/\s+/g, " ").trim().slice(0, 300);
	} catch {
		return "";
	}
}

async function postStaticQuery<TData>(
	operationName: string,
	query: string,
	variables: Record<string, unknown>
): Promise<TData> {
	const client = await getMobalyticsClient();
	const response = await client.post(MOBA_STATIC_GQL_URL, {
		ja3: MOBA_JA3,
		userAgent: MOBA_USER_AGENT,
		timeout: 30,
		headers: {
			...MOBA_HEADERS,
			"x-moba-proxy-gql-ops-name": operationName,
		},
		body: JSON.stringify({ operationName, variables, query }),
	});

	if (response.status < 200 || response.status >= 300) {
		const diagnosticBody = await readResponseBodySnippet(response);
		throw new Error(
			`Mobalytics GraphQL ${operationName} failed with status ${response.status}` +
				(diagnosticBody ? ` | body: ${diagnosticBody}` : "")
		);
	}

	const payload = (await response.json()) as { data: TData };
	return payload.data;
}

async function fetchMobalyticsChampionIndex(): Promise<Map<number, MobalyticsFlatReference>> {
	const data = await postStaticQuery<{ champions: Array<{ flatData: MobalyticsFlatReference }> }>(
		"MobalyticsChampionsIndexQuery",
		ALL_CHAMPIONS_STATIC_QUERY,
		{}
	);
	return new Map(
		(data.champions ?? [])
			.map((entry) => entry.flatData)
			.filter(Boolean)
			.map((flatData) => [flatData.riotId, flatData])
	);
}

async function fetchChampionStaticData(
	slug: string
): Promise<MobalyticsChampionStaticResponse | null> {
	try {
		const data = await postStaticQuery<{
			championCommonInfo: Array<{ flatData: MobalyticsChampionStaticResponse }>;
		}>("MobalyticsChampionStaticQuery", CHAMPION_STATIC_QUERY, {
			filter: `data/slug/iv eq '${slug}'`,
		});
		return data.championCommonInfo?.[0]?.flatData ?? null;
	} catch (error) {
		console.error(`Failed to fetch static Mobalytics data for ${slug}:`, (error as Error).message);
		return null;
	}
}

async function fetchAbilityData(abilitySlug: string): Promise<MobalyticsAbilityResponse | null> {
	try {
		const data = await postStaticQuery<{ items: Array<{ flatData: MobalyticsAbilityResponse }> }>(
			"LolChampionAbilityBySlug",
			ABILITY_QUERY,
			{
				filter: `data/slug/iv eq '${abilitySlug}'`,
			}
		);
		return data.items?.[0]?.flatData ?? null;
	} catch (error) {
		console.error(`Failed to fetch ability data for ${abilitySlug}:`, (error as Error).message);
		return null;
	}
}

async function fetchAramHtml(slug: string): Promise<string | null> {
	try {
		const client = await getMobalyticsClient();
		const response = await client.get(`${MOBA_BASE_URL}/lol/champions/${slug}/aram-builds`, {
			ja3: MOBA_JA3,
			userAgent: MOBA_USER_AGENT,
			timeout: 30,
			headers: {
				accept: "text/html",
				"accept-language": "en_us",
				referer: `${MOBA_BASE_URL}/lol`,
			},
		});

		if (response.status < 200 || response.status >= 300) {
			const diagnosticBody = await readResponseBodySnippet(response);
			throw new Error(`status ${response.status}${diagnosticBody ? ` | body: ${diagnosticBody}` : ""}`);
		}

		return await response.text();
	} catch (error) {
		console.error(`Failed to fetch ARAM page for ${slug}:`, (error as Error).message);
		return null;
	}
}

function classifyAbilityTags(
	ability: Pick<ChampionEnrichedAbility, "activationKey" | "name" | "riotDesc" | "mobaDesc">
) {
	const source = normalizeText(`${ability.riotDesc} ${ability.mobaDesc}`.toLowerCase())
		.replace(/this ability'?s cooldown is reduced[^.]*\./gi, " ")
		.replace(/this can happen once per ability cast\./gi, " ");
	const tags = new Set<string>();
	const ccTypes = new Set<string>();
	const hasAllyReference = /\b(ally|allies)\b/i.test(source);

	for (const rule of CC_RULES) {
		if (rule.pattern.test(source)) {
			ccTypes.add(rule.type);
		}
	}

	if (ccTypes.size > 0) {
		tags.add("CC");
	}

	if (
		/\b(all enemies|all hit|all enemies hit|enemies in the area|enemies hit|nearby enemies|area in front|in an area|cone|wave of|through enemies|around (?:himself|herself|the target|them)|within the area|line of)\b/i.test(
			source
		)
	) {
		tags.add("AOE");
	}

	if (/\b(heal(?:s|ed|ing)?|restores? health)\b/i.test(source)) {
		tags.add("HEAL");
	}

	if (
		/\b(regenerat(?:e|es|ed|ing)|rejuvenat(?:e|es|ed|ing)|restores? health (?:over time|each second)|heals? over time)\b/i.test(
			source
		)
	) {
		tags.add("REGEN");
	}

	if (/\bshield(?:s|ed|ing)?\b/i.test(source)) {
		tags.add("SHIELD");
	}

	if (
		/\b(revive(?:s|d)?|revived|resurrect(?:s|ed|ion)?|reborn|return to life|brought back to life)\b/i.test(
			source
		) ||
		/\b(delaying their death|delay(?:s|ed)? their death|saving them if they get a takedown)\b/i.test(
			source
		)
	) {
		tags.add("REVIVE");
	}

	if (
		/\b(cleanse(?:s|d)?|removes? (?:all )?(?:debuffs|crowd control|disables)|dispel(?:s|led)?|becomes? unstoppable)\b/i.test(
			source
		)
	) {
		tags.add("CLEANSE");
	}

	if (
		/\b(bonus movement speed|movement speed to allies|grants? movement speed|accelerates?)\b/i.test(
			source
		)
	) {
		tags.add("HASTE");
	}

	if (hasAllyReference && /\b(armor|armour|bonus armor)\b/i.test(source)) {
		tags.add("ARMOR_BUFF");
	}

	if (hasAllyReference && /\b(magic resist|mr|resistances?)\b/i.test(source)) {
		tags.add("RESIST_BUFF");
	}

	if (
		hasAllyReference &&
		/\b(buff(?:s|ed|ing)?|grants?|gives?|gain|bonus|increase(?:s|d)?|restore|heal|shield|revive|cleanse|armor|armour|magic resist|tenacity|movement speed|attack speed|adaptive force|omnivamp|lifesteal)\b/i.test(
			source
		)
	) {
		tags.add("ALLY_BUFF");
	}

	if (
		/\b(dash(?:es|ed|ing)?|blink(?:s|ed|ing)?|leap(?:s|ed|ing)?|jump(?:s|ed|ing)?|vault(?:s|ed|ing)?|teleport(?:s|ed|ing)?|lunge(?:s|d|ing)?|rush(?:es|ed|ing)?)\b/i.test(
			source
		)
	) {
		tags.add("MOBILITY");
	}

	if (
		tags.has("MOBILITY") ||
		/\b(knock(?:s|ed)? up|pull(?:s|ed)?|hook|taunt(?:s|ed)?|suppression|fear(?:s|ed)?|charm(?:s|ed)?)\b/i.test(
			source
		)
	) {
		tags.add("ENGAGE");
	}

	if (
		tags.has("HEAL") ||
		tags.has("SHIELD") ||
		tags.has("REGEN") ||
		tags.has("REVIVE") ||
		tags.has("CLEANSE") ||
		tags.has("HASTE") ||
		tags.has("ALLY_BUFF") ||
		tags.has("ARMOR_BUFF") ||
		tags.has("RESIST_BUFF") ||
		/\b(ally|allies|escape|protect|peel|movement speed|bonus movement speed)\b/i.test(source)
	) {
		tags.add("PEEL");
	}

	if (/\b(execute|execution|missing health)\b/i.test(source)) {
		tags.add("EXECUTE");
	}

	if (
		/\b(damage amplification|reduce(?:s|d)? armor|reduce(?:s|d)? magic resist|vulnerable)\b/i.test(
			source
		)
	) {
		tags.add("DAMAGE_AMP");
	}

	if (tags.has("AOE") && ccTypes.size > 0 && ability.activationKey === "R") {
		tags.add("WOMBO");
	}

	return {
		tags: [...tags],
		ccTypes: [...ccTypes],
	};
}

function parsePercentage(line: string): string | null {
	const match = line.match(/[+-]?\d+(?:\.\d+)?%/);
	return match?.[0] ?? null;
}

function parseMatches(line: string): number | null {
	const normalized = line.replace(/[^\d]/g, "");
	if (!normalized) {
		return null;
	}
	const parsed = Number.parseInt(normalized, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseAramDataFromHtml(
	slug: string,
	championName: string,
	html: string
): ChampionMobalyticsAramData {
	const lines = htmlToTextLines(html);
	const sourceUrl = `${MOBA_BASE_URL}/lol/champions/${slug}/aram-builds`;
	const headlineIndex = lines.findIndex((line) =>
		line.toLowerCase().includes(`${championName.toLowerCase()} has a`)
	);
	let winRate: string | null = null;
	let pickRate: string | null = null;
	let tier: string | null = null;

	if (headlineIndex !== -1) {
		const headline = lines[headlineIndex];
		const match = headline.match(/has a ([\d.]+%) win rate and ([\d.]+%) pick rate/i);
		winRate = match?.[1] ?? null;
		pickRate = match?.[2] ?? null;
		const tierLine = lines[headlineIndex + 1] ?? "";
		const tierMatch = tierLine.match(/ranked ([A-Z]) tier/i);
		tier = tierMatch?.[1] ?? null;
	}

	const matchesIndex = lines.indexOf("Matches");
	const damageDealtIndex = lines.indexOf("Damage Dealt");
	const damageReceivedIndex = lines.indexOf("Damage Received");
	const otherEffectsIndex = lines.indexOf("Other effects");
	const combosHeadingIndex = lines.findIndex((line) => /aram combos/i.test(line));
	const matches = matchesIndex !== -1 ? parseMatches(lines[matchesIndex + 1] ?? "") : null;

	const combos: ChampionAramCombo[] = [];
	if (combosHeadingIndex !== -1) {
		const comboLines = lines.slice(combosHeadingIndex + 1);
		let cursor = 0;
		while (cursor < comboLines.length) {
			const line = comboLines[cursor];
			if (/see all .* combos/i.test(line) || /related champions/i.test(line)) {
				break;
			}

			const sequence: string[] = [];
			while (cursor < comboLines.length && /^(AA|EAA|PASSIVE|Q|W|E|R)$/i.test(comboLines[cursor])) {
				sequence.push(comboLines[cursor].toUpperCase());
				cursor += 1;
			}

			const description = comboLines[cursor] ?? "";
			const difficultyCandidate = comboLines[cursor + 1] ?? "";
			if (sequence.length > 0 && description) {
				combos.push({
					sequence,
					description,
					difficulty: /^(Easy|Medium|Hard)$/i.test(difficultyCandidate)
						? difficultyCandidate
						: null,
				});
			}

			cursor += 1;
			if (/^(Easy|Medium|Hard)$/i.test(comboLines[cursor] ?? "")) {
				cursor += 1;
			}
			if (/^More info$/i.test(comboLines[cursor] ?? "")) {
				cursor += 1;
			}
		}
	}

	return {
		sourceUrl,
		winRate,
		pickRate,
		tier,
		matches,
		balance: {
			damageDealt:
				damageDealtIndex !== -1 ? parsePercentage(lines[damageDealtIndex + 1] ?? "") : null,
			damageReceived:
				damageReceivedIndex !== -1 ? parsePercentage(lines[damageReceivedIndex + 1] ?? "") : null,
			otherEffects: otherEffectsIndex !== -1 ? (lines[otherEffectsIndex + 1] ?? null) : null,
		},
		combos,
	};
}

async function mapWithConcurrency<TInput, TOutput>(
	items: TInput[],
	concurrency: number,
	mapper: (item: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
	const results: TOutput[] = new Array(items.length);
	let cursor = 0;

	async function worker(): Promise<void> {
		while (true) {
			const currentIndex = cursor;
			cursor += 1;
			if (currentIndex >= items.length) {
				return;
			}
			results[currentIndex] = await mapper(items[currentIndex], currentIndex);
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(concurrency, items.length) }, async () => {
			await worker();
		})
	);

	return results;
}

async function enrichChampion(
	champion: Champion,
	mobaIndex: Map<number, MobalyticsFlatReference>
): Promise<Champion> {
	const riotId = Number.parseInt(champion.key, 10);
	const mobaRef = mobaIndex.get(riotId);

	if (!mobaRef) {
		console.log(
			`Mobalytics data not found for champion ${champion.name}, key: ${champion.key}, riotId: ${riotId}`
		);
		return champion;
	}

	const staticData = await fetchChampionStaticData(mobaRef.slug);
	const aramHtml = await fetchAramHtml(mobaRef.slug);
	const abilityRefs =
		staticData?.abilities
			?.map((entry) => entry.flatData)
			.filter((ability): ability is MobalyticsAbilityReference => Boolean(ability)) ?? [];

	const abilities = (
		await Promise.all(
			abilityRefs.map(async (abilityRef) => {
				const abilityData = await fetchAbilityData(abilityRef.slug);
				if (!abilityData) {
					console.log(
						`Mobalytics ability data not found for champion ${champion.name}, abilityRef: ${abilityRef.slug}`
					);
					return null;
				}

				const derived = classifyAbilityTags({
					activationKey: abilityData.activationKey,
					name: abilityData.name,
					riotDesc: abilityData.riotDesc,
					mobaDesc: abilityData.mobaDesc,
				});

				return {
					activationKey: abilityData.activationKey,
					name: abilityData.name,
					slug: abilityData.slug,
					riotDesc: normalizeText(abilityData.riotDesc ?? ""),
					mobaDesc: normalizeText(abilityData.mobaDesc ?? ""),
					stats: abilityData.stats ?? [],
					customStats: abilityData.customStats ?? [],
					tags: derived.tags,
					ccTypes: derived.ccTypes,
				} satisfies ChampionEnrichedAbility;
			})
		)
	).filter((ability): ability is ChampionEnrichedAbility => Boolean(ability));

	const abilityTags = new Set<string>();
	const ccTypes = new Set<string>();
	for (const ability of abilities) {
		for (const tag of ability.tags) {
			abilityTags.add(tag);
		}
		for (const ccType of ability.ccTypes) {
			ccTypes.add(ccType);
		}
	}

	return {
		...champion,
		mobalytics: {
			slug: mobaRef.slug,
			tags: staticData?.tags ?? champion.tags,
			types:
				staticData?.type
					?.map((entry) => entry.flatData?.name)
					.filter((typeName): typeName is string => Boolean(typeName)) ?? champion.tags,
			difficulty: firstDifficulty(staticData?.difficulty ?? mobaRef.difficulty),
			customDifficulty: firstDifficulty(staticData?.customDifficulty ?? mobaRef.customDifficulty),
			damageType: staticData?.damageType ?? null,
			playStyle: staticData?.playStyle ?? null,
			preMobility: staticData?.preMobility ?? null,
			preToughness: staticData?.preToughness ?? null,
			preControl: staticData?.preControl ?? null,
			preDamage: staticData?.preDamage ?? null,
			abilities,
			abilityTags: [...abilityTags],
			ccTypes: [...ccTypes],
			hasCc: abilityTags.has("CC"),
			hasAoe: abilityTags.has("AOE"),
			aram: aramHtml ? parseAramDataFromHtml(mobaRef.slug, champion.name, aramHtml) : null,
			enrichedAt: new Date().toISOString(),
		},
	};
}

/**
 * Builds a champion set from fresh Data Dragon data while preserving any
 * previously-enriched Mobalytics fields from the existing champions.json.
 * Used as a fallback when Mobalytics enrichment fails so that the core
 * Data Dragon data is always persisted without losing past enrichment.
 */
async function buildFallbackChampions(base: ChampionData): Promise<ChampionData> {
	let existing: ChampionData = {};
	try {
		existing = await championRepository.readChampions();
	} catch (error) {
		console.error(
			"Could not read existing champions.json for fallback merge:",
			(error as Error).message
		);
	}

	const result: ChampionData = {};
	for (const [championId, champion] of Object.entries(base)) {
		const previousMobalytics = existing[championId]?.mobalytics;
		result[championId] = previousMobalytics
			? { ...champion, mobalytics: previousMobalytics }
			: champion;
	}
	return result;
}

async function enrichChampionsWithMobalytics(champions: ChampionData): Promise<ChampionData> {
	console.log("Fetching Mobalytics champion index...");
	const mobaIndex = await fetchMobalyticsChampionIndex();
	const championEntries = Object.entries(champions);
	let completed = 0;

	const enrichedEntries = await mapWithConcurrency(
		championEntries,
		MAX_CONCURRENT_ENRICHES,
		async ([championId, champion]) => {
			const enrichedChampion = await enrichChampion(champion, mobaIndex);
			completed += 1;
			if (completed % 10 === 0 || completed === championEntries.length) {
				console.log(`Mobalytics enrich progress: ${completed}/${championEntries.length}`);
			}
			return [championId, enrichedChampion] as const;
		}
	);

	return Object.fromEntries(enrichedEntries);
}

export async function updateChampions(): Promise<void> {
	console.log("Checking for new champion data...");
	const [config] = await toAwait(readConfig());
	const latestVersion = await getLatestVersion();
	const effectiveVersion = latestVersion ?? config?.DRAGON_VERSION;

	if (!effectiveVersion) {
		console.log("Could not determine a Dragon version. Skipping update.");
		return;
	}

	const versionChanged = effectiveVersion !== config?.DRAGON_VERSION;
	if (versionChanged) {
		console.log(`New version found: ${effectiveVersion}. Updating champions...`);
	} else {
		console.log(`Dragon version ${effectiveVersion} is current. Refreshing enrichment data...`);
	}

	const champions = await getChampions(effectiveVersion);
	if (!champions) {
		console.log("Could not fetch champions. Skipping update.");
		return;
	}

	console.log(`Fetched ${Object.keys(champions).length} champions from Data Dragon.`);

	const newRoles = groupChampionsByRole(champions);
	const newConfig: Config = {
		FALLBACK_ROLES: {
			Fighter: ["Tank", "Assassin"],
			Mage: ["Support", "Assassin"],
			Tank: ["Fighter", "Support"],
			Marksman: ["Assassin", "Mage"],
			Assassin: ["Fighter", "Marksman", "Mage"],
			Support: ["Mage", "Tank"],
		},
		...config,
		DRAGON_VERSION: effectiveVersion,
		CHAMPION_ROLES: newRoles,
	};

	await writeConfig(newConfig);

	// Mobalytics enrichment is an optional add-on. If it fails we still persist
	// the core Data Dragon champion data (preserving any prior enrichment) so the
	// bot keeps working, and we raise a Telegram alert to investigate.
	console.log("Enriching champions with Mobalytics ARAM and ability data...");
	let enrichedChampions: ChampionData;
	let enrichmentError: Error | null = null;
	try {
		enrichedChampions = await enrichChampionsWithMobalytics(champions);
	} catch (error) {
		enrichmentError = error as Error;
		console.error(
			"Mobalytics enrichment failed; persisting Data Dragon base data:",
			enrichmentError.message
		);
		enrichedChampions = await buildFallbackChampions(champions);
	} finally {
		await closeMobalyticsClient();
	}

	let championsPersisted = true;
	try {
		console.log("Writing champions.json file...");
		await championRepository.writeChampions(enrichedChampions);
		console.log("Champions data updated successfully.");
	} catch (error) {
		championsPersisted = false;
		console.error("Error writing champions.json file:", error);
		await sendTelegramAlert(
			`🚨 <b>discord-lol-champions</b>\nFailed to write champions.json for Dragon version <code>${effectiveVersion}</code>.\n<code>${(error as Error).message}</code>`
		);
	}

	if (championsPersisted) {
		await championService.reloadChampions();
	}

	// Always ensure images exist. On a version change re-check every image
	// (splash art may have been updated); otherwise only fetch images missing
	// from disk so newly released champions still get downloaded cheaply.
	if (versionChanged) {
		await updateChampionImages(champions, effectiveVersion);
	} else {
		await updateChampionImages(champions, effectiveVersion, { onlyMissing: true });
	}

	if (enrichmentError) {
		await sendTelegramAlert(
			`⚠️ <b>discord-lol-champions</b>\nMobalytics enrichment failed for Dragon version <code>${effectiveVersion}</code>. Champion data was saved with Data Dragon base + last known enrichment.\nReason: <code>${enrichmentError.message}</code>`
		);
	}
}

if (import.meta.main) {
	updateChampions();
}
