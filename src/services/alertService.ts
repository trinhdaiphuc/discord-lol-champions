import axios from "axios";

interface TelegramAlertConfig {
	enabled: boolean;
	host: string;
	botToken: string;
	chatId: string;
	messageThreadId?: number;
}

function readTelegramAlertConfig(): TelegramAlertConfig {
	const rawThreadId = process.env.ALERT_TELEGRAM_MESSAGE_THREAD_ID;
	const parsedThreadId = rawThreadId ? Number(rawThreadId) : Number.NaN;

	return {
		enabled: process.env.ALERT_TELEGRAM_ENABLE === "true",
		host: process.env.ALERT_TELEGRAM_HOST || "https://api.telegram.org",
		botToken: process.env.ALERT_TELEGRAM_BOT_TOKEN || "",
		chatId: process.env.ALERT_TELEGRAM_CHAT_ID || "",
		messageThreadId: Number.isFinite(parsedThreadId) ? parsedThreadId : undefined,
	};
}

/**
 * Sends an alert message to the configured Telegram channel and topic
 * (message thread). Alerting is best-effort: failures are logged and swallowed
 * so they never break the caller's primary workflow.
 */
export async function sendTelegramAlert(message: string): Promise<void> {
	const config = readTelegramAlertConfig();

	if (!config.enabled) {
		return;
	}

	if (!config.botToken || !config.chatId) {
		console.error(
			"Telegram alert is enabled but ALERT_TELEGRAM_BOT_TOKEN or ALERT_TELEGRAM_CHAT_ID is missing."
		);
		return;
	}

	const url = `${config.host}/bot${config.botToken}/sendMessage`;
	const payload: Record<string, unknown> = {
		chat_id: config.chatId,
		text: message,
		parse_mode: "HTML",
		disable_web_page_preview: true,
	};

	if (config.messageThreadId !== undefined) {
		payload.message_thread_id = config.messageThreadId;
	}

	try {
		await axios.post(url, payload, { timeout: 15_000 });
		console.log("Telegram alert sent.");
	} catch (error) {
		console.error("Failed to send Telegram alert:", (error as Error).message);
	}
}
