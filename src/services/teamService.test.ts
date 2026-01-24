import { describe, test, expect, beforeEach, beforeAll } from "bun:test";
import { generateTeams, verifyUniqueTeams } from "./teamService.ts";
import * as championService from "./championService.ts";

const TEST_GUILD_ID = "test-guild-12345";

describe("generateTeams", () => {
  beforeAll(async () => {
    await championService.loadChampions();
  });

  beforeEach(() => {
    // Clear any cached state by generating with a unique guild ID per test
  });

  test("should not repeat champions while pool is sufficient", async () => {
    const uniqueGuildId = `${TEST_GUILD_ID}-${Date.now()}`;
    const totalChampions = Object.keys(championService.getChampions()).length;
    const championsPerMatch = 36; // 6 roles * 3 champions * 2 teams
    const maxMatchesBeforeExhaustion = Math.floor(totalChampions / championsPerMatch);

    console.log(`Total champions: ${totalChampions}`);
    console.log(`Champions per match: ${championsPerMatch}`);
    console.log(`Max matches before exhaustion: ${maxMatchesBeforeExhaustion}`);

    const allUsedChampions = new Map<string, number>(); // champion -> first seen match index
    const matchResults: { blueTeam: string[]; redTeam: string[] }[] = [];

    for (let matchIndex = 0; matchIndex < maxMatchesBeforeExhaustion; matchIndex++) {
      const { blueTeam, redTeam } = await generateTeams(uniqueGuildId);

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

      // Check for repeats across matches (only if pool is still sufficient)
      const usedSoFar = allUsedChampions.size;
      const remainingPool = totalChampions - usedSoFar;

      for (const champ of allInMatch) {
        if (allUsedChampions.has(champ)) {
          const firstSeenMatch = allUsedChampions.get(champ)!;
          // Only fail if there were enough unused champions
          if (remainingPool >= championsPerMatch) {
            console.error(`❌ Match ${matchIndex}: Champion "${champ}" was already used in match ${firstSeenMatch}`);
            console.error(`Used so far: ${usedSoFar}, Remaining pool: ${remainingPool}`);
            console.error(`Blue team: ${blueTeam.join(", ")}`);
            console.error(`Red team: ${redTeam.join(", ")}`);
            expect(false).toBe(true); // Fail the test
          } else {
            console.log(`⚠️ Match ${matchIndex}: Champion "${champ}" repeated (pool exhausted, acceptable)`);
          }
        } else {
          allUsedChampions.set(champ, matchIndex);
        }
      }

      matchResults.push({ blueTeam, redTeam });
      console.log(`✅ Match ${matchIndex}: ${allInMatch.length} champions (${allUsedChampions.size} total used)`);
    }

    console.log(`\n✅ All ${maxMatchesBeforeExhaustion} matches completed without invalid repeats.`);
    console.log(`Total unique champions used: ${allUsedChampions.size}`);
  });

  test("should handle multiple rounds of pool exhaustion", async () => {
    const uniqueGuildId = `${TEST_GUILD_ID}-exhaustion-${Date.now()}`;
    const totalChampions = Object.keys(championService.getChampions()).length;
    const championsPerMatch = 36;
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
});
