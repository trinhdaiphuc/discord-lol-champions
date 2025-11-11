const { handleMessage } = require('./commandHandler');

function registerEventHandlers(client) {
    client.on("ready", () => {
        console.log(`✅ Bot is online as ${client.user.tag}!`);
    });

    client.on("messageCreate", handleMessage);
}

module.exports = { registerEventHandlers };
