import * as teamService from "../services/teamService.ts";
import * as imageService from "../services/imageService.ts";
import { askAI } from "../services/aiService.ts";

interface AskBody {
	question?: string;
}

interface RandomTeamBody {
	members?: string[];
}

export function createServer(port: number | string = 3000) {
	const server = Bun.serve({
		port: Number(port),
		routes: {
			// Health check
			"/": new Response("League of Legends Champions Image Generator is running."),

			// AI question endpoint
			"/ask": {
				POST: async (req) => {
					try {
						const body = (await req.json()) as AskBody;
						const question = body.question;
						if (!question) {
							return Response.json({ error: "Question is required" }, { status: 400 });
						}
						const answer = await askAI(question);
						return Response.json({ question, answer });
					} catch (error) {
						console.error("Error processing ask request:", error);
						const err = error as Error;
						return Response.json(
							{ error: err.message || "Internal server error" },
							{ status: 500 }
						);
					}
				},
			},

			// Random team endpoint
			"/random-team": {
				POST: async (req) => {
					try {
						const body = (await req.json()) as RandomTeamBody;
						const members = body.members || [];
						const { teamA, teamB } = teamService.createRandomTeams(members);
						return Response.json({ teamA, teamB });
					} catch (error) {
						console.error("Error creating random teams:", error);
						return new Response("Error creating random teams", { status: 500 });
					}
				},
			},

			// Generate champions by role
			"/gen-champions/role/:roleName": async (req) => {
				try {
					const roleName = req.params.roleName;
					const { blueTeam, redTeam } = await teamService.generateTeamsByRole(roleName);
					const imageBuffer = await imageService.generateTeamImage(blueTeam, redTeam);

					return new Response(imageBuffer, {
						headers: { "Content-Type": "image/png" },
					});
				} catch (error) {
					console.error("Error generating champion image:", error);
					return new Response("Error generating image", { status: 500 });
				}
			},

			// Generate champions by guild
			"/gen-champions/:guildId": async (req) => {
				try {
					const guildId = req.params.guildId;
					const { blueTeam, redTeam } = await teamService.generateTeams(guildId);
					const imageBuffer = await imageService.generateTeamImage(blueTeam, redTeam);

					return new Response(imageBuffer, {
						headers: { "Content-Type": "image/png" },
					});
				} catch (error) {
					console.error("Error generating champion image:", error);
					return new Response("Error generating image", { status: 500 });
				}
			},
		},

		// Fallback for unmatched routes
		fetch(req) {
			return new Response("Not Found", { status: 404 });
		},

		// Error handler
		error(error) {
			console.error("Server error:", error);
			return new Response("Internal Server Error", { status: 500 });
		},
	});

	return server;
}
