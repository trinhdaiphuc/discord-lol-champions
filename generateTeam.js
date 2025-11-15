const { generateTeams, verifyUniqueTeams } = require("./teamGenerator");
const { updateChampionJob } = require("./botManager");

async function main() {
	await updateChampionJob();
	const { blueTeam, redTeam } = await generateTeams();
	console.log("Blue Team:", blueTeam);
	console.log("Red Team:", redTeam);
	console.log("Team Unique:", verifyUniqueTeams(blueTeam, redTeam));
}

main();
