const express = require("express");
const { generateTeams } = require("./teamGenerator");
const { generateTeamImage } = require("./imageGenerator");
const { updateChampionJob } = require("./botManager");
const { start } = require("./app");

const app = express();
const port = 3000;

app.get("/gen-champions", async (req, res) => {
	try {
		const { blueTeam, redTeam } = await generateTeams();
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
