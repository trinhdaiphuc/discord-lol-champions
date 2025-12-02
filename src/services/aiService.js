const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

let aiClient = null;
let aiType = null; // 'openai' or 'gemini'

function initAI() {
	if (aiClient) {
		return;
	}

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
	// Return friendly message if AI is not configured
	if (!aiClient) {
		return "🤖 Tính năng AI hiện không khả dụng. Vui lòng liên hệ admin để cấu hình.";
	}

	const systemPrompt =
		"Bạn là một chuyên gia về Liên minh huyền thoại chuyên trả lời các câu hỏi xoay quanh về game này và trả lời bằng tiếng Việt và ngắn gọn tối đa 100 từ";

	try {
		if (aiType === "openai") {
			const completion = await aiClient.chat.completions.create({
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: question },
				],
				model: "gpt-4o-mini",
			});
			return completion.choices[0].message.content;
		}

		if (aiType === "gemini") {
			const fullPrompt = `${systemPrompt}\n\nUser Question: ${question}`;
			const result = await aiClient.generateContent(fullPrompt);
			const response = await result.response;
			return response.text();
		}

		// Unknown AI type - return friendly message
		return "🤖 Tính năng AI hiện không khả dụng. Vui lòng liên hệ admin để cấu hình.";
	} catch (error) {
		console.error("AI request failed:", error.message);
		return "🤖 Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại sau.";
	}
}

module.exports = { askAI };
