import { readConfig } from "../core/config.ts";
import { getChampionById, getChampions } from "./championService.ts";
import type {
	Champion,
	ChampionRoleKey,
	TeamGenerationMetadata,
	TeamResult,
	TeamSideRolePools,
	TeamSynergyAnalysis,
	TeamSynergyScores,
	SynergyMetricKey,
	SynergyMetricScore,
} from "../types/index.ts";

const MAX_METRIC_SCORE = 100;
const ROLE_COMPLETENESS_WEIGHT = 55;
const PRIMARY_ROLE_QUALITY_WEIGHT = 45;
const DAMAGE_BALANCE_TARGET_RATIO = 0.5;
const DAMAGE_BALANCE_TOLERANCE = 0.18;
const ENGAGE_BASELINE = 28;
const ENGAGE_TAG_BONUS = 10;
const ENGAGE_FRONTLINE_BONUS = 8;
const CC_BASELINE = 20;
const CC_CONTROL_TAG_BONUS = 10;
const CC_MAGE_UTILITY_BONUS = 5;
const PEEL_BASELINE = 18;
const PEEL_SUPPORT_BONUS = 11;
const PEEL_DEFENSE_BONUS = 7;
const SCALING_BASELINE = 22;
const SCALING_CARRY_BONUS = 10;
const SCALING_GROWTH_BONUS = 7;
const HIGH_DEFENSE_THRESHOLD = 6;
const HIGH_MAGIC_THRESHOLD = 7;
const HIGH_ATTACK_THRESHOLD = 7;
const LONG_RANGE_THRESHOLD = 525;
const HIGH_HEALTH_THRESHOLD = 620;
const HIGH_CC_MOVESPEED_THRESHOLD = 335;
const SUMMARY_METRIC_LABELS: Record<SynergyMetricKey, string> = {
	engage: "engage",
	damageBalance: "damage balance",
	cc: "CC",
	peel: "peel",
	scaling: "scaling",
	laneStability: "lane stability",
};

interface SideAnalysisInput {
	side: "blue" | "red";
	poolSize: number;
	roleOrder: ChampionRoleKey[];
	team: string[];
	rolePools: TeamSideRolePools;
}

interface MatchAnalysisResult {
	blue: TeamSynergyAnalysis;
	red: TeamSynergyAnalysis;
	summaryText: string;
}

function clampScore(score: number): number {
	return Math.max(0, Math.min(MAX_METRIC_SCORE, Math.round(score)));
}

function labelScore(score: number): string {
	if (score >= 80) {
		return "elite";
	}
	if (score >= 65) {
		return "strong";
	}
	if (score >= 50) {
		return "steady";
	}
	if (score >= 35) {
		return "shaky";
	}
	return "thin";
}

function getTeamChampions(team: string[]): Champion[] {
	return team.map((championId) => getChampionById(championId));
}

function hasAnyTag(champion: Champion, tags: string[]): boolean {
	return champion.tags.some((tag) => tags.includes(tag));
}

function scoreMetric(score: number, evidence: string[]): SynergyMetricScore {
	const normalizedScore = clampScore(score);
	return {
		score: normalizedScore,
		label: labelScore(normalizedScore),
		evidence: evidence.slice(0, 3),
	};
}

function calculateEngageScore(champions: Champion[]): SynergyMetricScore {
	let score = ENGAGE_BASELINE;
	let engageCount = 0;
	let frontlineCount = 0;
	let speedCount = 0;

	for (const champion of champions) {
		if (hasAnyTag(champion, ["Tank", "Fighter", "Assassin"])) {
			score += ENGAGE_TAG_BONUS;
			engageCount += 1;
		}
		if (champion.info.defense >= HIGH_DEFENSE_THRESHOLD || champion.stats.hp >= HIGH_HEALTH_THRESHOLD) {
			score += ENGAGE_FRONTLINE_BONUS;
			frontlineCount += 1;
		}
		if (champion.stats.movespeed >= HIGH_CC_MOVESPEED_THRESHOLD) {
			score += 4;
			speedCount += 1;
		}
	}

	return scoreMetric(score, [
		`${engageCount} engage-ready tags`,
		`${frontlineCount} frontliners`,
		`${speedCount} fast starters`,
	]);
}

function calculateDamageBalanceScore(champions: Champion[]): SynergyMetricScore {
	const attackPower = champions.reduce((sum, champion) => sum + champion.info.attack, 0);
	const magicPower = champions.reduce((sum, champion) => sum + champion.info.magic, 0);
	const totalPower = Math.max(1, attackPower + magicPower);
	const attackRatio = attackPower / totalPower;
	const ratioDelta = Math.abs(attackRatio - DAMAGE_BALANCE_TARGET_RATIO);
	const normalizedDelta = Math.min(1, ratioDelta / DAMAGE_BALANCE_TOLERANCE);
	const score = MAX_METRIC_SCORE - normalizedDelta * 55;

	return scoreMetric(score, [
		`attack share ${Math.round(attackRatio * 100)}%`,
		`magic share ${Math.round((1 - attackRatio) * 100)}%`,
		ratioDelta <= 0.08 ? "mixed threats stay honest" : "leans into one damage profile",
	]);
}

function calculateCcScore(champions: Champion[]): SynergyMetricScore {
	let score = CC_BASELINE;
	let controlTags = 0;
	let utilityMages = 0;
	let longRangeSupports = 0;

	for (const champion of champions) {
		if (hasAnyTag(champion, ["Tank", "Support", "Fighter"])) {
			score += CC_CONTROL_TAG_BONUS;
			controlTags += 1;
		}
		if (champion.tags.includes("Mage") && champion.info.magic >= HIGH_MAGIC_THRESHOLD) {
			score += CC_MAGE_UTILITY_BONUS;
			utilityMages += 1;
		}
		if (
			champion.stats.attackrange >= LONG_RANGE_THRESHOLD &&
			hasAnyTag(champion, ["Support", "Mage"])
		) {
			score += 4;
			longRangeSupports += 1;
		}
	}

	return scoreMetric(score, [
		`${controlTags} control-heavy picks`,
		`${utilityMages} utility mages`,
		`${longRangeSupports} long-range setup tools`,
	]);
}

function calculatePeelScore(champions: Champion[]): SynergyMetricScore {
	let score = PEEL_BASELINE;
	let peelTags = 0;
	let defensiveCore = 0;
	let rangedBackline = 0;

	for (const champion of champions) {
		if (hasAnyTag(champion, ["Support", "Tank"])) {
			score += PEEL_SUPPORT_BONUS;
			peelTags += 1;
		}
		if (champion.info.defense >= HIGH_DEFENSE_THRESHOLD) {
			score += PEEL_DEFENSE_BONUS;
			defensiveCore += 1;
		}
		if (champion.stats.attackrange >= LONG_RANGE_THRESHOLD && champion.info.attack >= 5) {
			score += 4;
			rangedBackline += 1;
		}
	}

	return scoreMetric(score, [
		`${peelTags} peel-oriented tags`,
		`${defensiveCore} durable protectors`,
		`${rangedBackline} ranged backline anchors`,
	]);
}

function calculateScalingScore(champions: Champion[]): SynergyMetricScore {
	let score = SCALING_BASELINE;
	let lateGameCarries = 0;
	let growthProfiles = 0;
	let safeRange = 0;

	for (const champion of champions) {
		if (hasAnyTag(champion, ["Marksman", "Mage", "Assassin"]) || champion.info.attack >= HIGH_ATTACK_THRESHOLD) {
			score += SCALING_CARRY_BONUS;
			lateGameCarries += 1;
		}
		if (champion.stats.hpperlevel >= 100 || champion.stats.armorperlevel >= 4) {
			score += SCALING_GROWTH_BONUS;
			growthProfiles += 1;
		}
		if (champion.stats.attackrange >= LONG_RANGE_THRESHOLD) {
			score += 3;
			safeRange += 1;
		}
	}

	return scoreMetric(score, [
		`${lateGameCarries} scaling carries`,
		`${growthProfiles} stat-growth picks`,
		`${safeRange} long-range closers`,
	]);
}

async function calculateLaneStabilityScore(
	rolePools: TeamSideRolePools,
	poolSize: number
): Promise<SynergyMetricScore> {
	const config = await readConfig();
	let completenessScore = 0;
	let primaryRoleScore = 0;
	const evidence: string[] = [];

	for (const role of Object.keys(rolePools) as ChampionRoleKey[]) {
		const picks = rolePools[role];
		const roleCompleteness = poolSize === 0 ? 0 : picks.length / poolSize;
		completenessScore += roleCompleteness;

		const primaryRoleChampions = new Set(config.CHAMPION_ROLES[role] || []);
		const primaryMatches = picks.filter((championId) => primaryRoleChampions.has(championId)).length;
		const primaryRoleRatio = picks.length === 0 ? 0 : primaryMatches / picks.length;
		primaryRoleScore += primaryRoleRatio;

		evidence.push(`${role}:${primaryMatches}/${Math.max(1, picks.length)} primary-fit`);
	}

	const normalizedCompleteness = completenessScore / 6;
	const normalizedPrimaryQuality = primaryRoleScore / 6;
	const score =
		normalizedCompleteness * ROLE_COMPLETENESS_WEIGHT +
		normalizedPrimaryQuality * PRIMARY_ROLE_QUALITY_WEIGHT;

	return scoreMetric(score, evidence);
}

async function calculateScores(input: SideAnalysisInput): Promise<TeamSynergyScores> {
	const champions = getTeamChampions(input.team);

	return {
		engage: calculateEngageScore(champions),
		damageBalance: calculateDamageBalanceScore(champions),
		cc: calculateCcScore(champions),
		peel: calculatePeelScore(champions),
		scaling: calculateScalingScore(champions),
		laneStability: await calculateLaneStabilityScore(input.rolePools, input.poolSize),
	};
}

function findStrongestMetric(scores: TeamSynergyScores): [SynergyMetricKey, SynergyMetricScore] {
	return (Object.entries(scores) as Array<[SynergyMetricKey, SynergyMetricScore]>).reduce((best, entry) =>
		entry[1].score > best[1].score ? entry : best
	);
}

function findWeakestMetric(scores: TeamSynergyScores): [SynergyMetricKey, SynergyMetricScore] {
	return (Object.entries(scores) as Array<[SynergyMetricKey, SynergyMetricScore]>).reduce((weakest, entry) =>
		entry[1].score < weakest[1].score ? entry : weakest
	);
}

function formatSideSummaryLine(analysis: TeamSynergyAnalysis): string {
	const metricSummary = (Object.entries(analysis.scores) as Array<[SynergyMetricKey, SynergyMetricScore]>)
		.map(
			([metricKey, metricScore]) =>
				`${SUMMARY_METRIC_LABELS[metricKey]} ${metricScore.score}`
		)
		.join(" | ");
	return `${analysis.side.toUpperCase()}: ${metricSummary}`;
}

function averageScore(scores: TeamSynergyScores): number {
	return (
		Object.values(scores).reduce((total, metric) => total + metric.score, 0) /
		Object.values(scores).length
	);
}

function formatOverallTakeaway(blue: TeamSynergyAnalysis, red: TeamSynergyAnalysis): string {
	const blueAverage = averageScore(blue.scores);
	const redAverage = averageScore(red.scores);
	const betterSide = blueAverage >= redAverage ? blue : red;
	const trailingSide = betterSide.side === "blue" ? red : blue;
	const [bestMetric] = findStrongestMetric(betterSide.scores);
	const [weakMetric] = findWeakestMetric(trailingSide.scores);

	return `${betterSide.side.toUpperCase()} is the steadier pool through ${SUMMARY_METRIC_LABELS[bestMetric]}; ${trailingSide.side.toUpperCase()} needs cleaner ${SUMMARY_METRIC_LABELS[weakMetric]}.`;
}

export async function analyzeTeamSide(input: SideAnalysisInput): Promise<TeamSynergyAnalysis> {
	const scores = await calculateScores(input);
	const summaryLine = formatSideSummaryLine({
		...input,
		scores,
		summaryLine: "",
		takeaway: "",
	});
	const [strongestMetricKey, strongestMetric] = findStrongestMetric(scores);
	const [weakestMetricKey] = findWeakestMetric(scores);

	return {
		...input,
		scores,
		summaryLine,
		takeaway: `${input.side.toUpperCase()} leans on ${SUMMARY_METRIC_LABELS[strongestMetricKey]} (${strongestMetric.label}) but can still improve ${SUMMARY_METRIC_LABELS[weakestMetricKey]}.`,
	};
}

export async function analyzeGeneratedTeams(teamResult: TeamResult): Promise<MatchAnalysisResult> {
	const blue = await analyzeTeamSide({
		side: "blue",
		poolSize: teamResult.metadata.poolSize,
		roleOrder: teamResult.metadata.roleOrder,
		team: teamResult.blueTeam,
		rolePools: teamResult.metadata.blueRolePools,
	});
	const red = await analyzeTeamSide({
		side: "red",
		poolSize: teamResult.metadata.poolSize,
		roleOrder: teamResult.metadata.roleOrder,
		team: teamResult.redTeam,
		rolePools: teamResult.metadata.redRolePools,
	});

	return {
		blue,
		red,
		summaryText: formatCompactSummary(blue, red),
	};
}

export function formatCompactSummary(blue: TeamSynergyAnalysis, red: TeamSynergyAnalysis): string {
	return [formatSideSummaryLine(blue), formatSideSummaryLine(red), formatOverallTakeaway(blue, red)].join(
		"\n"
	);
}

export function getRoleOnlyAnalysisNotice(role: string, poolSize: number): string {
	return `Role-only pool for ${role} (${poolSize} per side). Full synergy scorecard skipped because this command does not cover all six roles.`;
}

export function createCompositionSignature(teamResult: TeamResult): string {
	const normalizedSide = (team: string[], rolePools: TeamGenerationMetadata["blueRolePools"]) =>
		(
			Object.keys(rolePools) as ChampionRoleKey[]
		)
			.map((role) => `${role}:${[...rolePools[role]].sort().join(",")}`)
			.join("|") + `#team:${[...team].sort().join(",")}`;

	return [
		teamResult.metadata.mode,
		teamResult.metadata.poolSize,
		normalizedSide(teamResult.blueTeam, teamResult.metadata.blueRolePools),
		normalizedSide(teamResult.redTeam, teamResult.metadata.redRolePools),
	].join("::");
}

export function ensureChampionDatasetLoaded(): void {
	if (Object.keys(getChampions()).length === 0) {
		throw new Error("Champion dataset is empty. Load champions before running synergy analysis.");
	}
}
