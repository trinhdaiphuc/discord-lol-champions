import { describe, test, expect, beforeEach, beforeAll, afterAll } from "bun:test";
import {
	clearGuildTeamCache,
	generateTeams,
	generateTeamsByRole,
	verifyUniqueTeams,
} from "./teamService.ts";
import { getGuildGenerateConfig, setGuildGenerateConfig } from "./channelConfigService.ts";
import * as championService from "./championService.ts";
import { createServer } from "../core/server.ts";
import {
	analyzeGeneratedTeams,
	createCompositionSignature,
	getRoleOnlyAnalysisNotice,
} from "./synergyAnalysisService.ts";
import {
	findCompAnalysisBySignature,
	getRecentCompAnalysisHistory,
	saveCompAnalysisHistory,
} from "./compAnalysisHistoryService.ts";

const TEST_GUILD_ID = "test-guild-12345";
const apiServer = createServer(0);
const apiBaseUrl = `http://127.0.0.1:${apiServer.port}`;

afterAll(() => {
	apiServer.stop(true);
});

describe("generateTeams", () => {
	beforeAll(async () => {
		await championService.loadChampions();
	});

	beforeEach(() => {
		// Clear any cached state by generating with a unique guild ID per test
	});

	test("should draft stable pools with high unique coverage", async () => {
		const uniqueGuildId = `${TEST_GUILD_ID}-${Date.now()}`;
		const totalChampions = Object.keys(championService.getChampions()).length;
		const championsPerMatch = 48; // 6 roles * 4 champions * 2 teams
		const matchesToRun = 5;

		console.log(`Total champions: ${totalChampions}`);
		console.log(`Champions per match: ${championsPerMatch}`);
		console.log(`Matches to run: ${matchesToRun}`);

		const allUsedChampions = new Set<string>();
		const matchResults: { blueTeam: string[]; redTeam: string[] }[] = [];

		for (let matchIndex = 0; matchIndex < matchesToRun; matchIndex++) {
			const { blueTeam, redTeam } = await generateTeams(uniqueGuildId);

			// Verify expected team sizes (4 picks * 6 roles)
			expect(blueTeam.length).toBe(24);
			expect(redTeam.length).toBe(24);

			// Verify no duplicates within the same match
			const uniqueInMatch = verifyUniqueTeams(blueTeam, redTeam);
			expect(uniqueInMatch).toBe(true);

			const allInMatch = [...blueTeam, ...redTeam];

			// Check for duplicates within this match
			const matchSet = new Set<string>();
			for (const champ of allInMatch) {
				if (matchSet.has(champ)) {
					console.error(
						`❌ Match ${matchIndex}: Champion "${champ}" appears twice in the SAME match!`
					);
					console.error(`Blue team: ${blueTeam.join(", ")}`);
					console.error(`Red team: ${redTeam.join(", ")}`);
					expect(false).toBe(true); // Fail the test
				}
				matchSet.add(champ);
			}

			for (const champ of allInMatch) {
				allUsedChampions.add(champ);
			}

			// First 2 matches should not overlap because role pools are still large enough
			if (matchIndex > 0 && matchIndex <= 1) {
				const prevMatch = matchResults[matchIndex - 1];
				const prevSet = new Set([...prevMatch.blueTeam, ...prevMatch.redTeam]);
				const overlapWithPrevious = allInMatch.filter((champ) => prevSet.has(champ));
				if (overlapWithPrevious.length > 0) {
					console.error(
						`❌ Match ${matchIndex}: Unexpected repeats with previous match: ${overlapWithPrevious.join(", ")}`
					);
					expect(overlapWithPrevious.length).toBe(0);
				}
			}

			matchResults.push({ blueTeam, redTeam });
			console.log(
				`✅ Match ${matchIndex}: ${allInMatch.length} champions (${allUsedChampions.size} unique total)`
			);
		}

		const totalPicked = matchesToRun * championsPerMatch;
		const uniqueCoverage = allUsedChampions.size / totalPicked;
		console.log(`Unique coverage: ${(uniqueCoverage * 100).toFixed(2)}%`);

		// Theoretical max with 172 champs over 5*48 picks is ~71.6%. Keep lower bound conservative.
		expect(uniqueCoverage).toBeGreaterThan(0.62);

		console.log(`\n✅ All ${matchesToRun} matches completed with stable uniqueness.`);
		console.log(`Total unique champions used: ${allUsedChampions.size}`);
	});

	test("should handle multiple rounds of pool exhaustion", async () => {
		const uniqueGuildId = `${TEST_GUILD_ID}-exhaustion-${Date.now()}`;
		const totalChampions = Object.keys(championService.getChampions()).length;
		const championsPerMatch = 48;
		const matchesToRun = Math.ceil((totalChampions * 2.5) / championsPerMatch); // Run through ~2.5 full cycles

		console.log(`Running ${matchesToRun} matches to test pool exhaustion handling...`);

		for (let matchIndex = 0; matchIndex < matchesToRun; matchIndex++) {
			const { blueTeam, redTeam } = await generateTeams(uniqueGuildId);

			// Verify no duplicates within the same match
			const allInMatch = [...blueTeam, ...redTeam];
			const matchSet = new Set(allInMatch);

			if (matchSet.size !== allInMatch.length) {
				const duplicates = allInMatch.filter((item, index) => allInMatch.indexOf(item) !== index);
				console.error(`❌ Match ${matchIndex}: Duplicates within match: ${duplicates.join(", ")}`);
				console.error(`Blue team: ${blueTeam.join(", ")}`);
				console.error(`Red team: ${redTeam.join(", ")}`);
				expect(matchSet.size).toBe(allInMatch.length);
			}

			console.log(`✅ Match ${matchIndex}: OK`);
		}

		console.log(`\n✅ All ${matchesToRun} matches completed. Pool exhaustion handled correctly.`);
	});

	test("should support configurable pool size from 3 to 6", async () => {
		const guildId = `${TEST_GUILD_ID}-pool-size-${Date.now()}`;

		const result3 = await generateTeams(guildId, { poolSize: 3 });
		expect(result3.blueTeam.length).toBe(18);
		expect(result3.redTeam.length).toBe(18);
		expect(verifyUniqueTeams(result3.blueTeam, result3.redTeam)).toBe(true);

		const result6 = await generateTeams(guildId, { poolSize: 6 });
		expect(result6.blueTeam.length).toBe(36);
		expect(result6.redTeam.length).toBe(36);
		expect(verifyUniqueTeams(result6.blueTeam, result6.redTeam)).toBe(true);
	});

	test("should avoid repeating champions from the immediately previous match", async () => {
		const guildId = `${TEST_GUILD_ID}-history-1-${Date.now()}`;

		const firstMatch = await generateTeams(guildId, { historyWindow: 1 });
		const secondMatch = await generateTeams(guildId, { historyWindow: 1 });

		const firstSet = new Set([...firstMatch.blueTeam, ...firstMatch.redTeam]);
		const secondSet = new Set([...secondMatch.blueTeam, ...secondMatch.redTeam]);
		const overlap = [...secondSet].filter((champ) => firstSet.has(champ));

		expect(overlap).toHaveLength(0);
	});

	test("should avoid repeating champions from the configured recent match window", async () => {
		const guildId = `${TEST_GUILD_ID}-history-2-${Date.now()}`;

		const firstMatch = await generateTeams(guildId, { historyWindow: 2 });
		const secondMatch = await generateTeams(guildId, { historyWindow: 2 });
		const thirdMatch = await generateTeams(guildId, { historyWindow: 2 });

		const blockedChampions = new Set([
			...firstMatch.blueTeam,
			...firstMatch.redTeam,
			...secondMatch.blueTeam,
			...secondMatch.redTeam,
		]);
		const overlap = [...thirdMatch.blueTeam, ...thirdMatch.redTeam].filter((champ) =>
			blockedChampions.has(champ)
		);

		expect(overlap).toHaveLength(0);
	});

	test("should clear all guild cache state", async () => {
		const guildId = `${TEST_GUILD_ID}-clear-${Date.now()}`;

		expect(clearGuildTeamCache(guildId)).toBe(false);
		await generateTeams(guildId, { historyWindow: 1 });
		expect(clearGuildTeamCache(guildId)).toBe(true);
		expect(clearGuildTeamCache(guildId)).toBe(false);
	});

	test("should apply pool size to role-only generation", async () => {
		const role = "Mage";

		const result3 = await generateTeamsByRole(role, { poolSize: 3 });
		expect(result3.blueTeam.length).toBe(3);
		expect(result3.redTeam.length).toBe(3);
		expect(verifyUniqueTeams(result3.blueTeam, result3.redTeam)).toBe(true);

		const result5 = await generateTeamsByRole(role, { poolSize: 5 });
		expect(result5.blueTeam.length).toBe(5);
		expect(result5.redTeam.length).toBe(5);
		expect(verifyUniqueTeams(result5.blueTeam, result5.redTeam)).toBe(true);

		const result6 = await generateTeamsByRole(role, { poolSize: 6 });
		expect(result6.blueTeam.length).toBe(6);
		expect(result6.redTeam.length).toBe(6);
		expect(verifyUniqueTeams(result6.blueTeam, result6.redTeam)).toBe(true);
	});

	test("should produce deterministic synergy analysis with all required metrics", async () => {
		const guildId = `${TEST_GUILD_ID}-analysis-${Date.now()}`;
		const teamResult = await generateTeams(guildId, { poolSize: 3, historyWindow: 0 });

		const firstAnalysis = await analyzeGeneratedTeams(teamResult);
		const secondAnalysis = await analyzeGeneratedTeams(teamResult);
		const metricKeys = [
			"engage",
			"damageBalance",
			"cc",
			"peel",
			"scaling",
			"laneStability",
		];

		expect(firstAnalysis).toEqual(secondAnalysis);
		expect(Object.keys(firstAnalysis.blue.scores)).toEqual(metricKeys);
		expect(Object.keys(firstAnalysis.red.scores)).toEqual(metricKeys);
		expect(firstAnalysis.summaryText).toContain("BLUE:");
		expect(firstAnalysis.summaryText).toContain("RED:");
		expect(firstAnalysis.summaryText).toContain("engage");
		expect(firstAnalysis.summaryText).toContain("damage balance");
		expect(firstAnalysis.summaryText).toContain("CC");
		expect(firstAnalysis.summaryText).toContain("peel");
		expect(firstAnalysis.summaryText).toContain("scaling");
		expect(firstAnalysis.summaryText).toContain("lane stability");
	});

	test("should persist and reload comp analysis history records", async () => {
		const guildId = `${TEST_GUILD_ID}-history-record-${Date.now()}`;
		const teamResult = await generateTeams(guildId, { poolSize: 3, historyWindow: 0 });
		const analysis = await analyzeGeneratedTeams(teamResult);
		const compositionSignature = createCompositionSignature(teamResult);

		const savedRecord = await saveCompAnalysisHistory({
			guildId,
			generationMode: teamResult.metadata.mode,
			poolSize: teamResult.metadata.poolSize,
			blueTeam: teamResult.blueTeam,
			redTeam: teamResult.redTeam,
			blueAnalysis: analysis.blue,
			redAnalysis: analysis.red,
			summaryText: analysis.summaryText,
			compositionSignature,
		});

		const foundRecord = await findCompAnalysisBySignature(guildId, compositionSignature);
		const recentRecords = await getRecentCompAnalysisHistory(guildId, 5);

		expect(savedRecord.id).toBeGreaterThan(0);
		expect(foundRecord?.summaryText).toBe(analysis.summaryText);
		expect(foundRecord?.blueAnalysis.scores.engage.score).toBe(analysis.blue.scores.engage.score);
		expect(foundRecord?.compositionSignature).toBe(compositionSignature);
		expect(recentRecords.length).toBeGreaterThan(0);
		expect(recentRecords[0]?.guildId).toBe(guildId);
	});

	test("should keep role-only generation metadata explicit for partial analysis flows", async () => {
		const result = await generateTeamsByRole("Support", { poolSize: 3 });

		expect(result.metadata.mode).toBe("role-only");
		expect(result.metadata.blueRolePools.Support).toHaveLength(3);
		expect(result.metadata.redRolePools.Support).toHaveLength(3);
		expect(result.metadata.blueRolePools.Fighter).toHaveLength(0);
		expect(result.metadata.redRolePools.Mage).toHaveLength(0);
	});
});

describe("generation API integration", () => {
	test("should return JSON analysis metadata and persist history for full generation", async () => {
		const guildId = `${TEST_GUILD_ID}-api-json-${Date.now()}`;
		await setGuildGenerateConfig(guildId, { poolSize: 3, historyWindow: 0 });

		const response = await fetch(`${apiBaseUrl}/gen-champions/${guildId}?view=json`);
		const payload = (await response.json()) as {
			blueTeam: string[];
			redTeam: string[];
			analysis: { summaryText: string; blue: { scores: Record<string, unknown> } };
		};
		const recentHistory = await getRecentCompAnalysisHistory(guildId, 5);

		expect(response.status).toBe(200);
		expect(payload.blueTeam.length).toBe(18);
		expect(payload.redTeam.length).toBe(18);
		expect(payload.analysis.summaryText).toContain("BLUE:");
		expect(payload.analysis.summaryText).toContain("RED:");
		expect(payload.analysis.summaryText).toContain("engage");
		expect(payload.analysis.summaryText).toContain("damage balance");
		expect(payload.analysis.summaryText).toContain("CC");
		expect(payload.analysis.summaryText).toContain("peel");
		expect(payload.analysis.summaryText).toContain("scaling");
		expect(payload.analysis.summaryText).toContain("lane stability");
		expect(payload.analysis.blue.scores.engage).toBeDefined();
		expect(recentHistory.length).toBeGreaterThan(0);
	});

	test("should keep the default full-generation API contract as image/jpeg", async () => {
		const guildId = `${TEST_GUILD_ID}-api-image-${Date.now()}`;
		await setGuildGenerateConfig(guildId, { poolSize: 3, historyWindow: 0 });

		const response = await fetch(`${apiBaseUrl}/gen-champions/${guildId}`);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("image/jpeg");
	});

	test("should make role-only API behavior explicit instead of returning a full scorecard", async () => {
		const guildId = `${TEST_GUILD_ID}-api-role-${Date.now()}`;
		await setGuildGenerateConfig(guildId, { poolSize: 3 });

		const response = await fetch(
			`${apiBaseUrl}/gen-champions/role/Support?guildId=${guildId}&view=json`
		);
		const payload = (await response.json()) as {
			role: string;
			analysisNotice: string;
			blueTeam: string[];
			redTeam: string[];
		};

		expect(response.status).toBe(200);
		expect(payload.role).toBe("Support");
		expect(payload.blueTeam.length).toBe(3);
		expect(payload.redTeam.length).toBe(3);
		expect(payload.analysisNotice).toBe(getRoleOnlyAnalysisNotice("Support", 3));
	});
});

describe("guild generate config", () => {
	test("should default historyWindow to 1", async () => {
		const guildId = `${TEST_GUILD_ID}-config-default-${Date.now()}`;
		const config = await getGuildGenerateConfig(guildId);

		expect(config.historyWindow).toBe(1);
	});

	test("should persist configured historyWindow", async () => {
		const guildId = `${TEST_GUILD_ID}-config-history-${Date.now()}`;

		const updated = await setGuildGenerateConfig(guildId, { historyWindow: 3 });
		const reloaded = await getGuildGenerateConfig(guildId);

		expect(updated.historyWindow).toBe(3);
		expect(reloaded.historyWindow).toBe(3);
	});
});
