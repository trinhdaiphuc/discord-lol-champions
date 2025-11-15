const fs = require("fs");
const { generateTeamImage } = require("./imageGenerator");
const { generateTeams } = require("./teamGenerator");
const { AttachmentBuilder } = require("discord.js");

async function handleGenCommand(message) {
	let sentMessage;
	try {
		sentMessage = await message.reply("🎲 Generating teams...");

		const { blueTeam, redTeam } = await generateTeams();
		const imageBuffer = await generateTeamImage(blueTeam, redTeam);
		const attachment = new AttachmentBuilder(imageBuffer, { name: "team.png" });

		await sentMessage.edit({
			files: [attachment],
			content: "⚔️ ARAM Teams (6 roles × 3 champions)",
		});
	} catch (error) {
		console.error("❌ Bot error:", error);
		sentMessage.edit(`❌ Error: ${error.message}`);
	}
}

function handleMessage(message) {
	if (message.author.bot) return;

	if (message.content.toLowerCase() === "/gen") {
		handleGenCommand(message);
	}
}

module.exports = { handleMessage, handleGenCommand };
