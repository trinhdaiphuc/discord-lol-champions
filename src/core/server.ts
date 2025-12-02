import express, { type Express, type Request, type Response } from "express";
import * as teamService from "../services/teamService.ts";
import * as imageService from "../services/imageService.ts";
import { askAI } from "../services/aiService.ts";

export function createServer(): Express {
	const app = express();
	app.use(express.json());

	app.get("/", (_req: Request, res: Response) => {
		res.send("League of Legends Champions Image Generator is running.");
	});

	app.post("/ask", async (req: Request, res: Response) => {
		try {
			const question = req.body.question as string | undefined;
			if (!question) {
				res.status(400).json({ error: "Question is required" });
				return;
			}
			const answer = await askAI(question);
			res.json({ question, answer });
		} catch (error) {
			console.error("Error processing ask request:", error);
			const err = error as Error;
			res.status(500).json({ error: err.message || "Internal server error" });
		}
	});

	app.post("/random-team", (req: Request, res: Response) => {
		try {
			const members = (req.body.members || []) as string[];
			const { teamA, teamB } = teamService.createRandomTeams(members);
			res.json({ teamA, teamB });
		} catch (error) {
			console.error("Error creating random teams:", error);
			res.status(500).send("Error creating random teams");
		}
	});

	app.get("/gen-champions/role/:roleName", async (req: Request, res: Response) => {
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

	app.get("/gen-champions/:guildId", async (req: Request, res: Response) => {
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

