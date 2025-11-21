const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

let aiClient = null;
let aiType = null; // 'openai' or 'gemini'

function initAI() {
	if (aiClient) return;

	if (process.env.OPENAI_KEY) {
		try {
			aiClient = new OpenAI({
				apiKey: process.env.OPENAI_KEY,
			});
			aiType = "openai";
			console.log("✅ AI Service initialized with OpenAI");
			return;
		} catch (error) {
			console.error("Failed to initialize OpenAI client:", error);
		}
	}

	if (process.env.GOOGLE_API_KEY) {
		try {
			const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
			aiClient = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
			aiType = "gemini";
			console.log("✅ AI Service initialized with Google Gemini");
			return;
		} catch (error) {
			console.error("Failed to initialize Google Gemini client:", error);
		}
	}

	console.warn("⚠️ No valid AI API keys found. AI features will be disabled.");
}

// Initialize on module load
initAI();

async function askAI(question) {
	if (!aiClient) {
		throw new Error("AI Service is not configured. Please check your API keys.");
	}

	const systemPrompt =
		"Bạn là một chuyên gia về Liên minh huyền thoại chuyên trả lời các câu hỏi xoay quanh về game này và trả lời bằng tiếng Việt và ngắn gọn tối đa 100 từ";

	if (aiType === "openai") {
		try {
			const completion = await aiClient.chat.completions.create({
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: question },
				],
				model: "gpt-4o-mini",
			});
			return completion.choices[0].message.content;
		} catch (error) {
			// If OpenAI fails at runtime, we could try to fallback to Gemini if configured,
			// but the requirement was "check logic... when init only".
			// So we just throw the error.
			throw error;
		}
	}

	if (aiType === "gemini") {
		// For Gemini, we can prepend the system prompt or use systemInstruction if supported.
		// Prepending is safer for compatibility if we are unsure about the model version support for systemInstruction in this specific call context,
		// but let's try to pass it in the generation call or just prepend it for simplicity and robustness.
		// Given the user request "add a prompt", prepending is a safe bet.
		const fullPrompt = `${systemPrompt}\n\nUser Question: ${question}`;
		const result = await aiClient.generateContent(fullPrompt);
		const response = await result.response;
		return response.text();
	}
}

module.exports = { askAI };
