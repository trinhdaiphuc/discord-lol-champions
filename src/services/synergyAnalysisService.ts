import { readConfig } from "../core/config.ts";
import { getChampionById, getChampions } from "./championService.ts";
import type {
	Champion,
	ChampionEnrichedAbility,
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
const DAMAGE_BALANCE_TOLERANCE = 0.2;
const LONG_RANGE_THRESHOLD = 525;
const HIGH_DEFENSE_THRESHOLD = 6;
const HIGH_HEALTH_THRESHOLD = 620;
const MAX_META_WIN_RATE = 60;
const MIN_META_WIN_RATE = 45;
const HARD_CC_TYPES = new Set([
	"stun",
	"root",
	"knockup",
	"pull",
	"push",
	"taunt",
	"fear",
	"charm",
	"sleep",
	"silence",
	"suppression",
	"berserk",
	"polymorph",
]);
const SOFT_CC_TYPES = new Set(["slow", "blind", "grounded"]);
const SUMMARY_METRIC_LABELS: Record<SynergyMetricKey, string> = {
	engage: "Mở giao tranh",
	damageBalance: "Cân bằng sát thương",
	cc: "Khống chế",
	peel: "Bảo kê",
	scaling: "Thăng tiến",
	laneStability: "Độ ổn định đội hình",
};
const ANSI_RESET = "\u001b[0m";
const ANSI_BOLD = "\u001b[1m";
const ANSI_BLUE = "\u001b[34m";
const ANSI_RED = "\u001b[31m";
const ANSI_GREEN = "\u001b[32m";
const ANSI_YELLOW = "\u001b[33m";
const ANSI_CYAN = "\u001b[36m";

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

interface ChampionCombatProfile {
	champion: Champion;
	hardCcTypes: string[];
	softCcTypes: string[];
	hardCcAbilities: number;
	softCcAbilities: number;
	aoeAbilities: number;
	aoeCcAbilities: number;
	engageAbilities: number;
	peelAbilities: number;
	healAbilities: number;
	shieldAbilities: number;
	regenAbilities: number;
	allyBuffAbilities: number;
	armorBuffAbilities: number;
	resistBuffAbilities: number;
	cleanseAbilities: number;
	reviveAbilities: number;
	hasteAbilities: number;
	mobilityAbilities: number;
	womboAbilities: number;
	damageAmpAbilities: number;
	executeAbilities: number;
	magicShare: number;
	mixedThreat: boolean;
	frontliner: boolean;
	ranged: boolean;
	carry: boolean;
	growthProfile: boolean;
	preControl: number;
	preMobility: number;
	preToughness: number;
	preDamage: number;
	aramTierScore: number;
	aramWinRateNorm: number;
	aramDamageEfficiency: number;
}

interface TeamCombatProfile {
	champions: ChampionCombatProfile[];
	teamSize: number;
	hardCcChampions: number;
	softCcChampions: number;
	aoeChampions: number;
	aoeCcChampions: number;
	engageChampions: number;
	peelChampions: number;
	sustainChampions: number;
	buffChampions: number;
	cleanseOrReviveChampions: number;
	mobilityChampions: number;
	womboChampions: number;
	damageAmpChampions: number;
	executeChampions: number;
	frontliners: number;
	rangedChampions: number;
	carryChampions: number;
	growthProfiles: number;
	mixedThreatChampions: number;
	totalHardCcAbilities: number;
	totalSoftCcAbilities: number;
	totalAoeAbilities: number;
	totalAoeCcAbilities: number;
	totalPeelAbilities: number;
	totalEngageAbilities: number;
	totalSustainAbilities: number;
	totalBuffAbilities: number;
	avgPreControl: number;
	avgPreMobility: number;
	avgPreToughness: number;
	avgPreDamage: number;
	avgMagicShare: number;
	avgAramTierScore: number;
	avgAramWinRateNorm: number;
	avgAramDamageEfficiency: number;
	uniqueHardCcTypes: Set<string>;
}

function clampScore(score: number): number {
	return Math.max(0, Math.min(MAX_METRIC_SCORE, Math.round(score)));
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function labelScore(score: number): string {
	if (score >= 80) {
		return "Xuất sắc";
	}
	if (score >= 65) {
		return "Tốt";
	}
	if (score >= 50) {
		return "Ổn";
	}
	if (score >= 35) {
		return "Yếu";
	}
	return "Rất yếu";
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

function getChampionAbilities(champion: Champion): ChampionEnrichedAbility[] {
	return champion.mobalytics?.abilities ?? [];
}

function abilityHasTag(ability: ChampionEnrichedAbility, tag: string): boolean {
	return ability.tags.includes(tag);
}

function parsePercentValue(value: string | null | undefined): number | null {
	if (!value) {
		return null;
	}
	const match = value.match(/[+-]?\d+(?:\.\d+)?/);
	return match ? Number.parseFloat(match[0]) : null;
}

function normalizeFivePointMetric(value: number | null | undefined): number {
	return clamp01(((value ?? 3) - 1) / 4);
}

function mapTierScoreToNormalized(tier: string | null | undefined): number {
	switch (tier?.toUpperCase()) {
		case "S":
			return 1;
		case "A":
			return 0.86;
		case "B":
			return 0.72;
		case "C":
			return 0.58;
		case "D":
			return 0.44;
		default:
			return 0.62;
	}
}

function normalizeWinRate(value: string | null | undefined): number {
	const parsed = parsePercentValue(value);
	if (parsed === null) {
		return 0.55;
	}
	return clamp01((parsed - MIN_META_WIN_RATE) / (MAX_META_WIN_RATE - MIN_META_WIN_RATE));
}

function normalizeDamageEfficiency(
	damageDealt: string | null | undefined,
	damageReceived: string | null | undefined
): number {
	const dealt = parsePercentValue(damageDealt) ?? 0;
	const received = parsePercentValue(damageReceived) ?? 0;
	return clamp01(0.5 + (dealt - received) / 40);
}

function calculateChampionMagicShare(champion: Champion): number {
	if (typeof champion.mobalytics?.damageType === "number") {
		return clamp01(champion.mobalytics.damageType / 100);
	}
	const total = Math.max(1, champion.info.attack + champion.info.magic);
	return champion.info.magic / total;
}

function countAbilitiesWith(
	abilities: ChampionEnrichedAbility[],
	predicate: (ability: ChampionEnrichedAbility) => boolean
): number {
	return abilities.filter(predicate).length;
}

function buildChampionCombatProfile(champion: Champion): ChampionCombatProfile {
	const abilities = getChampionAbilities(champion);
	const hardCcTypes = new Set<string>();
	const softCcTypes = new Set<string>();

	for (const ability of abilities) {
		for (const ccType of ability.ccTypes) {
			if (HARD_CC_TYPES.has(ccType)) {
				hardCcTypes.add(ccType);
			} else if (SOFT_CC_TYPES.has(ccType)) {
				softCcTypes.add(ccType);
			}
		}
	}

	const hardCcAbilities = countAbilitiesWith(
		abilities,
		(ability) => ability.ccTypes.some((ccType) => HARD_CC_TYPES.has(ccType))
	);
	const softCcAbilities = countAbilitiesWith(
		abilities,
		(ability) =>
			ability.ccTypes.some((ccType) => SOFT_CC_TYPES.has(ccType)) &&
			!ability.ccTypes.some((ccType) => HARD_CC_TYPES.has(ccType))
	);
	const aoeAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "AOE"));
	const aoeCcAbilities = countAbilitiesWith(
		abilities,
		(ability) => abilityHasTag(ability, "AOE") && ability.ccTypes.length > 0
	);
	const engageAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "ENGAGE"));
	const peelAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "PEEL"));
	const healAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "HEAL"));
	const shieldAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "SHIELD"));
	const regenAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "REGEN"));
	const allyBuffAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "ALLY_BUFF"));
	const armorBuffAbilities = countAbilitiesWith(abilities, (ability) =>
		abilityHasTag(ability, "ARMOR_BUFF")
	);
	const resistBuffAbilities = countAbilitiesWith(abilities, (ability) =>
		abilityHasTag(ability, "RESIST_BUFF")
	);
	const cleanseAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "CLEANSE"));
	const reviveAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "REVIVE"));
	const hasteAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "HASTE"));
	const mobilityAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "MOBILITY"));
	const womboAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "WOMBO"));
	const damageAmpAbilities = countAbilitiesWith(abilities, (ability) =>
		abilityHasTag(ability, "DAMAGE_AMP")
	);
	const executeAbilities = countAbilitiesWith(abilities, (ability) => abilityHasTag(ability, "EXECUTE"));
	const magicShare = calculateChampionMagicShare(champion);

	return {
		champion,
		hardCcTypes: [...hardCcTypes],
		softCcTypes: [...softCcTypes],
		hardCcAbilities,
		softCcAbilities,
		aoeAbilities,
		aoeCcAbilities,
		engageAbilities,
		peelAbilities,
		healAbilities,
		shieldAbilities,
		regenAbilities,
		allyBuffAbilities,
		armorBuffAbilities,
		resistBuffAbilities,
		cleanseAbilities,
		reviveAbilities,
		hasteAbilities,
		mobilityAbilities,
		womboAbilities,
		damageAmpAbilities,
		executeAbilities,
		magicShare,
		mixedThreat: magicShare >= 0.35 && magicShare <= 0.65,
		frontliner:
			hasAnyTag(champion, ["Tank", "Fighter"]) ||
			champion.info.defense >= HIGH_DEFENSE_THRESHOLD ||
			champion.stats.hp >= HIGH_HEALTH_THRESHOLD,
		ranged: champion.stats.attackrange >= LONG_RANGE_THRESHOLD,
		carry:
			hasAnyTag(champion, ["Marksman", "Mage", "Assassin"]) ||
			champion.info.attack >= 7 ||
			champion.info.magic >= 7,
		growthProfile: champion.stats.hpperlevel >= 100 || champion.stats.armorperlevel >= 4,
		preControl: normalizeFivePointMetric(champion.mobalytics?.preControl),
		preMobility: normalizeFivePointMetric(champion.mobalytics?.preMobility),
		preToughness: normalizeFivePointMetric(champion.mobalytics?.preToughness),
		preDamage: normalizeFivePointMetric(champion.mobalytics?.preDamage),
		aramTierScore: mapTierScoreToNormalized(champion.mobalytics?.aram?.tier),
		aramWinRateNorm: normalizeWinRate(champion.mobalytics?.aram?.winRate),
		aramDamageEfficiency: normalizeDamageEfficiency(
			champion.mobalytics?.aram?.balance.damageDealt,
			champion.mobalytics?.aram?.balance.damageReceived
		),
	};
}

function countProfiles(
	profiles: ChampionCombatProfile[],
	predicate: (profile: ChampionCombatProfile) => boolean
): number {
	return profiles.filter(predicate).length;
}

function sumProfiles(
	profiles: ChampionCombatProfile[],
	selector: (profile: ChampionCombatProfile) => number
): number {
	return profiles.reduce((sum, profile) => sum + selector(profile), 0);
}

function ratio(count: number, total: number): number {
	return total === 0 ? 0 : count / total;
}

function buildTeamCombatProfile(champions: Champion[]): TeamCombatProfile {
	const profiles = champions.map(buildChampionCombatProfile);
	const teamSize = Math.max(1, profiles.length);
	const uniqueHardCcTypes = new Set(profiles.flatMap((profile) => profile.hardCcTypes));

	return {
		champions: profiles,
		teamSize,
		hardCcChampions: countProfiles(profiles, (profile) => profile.hardCcAbilities > 0),
		softCcChampions: countProfiles(profiles, (profile) => profile.softCcAbilities > 0),
		aoeChampions: countProfiles(profiles, (profile) => profile.aoeAbilities > 0),
		aoeCcChampions: countProfiles(profiles, (profile) => profile.aoeCcAbilities > 0),
		engageChampions: countProfiles(profiles, (profile) => profile.engageAbilities > 0),
		peelChampions: countProfiles(profiles, (profile) => profile.peelAbilities > 0),
		sustainChampions: countProfiles(
			profiles,
			(profile) => profile.healAbilities + profile.shieldAbilities + profile.regenAbilities > 0
		),
		buffChampions: countProfiles(
			profiles,
			(profile) =>
				profile.allyBuffAbilities +
					profile.armorBuffAbilities +
					profile.resistBuffAbilities +
					profile.hasteAbilities >
				0
		),
		cleanseOrReviveChampions: countProfiles(
			profiles,
			(profile) => profile.cleanseAbilities + profile.reviveAbilities > 0
		),
		mobilityChampions: countProfiles(profiles, (profile) => profile.mobilityAbilities > 0),
		womboChampions: countProfiles(profiles, (profile) => profile.womboAbilities > 0),
		damageAmpChampions: countProfiles(profiles, (profile) => profile.damageAmpAbilities > 0),
		executeChampions: countProfiles(profiles, (profile) => profile.executeAbilities > 0),
		frontliners: countProfiles(profiles, (profile) => profile.frontliner),
		rangedChampions: countProfiles(profiles, (profile) => profile.ranged),
		carryChampions: countProfiles(profiles, (profile) => profile.carry),
		growthProfiles: countProfiles(profiles, (profile) => profile.growthProfile),
		mixedThreatChampions: countProfiles(profiles, (profile) => profile.mixedThreat),
		totalHardCcAbilities: sumProfiles(profiles, (profile) => profile.hardCcAbilities),
		totalSoftCcAbilities: sumProfiles(profiles, (profile) => profile.softCcAbilities),
		totalAoeAbilities: sumProfiles(profiles, (profile) => profile.aoeAbilities),
		totalAoeCcAbilities: sumProfiles(profiles, (profile) => profile.aoeCcAbilities),
		totalPeelAbilities: sumProfiles(profiles, (profile) => profile.peelAbilities),
		totalEngageAbilities: sumProfiles(profiles, (profile) => profile.engageAbilities),
		totalSustainAbilities: sumProfiles(
			profiles,
			(profile) => profile.healAbilities + profile.shieldAbilities + profile.regenAbilities
		),
		totalBuffAbilities: sumProfiles(
			profiles,
			(profile) =>
				profile.allyBuffAbilities +
				profile.armorBuffAbilities +
				profile.resistBuffAbilities +
				profile.cleanseAbilities +
				profile.reviveAbilities +
				profile.hasteAbilities
		),
		avgPreControl: sumProfiles(profiles, (profile) => profile.preControl) / teamSize,
		avgPreMobility: sumProfiles(profiles, (profile) => profile.preMobility) / teamSize,
		avgPreToughness: sumProfiles(profiles, (profile) => profile.preToughness) / teamSize,
		avgPreDamage: sumProfiles(profiles, (profile) => profile.preDamage) / teamSize,
		avgMagicShare: sumProfiles(profiles, (profile) => profile.magicShare) / teamSize,
		avgAramTierScore: sumProfiles(profiles, (profile) => profile.aramTierScore) / teamSize,
		avgAramWinRateNorm: sumProfiles(profiles, (profile) => profile.aramWinRateNorm) / teamSize,
		avgAramDamageEfficiency: sumProfiles(profiles, (profile) => profile.aramDamageEfficiency) / teamSize,
		uniqueHardCcTypes,
	};
}

function calculateEngageScore(teamProfile: TeamCombatProfile): SynergyMetricScore {
	const score =
		18 +
		ratio(teamProfile.engageChampions, teamProfile.teamSize) * 24 +
		ratio(teamProfile.hardCcChampions, teamProfile.teamSize) * 15 +
		ratio(teamProfile.frontliners, teamProfile.teamSize) * 12 +
		ratio(teamProfile.mobilityChampions, teamProfile.teamSize) * 8 +
		ratio(teamProfile.aoeCcChampions, teamProfile.teamSize) * 12 +
		ratio(teamProfile.womboChampions, teamProfile.teamSize) * 8 +
		clamp01(teamProfile.totalEngageAbilities / teamProfile.teamSize) * 6 +
		teamProfile.avgPreMobility * 6 +
		teamProfile.avgPreControl * 6;

	return scoreMetric(score, [
		`${teamProfile.engageChampions} tướng có công cụ vào combat`,
		`${teamProfile.hardCcChampions} tướng có khống chế cứng`,
		`${teamProfile.aoeCcChampions} nguồn mở giao tranh diện rộng`,
	]);
}

function calculateDamageBalanceScore(teamProfile: TeamCombatProfile): SynergyMetricScore {
	const magicShare = teamProfile.avgMagicShare;
	const attackShare = 1 - magicShare;
	const ratioDelta = Math.abs(attackShare - DAMAGE_BALANCE_TARGET_RATIO);
	const normalizedDelta = Math.min(1, ratioDelta / DAMAGE_BALANCE_TOLERANCE);
	const mixedThreatBonus = ratio(teamProfile.mixedThreatChampions, teamProfile.teamSize) * 10;
	const score = 92 - normalizedDelta * 58 + mixedThreatBonus;

	return scoreMetric(score, [
		`sát thương vật lý ${Math.round(attackShare * 100)}%`,
		`sát thương phép ${Math.round(magicShare * 100)}%`,
		`${teamProfile.mixedThreatChampions} tướng có profile sát thương hỗn hợp`,
	]);
}

function calculateCcScore(teamProfile: TeamCombatProfile): SynergyMetricScore {
	const score =
		12 +
		ratio(teamProfile.hardCcChampions, teamProfile.teamSize) * 30 +
		ratio(teamProfile.softCcChampions, teamProfile.teamSize) * 8 +
		ratio(teamProfile.aoeCcChampions, teamProfile.teamSize) * 14 +
		clamp01(teamProfile.totalHardCcAbilities / teamProfile.teamSize) * 8 +
		clamp01(teamProfile.uniqueHardCcTypes.size / 7) * 14 +
		ratio(teamProfile.womboChampions, teamProfile.teamSize) * 6 +
		teamProfile.avgPreControl * 8;

	return scoreMetric(score, [
		`${teamProfile.hardCcChampions} tướng có khống chế cứng`,
		`${teamProfile.uniqueHardCcTypes.size} dạng khống chế cứng khác nhau`,
		`${teamProfile.aoeCcChampions} kỹ năng CC diện rộng`,
	]);
}

function calculatePeelScore(teamProfile: TeamCombatProfile): SynergyMetricScore {
	const score =
		14 +
		ratio(teamProfile.peelChampions, teamProfile.teamSize) * 20 +
		ratio(teamProfile.sustainChampions, teamProfile.teamSize) * 18 +
		ratio(teamProfile.buffChampions, teamProfile.teamSize) * 18 +
		ratio(teamProfile.cleanseOrReviveChampions, teamProfile.teamSize) * 10 +
		ratio(teamProfile.frontliners, teamProfile.teamSize) * 10 +
		clamp01(teamProfile.totalSustainAbilities / teamProfile.teamSize) * 5 +
		clamp01(teamProfile.totalBuffAbilities / teamProfile.teamSize) * 5 +
		teamProfile.avgPreToughness * 8;

	return scoreMetric(score, [
		`${teamProfile.sustainChampions} tướng có heal/shield/hồi phục`,
		`${teamProfile.buffChampions} tướng có buff đồng minh`,
		`${teamProfile.cleanseOrReviveChampions} tướng có giải hiệu ứng hoặc hồi sinh`,
	]);
}

function calculateScalingScore(teamProfile: TeamCombatProfile): SynergyMetricScore {
	const metaStrength = teamProfile.avgAramTierScore * 0.55 + teamProfile.avgAramWinRateNorm * 0.45;
	const score =
		18 +
		ratio(teamProfile.carryChampions, teamProfile.teamSize) * 16 +
		ratio(teamProfile.growthProfiles, teamProfile.teamSize) * 12 +
		ratio(teamProfile.rangedChampions, teamProfile.teamSize) * 8 +
		ratio(teamProfile.damageAmpChampions + teamProfile.executeChampions, teamProfile.teamSize) * 10 +
		ratio(teamProfile.aoeChampions, teamProfile.teamSize) * 8 +
		metaStrength * 18 +
		teamProfile.avgAramDamageEfficiency * 6 +
		teamProfile.avgPreDamage * 10;

	return scoreMetric(score, [
		`${teamProfile.carryChampions} nguồn sát thương carry`,
		`${Math.round(metaStrength * 100)}/100 meta ARAM trung bình`,
		`${teamProfile.damageAmpChampions + teamProfile.executeChampions} công cụ kết liễu hoặc khuếch đại sát thương`,
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
	const teamProfile = buildTeamCombatProfile(champions);

	return {
		engage: calculateEngageScore(teamProfile),
		damageBalance: calculateDamageBalanceScore(teamProfile),
		cc: calculateCcScore(teamProfile),
		peel: calculatePeelScore(teamProfile),
		scaling: calculateScalingScore(teamProfile),
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
				`${SUMMARY_METRIC_LABELS[metricKey]} ${metricScore.score}/100`
		)
		.join(" | ");
	return `${analysis.side === "blue" ? "ĐỘI XANH" : "ĐỘI ĐỎ"}: ${metricSummary}`;
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

	return `${betterSide.side === "blue" ? "Đội Xanh" : "Đội Đỏ"} ổn định hơn nhờ ${SUMMARY_METRIC_LABELS[bestMetric]}; ${trailingSide.side === "blue" ? "Đội Xanh" : "Đội Đỏ"} cần cải thiện ${SUMMARY_METRIC_LABELS[weakMetric]}.`;
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
		takeaway: `${input.side === "blue" ? "Đội Xanh" : "Đội Đỏ"} mạnh ở ${SUMMARY_METRIC_LABELS[strongestMetricKey]} (${strongestMetric.label}) nhưng vẫn có thể cải thiện ${SUMMARY_METRIC_LABELS[weakestMetricKey]}.`,
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
	return `Đây là pool theo riêng role ${role} (${poolSize} tướng mỗi bên), nên bot không hiển thị đủ scorecard 6 chỉ số như đội hình đầy đủ.`;
}

function getAnsiColorForScore(score: number): string {
	if (score >= 80) {
		return ANSI_GREEN;
	}
	if (score >= 65) {
		return ANSI_YELLOW;
	}
	if (score >= 50) {
		return ANSI_CYAN;
	}
	return ANSI_RED;
}

function formatDiscordMetricLine(metricKey: SynergyMetricKey, metricScore: SynergyMetricScore): string {
	const color = getAnsiColorForScore(metricScore.score);
	return `${SUMMARY_METRIC_LABELS[metricKey]}: ${color}${metricScore.score}/100 ${metricScore.label}${ANSI_RESET}`;
}

function formatDiscordSideBlock(analysis: TeamSynergyAnalysis): string {
	const sideColor = analysis.side === "blue" ? ANSI_BLUE : ANSI_RED;
	const sideLabel = analysis.side === "blue" ? "ĐỘI XANH" : "ĐỘI ĐỎ";
	const lines = (Object.entries(analysis.scores) as Array<[SynergyMetricKey, SynergyMetricScore]>).map(
		([metricKey, metricScore]) => formatDiscordMetricLine(metricKey, metricScore)
	);

	return [`${ANSI_BOLD}${sideColor}${sideLabel}${ANSI_RESET}`, ...lines].join("\n");
}

export function formatDiscordCompactSummary(
	blue: TeamSynergyAnalysis,
	red: TeamSynergyAnalysis
): string {
	return [
		"📊 **Phân tích đội hình**",
		"*Điểm nội bộ 0-100, không phải tỉ lệ thắng*",
		"```ansi",
		formatDiscordSideBlock(blue),
		"",
		formatDiscordSideBlock(red),
		"```",
		`📌 **Nhận xét:** ${formatOverallTakeaway(blue, red)}`,
	].join("\n");
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
