import * as championService from "../services/championService.ts";
import * as championNameService from "../services/championNameService.ts";
import * as teamService from "../services/teamService.ts";

async function main() {
	try {
		await championService.loadChampions();
		console.log(`✅ Champions loaded (${Object.keys(championService.getChampions()).length})`);

		const rawExclusions = ["ahri", "garen", "nocturne", "drmundo"];
		const mapped = championNameService.mapNamesToChampionIds(rawExclusions);
		console.log("Mapped exclusions:", mapped);

		const teams = await teamService.generateTeamsWithExclusions("test-guild", mapped.matched, { poolSize: 4 });
		console.log("Blue Team:", teams.blueTeam);
		console.log("Red Team:", teams.redTeam);

		// quick assert
		for (const ex of mapped.matched) {
			if (teams.blueTeam.includes(ex) || teams.redTeam.includes(ex)) {
				console.error(`❌ Excluded champion ${ex} found in teams`);
				process.exit(1);
			}
		}
		console.log("✅ Exclusions respected — no excluded champion in teams");
	} catch (error) {
		console.error("Error running test:", error);
		process.exit(2);
	}
}

main();

