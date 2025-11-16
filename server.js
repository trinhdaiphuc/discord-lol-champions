const express = require("express");
const { generateTeams, generateTeamsByRole } = require("./teamGenerator");
const { generateTeamImage } = require("./imageGenerator");
const { updateChampionJob } = require("./botManager");
const { start } = require("./app");

const app = express();
const port = 3000;

app.get("/gen-champions/role/:roleName", async (req, res) => {
	try {
		const roleName = req.params.roleName;
		const { blueTeam, redTeam } = await generateTeamsByRole(roleName);
		const imageBuffer = await generateTeamImage(blueTeam, redTeam);

		res.set("Content-Type", "image/png");
		res.send(imageBuffer);
	} catch (error) {
		console.error("Error generating champion image:", error);
		res.status(500).send("Error generating image");
	}
});

app.get("/gen-champions/:guildId", async (req, res) => {
	try {
		const guildId = req.params.guildId;
		const { blueTeam, redTeam } = await generateTeams(guildId);
		const imageBuffer = await generateTeamImage(blueTeam, redTeam);

		res.set("Content-Type", "image/png");
		res.send(imageBuffer);
	} catch (error) {
		console.error("Error generating champion image:", error);
		res.status(500).send("Error generating image");
	}
});

app.get("/", (req, res) => {
	res.send("League of Legends Champions Image Generator is running.");
});

app.listen(port, async () => {
	await start();
	console.log(`Test server listening at http://localhost:${port}`);
});

