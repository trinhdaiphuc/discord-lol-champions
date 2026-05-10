import type { Client } from "discord.js";
import type { BotEvent } from "../entities/index.ts";

const event: BotEvent<[Client]> = {
	name: "clientReady",
	once: true,
	execute(client) {
		console.log(`✅ Bot is online as ${client.user?.tag}!`);
	},
};

export default event;

