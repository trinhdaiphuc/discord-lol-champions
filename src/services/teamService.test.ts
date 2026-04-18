import { describe, test, expect, beforeEach, beforeAll } from "bun:test";
import { generateTeams, generateTeamsByRole, verifyUniqueTeams } from "./teamService.ts";
import * as championService from "./championService.ts";

const TEST_GUILD_ID = "test-guild-12345";

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
          console.error(`❌ Match ${matchIndex}: Champion "${champ}" appears twice in the SAME match!`);
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
      console.log(`✅ Match ${matchIndex}: ${allInMatch.length} champions (${allUsedChampions.size} unique total)`);
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
});
