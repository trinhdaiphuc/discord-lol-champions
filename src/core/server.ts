import * as teamService from "../services/teamService.ts";
import * as imageService from "../services/imageService.ts";
import { askAI } from "../services/aiService.ts";
import {
	getGuildGenerateConfig,
	reloadGuildGenerateConfig,
	setGuildGenerateConfig,
} from "../services/channelConfigService.ts";
import {
	getThemeById,
	getThemeDisplayName,
	listThemeManifestItems,
	RANDOM_THEME_ID,
	resolveThemeForGenerate,
} from "../services/themeService.ts";

interface AskBody {
	question?: string;
}

interface RandomTeamBody {
	members?: string[];
}

interface GuildConfigBody {
	poolSize?: number;
	themeId?: string;
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
					const url = new URL(req.url);
					const guildId = url.searchParams.get("guildId");
					if (!guildId) {
						return Response.json({ error: "guildId query param is required" }, { status: 400 });
					}

					const roleName = req.params.roleName;
					const guildConfig = await getGuildGenerateConfig(guildId);
					const theme = await resolveThemeForGenerate(guildConfig.themeId);
					const { blueTeam, redTeam } = await teamService.generateTeamsByRole(roleName, {
						poolSize: guildConfig.poolSize,
					});
					const imageBuffer = await imageService.generateTeamImage(
						blueTeam,
						redTeam,
						theme,
						guildConfig.poolSize
					);

					return new Response(imageBuffer, {
						headers: { "Content-Type": "image/jpeg" },
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
					const guildConfig = await getGuildGenerateConfig(guildId);
					const theme = await resolveThemeForGenerate(guildConfig.themeId);
					const { blueTeam, redTeam } = await teamService.generateTeams(guildId, {
						poolSize: guildConfig.poolSize,
					});
					const imageBuffer = await imageService.generateTeamImage(
						blueTeam,
						redTeam,
						theme,
						guildConfig.poolSize
					);

					return new Response(imageBuffer, {
						headers: { "Content-Type": "image/jpeg" },
					});
				} catch (error) {
					console.error("Error generating champion image:", error);
					return new Response("Error generating image", { status: 500 });
				}
			},

			"/guilds/:guildId/config": {
				GET: async (req) => {
					try {
						const guildId = req.params.guildId;
						const config = await getGuildGenerateConfig(guildId);
						const themeName = await getThemeDisplayName(config.themeId);
						return Response.json({
							guildId: config.guildId,
							poolSize: config.poolSize,
							themeId: config.themeId,
							themeName,
							updatedAt: config.updatedAt,
						});
					} catch (error) {
						console.error("Error reading guild config:", error);
						return Response.json({ error: "Error reading guild config" }, { status: 500 });
					}
				},
				PUT: async (req) => {
					try {
						const guildId = req.params.guildId;
						const body = (await req.json()) as GuildConfigBody;
						if (body.poolSize !== undefined && ![3, 4, 5, 6].includes(body.poolSize)) {
							return Response.json(
								{ error: "poolSize must be one of: 3, 4, 5, 6" },
								{ status: 400 }
							);
						}

						if (body.themeId !== undefined) {
							const theme =
								body.themeId === RANDOM_THEME_ID ? true : await getThemeById(body.themeId);
							if (!theme) {
								const availableThemes = await listThemeManifestItems();
								return Response.json(
									{
										error: "Invalid themeId",
										availableThemes: [
											{ id: RANDOM_THEME_ID, name: "Random (Every Generate)" },
											...availableThemes.map((item) => ({
												id: item.id,
												name: item.name,
											})),
										],
									},
									{ status: 400 }
								);
							}
						}

						const updated = await setGuildGenerateConfig(guildId, {
							poolSize: body.poolSize as 3 | 4 | 5 | 6 | undefined,
							themeId: body.themeId,
						});
						const themeName = await getThemeDisplayName(updated.themeId);
						return Response.json({
							guildId: updated.guildId,
							poolSize: updated.poolSize,
							themeId: updated.themeId,
							themeName,
							updatedAt: updated.updatedAt,
						});
					} catch (error) {
						console.error("Error updating guild config:", error);
						return Response.json({ error: "Error updating guild config" }, { status: 500 });
					}
				},
			},

			"/guilds/:guildId/config/reload": {
				POST: async (req) => {
					try {
						const guildId = req.params.guildId;
						const config = await reloadGuildGenerateConfig(guildId);
						const themeName = await getThemeDisplayName(config.themeId);
						return Response.json({
							guildId: config.guildId,
							poolSize: config.poolSize,
							themeId: config.themeId,
							themeName,
							updatedAt: config.updatedAt,
							reloaded: true,
						});
					} catch (error) {
						console.error("Error reloading guild config:", error);
						return Response.json({ error: "Error reloading guild config" }, { status: 500 });
					}
				},
			},
		},

		// Fallback for unmatched routes
		fetch(_req) {
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
