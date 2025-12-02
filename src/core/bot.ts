import { Client, GatewayIntentBits } from "discord.js";
import cron from "node-cron";
import { updateChampions } from "../scripts/updateChampions.ts";
import * as championService from "../services/championService.ts";
import { readConfig } from "./config.ts";
import type { ExtendedClient } from "../types/index.ts";

export function createClient(): ExtendedClient {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
  }) as ExtendedClient;

  // Cron job to update champions daily
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily champion update...");
    await updateChampions();
    // Reload config and champions after update
    const config = await readConfig();
    console.log("Config data loaded successfully.");
    console.log("Current version:", config.DRAGON_VERSION);
    await championService.reloadChampions();
  });

  return client;
}

