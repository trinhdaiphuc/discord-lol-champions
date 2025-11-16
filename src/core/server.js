const express = require("express");
const teamService = require("../services/teamService");
const imageService = require("../services/imageService");

function createServer() {
	const app = express();
	app.use(express.json());

	app.get("/", (req, res) => {
		res.send("League of Legends Champions Image Generator is running.");
	});

	app.post("/random-team", (req, res) => {
		try {
			const members = req.body.members || [];
			const { teamA, teamB } = teamService.createRandomTeams(members);
			res.json({ teamA, teamB });
		} catch (error) {
			console.error("Error creating random teams:", error);
			res.status(500).send("Error creating random teams");
		}
	});

	app.get("/gen-champions/role/:roleName", async (req, res) => {
		try {
			const roleName = req.params.roleName;
			const { blueTeam, redTeam } = await teamService.generateTeamsByRole(roleName);
			const imageBuffer = await imageService.generateTeamImage(blueTeam, redTeam);

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
			const { blueTeam, redTeam } = await teamService.generateTeams(guildId);
			const imageBuffer = await imageService.generateTeamImage(blueTeam, redTeam);

			res.set("Content-Type", "image/png");
			res.send(imageBuffer);
		} catch (error) {
			console.error("Error generating champion image:", error);
			res.status(500).send("Error generating image");
		}
	});

	return app;
}

module.exports = { createServer };
