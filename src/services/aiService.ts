import OpenAI from "openai";
import {
	GoogleGenerativeAI,
	type GenerativeModel,
	type FunctionDeclaration,
	SchemaType,
} from "@google/generative-ai";
import { riotApiService, type PlayerSummary } from "./riotApiService.ts";

let aiClient: OpenAI | GenerativeModel | null = null;
let aiType: "openai" | "gemini" | null = null;

// Tool definitions for AI function calling
const playerLookupTool: FunctionDeclaration = {
	name: "lookup_player_stats",
	description:
		"Tra cứu thống kê và lịch sử trận đấu của người chơi League of Legends bằng Riot ID. Sử dụng khi người dùng hỏi về thống kê, lịch sử trận đấu, hoặc muốn biết thông tin về một người chơi cụ thể.",
	parameters: {
		type: SchemaType.OBJECT,
		properties: {
			riotId: {
				type: SchemaType.STRING,
				description: "Riot ID của người chơi theo format gameName#tagLine (ví dụ: Player123#VN2)",
			},
			matchCount: {
				type: SchemaType.NUMBER,
				description: "Số trận đấu cần phân tích (mặc định 10, tối đa 20)",
			},
		},
		required: ["riotId"],
	},
};

// OpenAI tool format
const openAITools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
	{
		type: "function",
		function: {
			name: "lookup_player_stats",
			description:
				"Tra cứu thống kê và lịch sử trận đấu của người chơi League of Legends bằng Riot ID. Sử dụng khi người dùng hỏi về thống kê, lịch sử trận đấu, hoặc muốn biết thông tin về một người chơi cụ thể.",
			parameters: {
				type: "object",
				properties: {
					riotId: {
						type: "string",
						description:
							"Riot ID của người chơi theo format gameName#tagLine (ví dụ: Player123#VN2)",
					},
					matchCount: {
						type: "number",
						description: "Số trận đấu cần phân tích (mặc định 10, tối đa 20)",
					},
				},
				required: ["riotId"],
			},
		},
	},
];

function initAI(): void {
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
			aiClient = genAI.getGenerativeModel({
				model: "gemini-2.0-flash",
				tools: [{ functionDeclarations: [playerLookupTool] }],
				generationConfig: {
					temperature: 0.9, // Higher temperature for more creative/playful responses
				},
			});
			aiType = "gemini";
			console.log("Google API key:", process.env.GOOGLE_API_KEY);
			console.log("✅ AI Service initialized with Google Gemini (with tools)");
			return;
		} catch (error) {
			console.error("Failed to initialize Google Gemini client:", error);
		}
	}

	console.warn("⚠️ No valid AI API keys found. AI features will be disabled.");
}

// Initialize on module load
initAI();

/**
 * Execute the player lookup tool
 */
async function executePlayerLookup(riotId: string, matchCount?: number): Promise<PlayerSummary> {
	console.log(`🔍 Looking up player: ${riotId}`);
	const { gameName, tagLine } = riotApiService.parseRiotId(riotId);
	console.log(`📝 Parsed: gameName=${gameName}, tagLine=${tagLine}`);
	const count = Math.min(matchCount || 10, 20); // Cap at 20 matches
	const summary = await riotApiService.getPlayerSummary(gameName, tagLine, count);
	console.log(`✅ Player lookup successful: ${summary.totalGames} games found`);
	return summary;
}

/**
 * Handle tool calls and execute appropriate functions
 */
async function handleToolCall(
	toolName: string,
	args: Record<string, unknown>
): Promise<string> {
	console.log(`🔧 Tool called: ${toolName}`, JSON.stringify(args));
	try {
		if (toolName === "lookup_player_stats") {
			const riotId = args.riotId as string;
			const matchCount = args.matchCount as number | undefined;
			const summary = await executePlayerLookup(riotId, matchCount);
			console.log(`✅ Tool ${toolName} executed successfully`);
			return JSON.stringify(summary);
		}
		console.warn(`⚠️ Unknown tool: ${toolName}`);
		return JSON.stringify({ error: "Unknown tool" });
	} catch (error) {
		console.error(`❌ Tool ${toolName} failed:`, (error as Error).message);
		return JSON.stringify({ error: (error as Error).message });
	}
}

const systemPrompt = `
Bạn là một chuyên gia về Liên minh huyền thoại. Bạn có thể tra cứu thống kê người chơi và đưa ra nhận xét chi tiết. Trả lời bằng tiếng Việt, giọng điệu vui vẻ, mỉa mai và đầy đủ thông tin. Nếu người dùng nhập tên game#tagline hoặc hỏi về thống kê người chơi, hãy sử dụng tool lookup_player_stats để lấy dữ liệu. 
`;

/**
 * Ask AI with tool support (Gemini)
 */
async function askGeminiWithTools(question: string): Promise<string> {
	const geminiClient = aiClient as GenerativeModel;

	const chat = geminiClient.startChat({
		history: [
			{
				role: "user",
				parts: [{ text: systemPrompt }],
			},
			{
				role: "model",
				parts: [
					{
						text: "Tôi hiểu. Tôi sẽ giúp bạn tra cứu thống kê người chơi và đưa ra nhận xét chi tiết về phong cách chơi của họ.",
					},
				],
			},
		],
	});

	// Send the user's question
	let result = await chat.sendMessage(question);
	let response = result.response;

	// Check if the model wants to call a function
	const functionCalls = response.functionCalls();

	if (functionCalls && functionCalls.length > 0) {
		// Execute each function call
		const functionResponses = [];

		for (const functionCall of functionCalls) {
			const toolResult = await handleToolCall(
				functionCall.name,
				functionCall.args as Record<string, unknown>
			);

			functionResponses.push({
				functionResponse: {
					name: functionCall.name,
					response: { result: toolResult },
				},
			});
		}

		// Send function results back to the model
		result = await chat.sendMessage(functionResponses);
		response = result.response;
	}

	return response.text();
}

/**
 * Ask AI with tool support (OpenAI)
 */
async function askOpenAIWithTools(question: string): Promise<string> {
	const openaiClient = aiClient as OpenAI;

	const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
		{ role: "system", content: systemPrompt },
		{ role: "user", content: question },
	];

	let completion = await openaiClient.chat.completions.create({
		messages,
		model: "gpt-4o-mini",
		tools: openAITools,
		tool_choice: "auto",
		temperature: 0.9, // Higher temperature for more creative/playful responses
	});

	let assistantMessage = completion.choices[0].message;

	// Handle tool calls
	while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
		messages.push(assistantMessage);

		for (const toolCall of assistantMessage.tool_calls) {
			// Access function properties with type assertion for standard function calls
			const fnCall = toolCall as { type: "function"; id: string; function: { name: string; arguments: string } };
			const functionName = fnCall.function.name;
			const functionArgs = JSON.parse(fnCall.function.arguments);

			const toolResult = await handleToolCall(functionName, functionArgs);

			messages.push({
				role: "tool",
				tool_call_id: toolCall.id,
				content: toolResult,
			});
		}

		// Get the next response
		completion = await openaiClient.chat.completions.create({
			messages,
			model: "gpt-4o-mini",
			tools: openAITools,
			tool_choice: "auto",
		});

		assistantMessage = completion.choices[0].message;
	}

	return assistantMessage.content || "";
}

export async function askAI(question: string): Promise<string> {
	// Return friendly message if AI is not configured
	if (!aiClient) {
		return "🤖 Tính năng AI hiện không khả dụng. Vui lòng liên hệ admin để cấu hình.";
	}

	try {
		if (aiType === "openai" && aiClient instanceof OpenAI) {
			return await askOpenAIWithTools(question);
		}

		if (aiType === "gemini") {
			return await askGeminiWithTools(question);
		}

		// Unknown AI type - return friendly message
		return "🤖 Tính năng AI hiện không khả dụng. Vui lòng liên hệ admin để cấu hình.";
	} catch (error) {
		console.error("AI request failed:", (error as Error).message);
		return "🤖 Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại sau.";
	}
}

/**
 * Direct player lookup (without AI summarization)
 */
export async function lookupPlayer(riotId: string, matchCount?: number): Promise<string> {
	try {
		const { gameName, tagLine } = riotApiService.parseRiotId(riotId);
		const count = Math.min(matchCount || 10, 20);
		const summary = await riotApiService.getPlayerSummary(gameName, tagLine, count);
		return riotApiService.formatPlayerSummary(summary);
	} catch (error) {
		return `❌ Lỗi: ${(error as Error).message}`;
	}
}
