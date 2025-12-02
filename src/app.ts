import { readdirSync } from "fs";
import { join } from "path";
import { Collection } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { createClient } from "./core/bot.ts";
import { createServer } from "./core/server.ts";
import { readConfig } from "./core/config.ts";
import * as championService from "./services/championService.ts";
import type { BotCommand, BotEvent, ExtendedClient } from "./types/index.ts";

async function main(): Promise<void> {
	// Load config and champions
	const config = await readConfig();
	await championService.loadChampions();
	console.log(
		`✅ Champion data loaded. (${Object.keys(championService.getChampions()).length} champions)`
	);

	// Create Discord client
	const client: ExtendedClient = createClient();
	client.commands = new Collection();

	// Load commands
	const commandsPath = join(import.meta.dir, "commands");
	const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith(".ts"));

	for (const file of commandFiles) {
		const filePath = join(commandsPath, file);
		const commandModule = await import(filePath);
		const command: BotCommand = commandModule.default;
		client.commands.set(command.data.name, command);
	}
	console.log(`✅ Loaded ${client.commands.size} commands.`);

	// Load events
	const eventsPath = join(import.meta.dir, "events");
	const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith(".ts"));

	for (const file of eventFiles) {
		const filePath = join(eventsPath, file);
		const eventModule = await import(filePath);
		const event: BotEvent = eventModule.default;
		if (event.once) {
			client.once(event.name, (...args: unknown[]) => event.execute(...args));
		} else {
			client.on(event.name, (...args: unknown[]) => event.execute(...args));
		}
	}
	console.log(`✅ Loaded ${eventFiles.length} events.`);

	// Command registration
	if (process.argv.includes("--register-commands")) {
		const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN!);
		try {
			console.log("Started refreshing application (/) commands.");
			await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), {
				body: client.commands.map((c) => c.data.toJSON()),
			});
			console.log("Successfully reloaded application (/) commands.");
		} catch (error) {
			console.error(error);
		}
		return;
	}

	// Login to Discord
	client.login(process.env.BOT_TOKEN);

	// Start server (Bun.serve starts immediately)
	const port = process.env.PORT || 3000;
	const server = createServer(port);
	console.log(`✅ Server listening at ${server.url}`);

	// Graceful shutdown handler
	const shutdown = async (signal: string) => {
		console.log(`\n⏳ Received ${signal}, shutting down gracefully...`);

		try {
			// Stop accepting new HTTP connections, wait for active ones to complete
			console.log("⏳ Stopping HTTP server...");
			await server.stop();
			console.log("✅ HTTP server stopped");

			// Destroy Discord client
			console.log("⏳ Disconnecting Discord client...");
			client.destroy();
			console.log("✅ Discord client disconnected");

			console.log("👋 Goodbye!");
			process.exit(0);
		} catch (error) {
			console.error("❌ Error during shutdown:", error);
			process.exit(1);
		}
	};

	// Listen for termination signals
	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch(console.error);

