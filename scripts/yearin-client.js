/**
 * YearIn.LoL Complete API Client
 *
 * Fetches user game data from yearin.lol by username
 * Uses protobufjs for proper protobuf decoding
 *
 * Usage:
 *   node yearin-client.js "GameName#TagLine"
 *   Example: node yearin-client.js "Hoàng Nha Khoa#QDP"
 *
 * Requirements:
 *   npm install axios protobufjs
 */

const axios = require("axios");
const protobuf = require("protobufjs");
const fs = require("fs");
const path = require("path");

// API endpoints
const GQL_API_URL = "https://api.yearin.lol/gql";
// CDN URL is constructed dynamically in fetchGameData() with year pattern

// Champion ID to Name mapping
const CHAMPION_NAMES = {
	1: "Annie",
	2: "Olaf",
	3: "Galio",
	4: "Twisted Fate",
	5: "Xin Zhao",
	6: "Urgot",
	7: "LeBlanc",
	8: "Vladimir",
	9: "Fiddlesticks",
	10: "Kayle",
	11: "Master Yi",
	12: "Alistar",
	13: "Ryze",
	14: "Sion",
	15: "Sivir",
	16: "Soraka",
	17: "Teemo",
	18: "Tristana",
	19: "Warwick",
	20: "Nunu & Willump",
	21: "Miss Fortune",
	22: "Ashe",
	23: "Tryndamere",
	24: "Jax",
	25: "Morgana",
	26: "Zilean",
	27: "Singed",
	28: "Evelynn",
	29: "Twitch",
	30: "Karthus",
	31: "Cho'Gath",
	32: "Amumu",
	33: "Rammus",
	34: "Anivia",
	35: "Shaco",
	36: "Dr. Mundo",
	37: "Sona",
	38: "Kassadin",
	39: "Irelia",
	40: "Janna",
	41: "Gangplank",
	42: "Corki",
	43: "Karma",
	44: "Taric",
	45: "Veigar",
	48: "Trundle",
	50: "Swain",
	51: "Caitlyn",
	53: "Blitzcrank",
	54: "Malphite",
	55: "Katarina",
	56: "Nocturne",
	57: "Maokai",
	58: "Renekton",
	59: "Jarvan IV",
	60: "Elise",
	61: "Orianna",
	62: "Wukong",
	63: "Brand",
	64: "Lee Sin",
	67: "Vayne",
	68: "Rumble",
	69: "Cassiopeia",
	72: "Skarner",
	74: "Heimerdinger",
	75: "Nasus",
	76: "Nidalee",
	77: "Udyr",
	78: "Poppy",
	79: "Gragas",
	80: "Pantheon",
	81: "Ezreal",
	82: "Mordekaiser",
	83: "Yorick",
	84: "Akali",
	85: "Kennen",
	86: "Garen",
	89: "Leona",
	90: "Malzahar",
	91: "Talon",
	92: "Riven",
	96: "Kog'Maw",
	98: "Shen",
	99: "Lux",
	101: "Xerath",
	102: "Shyvana",
	103: "Ahri",
	104: "Graves",
	105: "Fizz",
	106: "Volibear",
	107: "Rengar",
	110: "Varus",
	111: "Nautilus",
	112: "Viktor",
	113: "Sejuani",
	114: "Fiora",
	115: "Ziggs",
	117: "Lulu",
	119: "Draven",
	120: "Hecarim",
	121: "Kha'Zix",
	122: "Darius",
	126: "Jayce",
	127: "Lissandra",
	131: "Diana",
	133: "Quinn",
	134: "Syndra",
	136: "Aurelion Sol",
	141: "Kayn",
	142: "Zoe",
	143: "Zyra",
	145: "Kai'Sa",
	147: "Seraphine",
	150: "Gnar",
	154: "Zac",
	157: "Yasuo",
	161: "Vel'Koz",
	163: "Taliyah",
	164: "Camille",
	166: "Akshan",
	200: "Bel'Veth",
	201: "Braum",
	202: "Jhin",
	203: "Kindred",
	221: "Zeri",
	222: "Jinx",
	223: "Tahm Kench",
	233: "Briar",
	234: "Viego",
	235: "Senna",
	236: "Lucian",
	238: "Zed",
	240: "Kled",
	245: "Ekko",
	246: "Qiyana",
	254: "Vi",
	266: "Aatrox",
	267: "Nami",
	268: "Azir",
	350: "Yuumi",
	360: "Samira",
	412: "Thresh",
	420: "Illaoi",
	421: "Rek'Sai",
	427: "Ivern",
	429: "Kalista",
	432: "Bard",
	497: "Rakan",
	498: "Xayah",
	516: "Ornn",
	517: "Sylas",
	518: "Neeko",
	523: "Aphelios",
	526: "Rell",
	555: "Pyke",
	711: "Vex",
	777: "Yone",
	799: "Ambessa",
	800: "Mel",
	875: "Sett",
	876: "Lillia",
	887: "Gwen",
	888: "Renata Glasc",
	893: "Aurora",
	895: "Nilah",
	897: "K'Sante",
	901: "Smolder",
	902: "Milio",
	910: "Hwei",
	950: "Naafiri",
};

// Game mode names
const GAME_MODE_NAMES = {
	1: "All Games",
	2: "Ranked Solo/Duo",
	3: "Normal",
	4: "ARAM",
	5: "Ranked Flex",
};

// HTTP headers for API requests
const API_HEADERS = {
	accept: "application/graphql-response+json, application/graphql+json, application/json",
	"accept-language": "en-US,en;q=0.9",
	"content-type": "application/json",
	origin: "https://yearin.lol",
	"user-agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
};

// Cached protobuf root
let protoRoot = null;

/**
 * Load and cache the protobuf schema
 */
async function loadProtoSchema() {
	if (protoRoot) {
		return protoRoot;
	}

	const protoPath = path.join(__dirname, "yearin.proto");
	protoRoot = await protobuf.load(protoPath);
	return protoRoot;
}

/**
 * Parse username string into gameName and tagLine
 * @param {string} username - Format: "GameName#TagLine"
 * @returns {{gameName: string, tagLine: string}}
 */
function parseUsername(username) {
	const hashIndex = username.lastIndexOf("#");
	if (hashIndex === -1) {
		throw new Error('Invalid username format. Expected "GameName#TagLine"');
	}

	return {
		gameName: username.substring(0, hashIndex),
		tagLine: username.substring(hashIndex + 1),
	};
}

/**
 * Get profile info from GraphQL API
 * @param {string} gameName
 * @param {string} tagLine
 * @returns {Promise<Object>}
 */
async function getProfileInfo(gameName, tagLine) {
	const query = `
    query GetYearInLoLProfileByRiotId($gameName: String!, $tagLine: String!) {
      profile: yilSummoner(summoner: {gameName: $gameName, tagLine: $tagLine}) {
        ...YearInLoLProfile
        __typename
      }
    }
    fragment YearInLoLProfile on BurstFireSummoner {
      gameName
      tagLine
      id
      level
      profileIconId
      tags
      shard
      __typename
    }
  `;

	const response = await axios.post(
		GQL_API_URL,
		{
			operationName: "GetYearInLoLProfileByRiotId",
			query: query,
			variables: { gameName, tagLine },
		},
		{ headers: API_HEADERS },
	);

	if (response.data.errors) {
		throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
	}

	if (!response.data.data?.profile) {
		throw new Error("Profile not found");
	}

	return response.data.data.profile;
}

/**
 * Fetch protobuf game data from CDN
 * @param {string} profileId
 * @returns {Promise<Buffer>}
 */
async function fetchGameData(profileId) {
	// Try multiple year patterns
	const currentYear = new Date().getFullYear();
	const years = [currentYear, currentYear - 1, 2026, 2025];
	const uniqueYears = [...new Set(years)];

	const cdnHeaders = {
		Accept: "*/*",
		"Accept-Language": "en-US,en;q=0.9",
		"User-Agent": API_HEADERS["user-agent"],
		Referer: "https://yearin.lol/",
		Origin: "https://yearin.lol",
		"Sec-Fetch-Dest": "empty",
		"Sec-Fetch-Mode": "cors",
		"Sec-Fetch-Site": "same-site",
	};

	let lastError = null;

	for (const year of uniqueYears) {
		const url = `https://cdn.yearin.lol/yil-${year}/y/${profileId}`;
		try {
			const response = await axios.get(url, {
				responseType: "arraybuffer",
				headers: cdnHeaders,
			});
			console.log(`   Found data at: yil-${year}`);
			return Buffer.from(response.data);
		} catch (error) {
			lastError = error;
			// Continue to next year
		}
	}

	throw new Error(`Failed to fetch from CDN: ${lastError?.message || "Unknown error"}`);
}

/**
 * Decode protobuf data using the schema
 * @param {Buffer} buffer
 * @returns {Promise<Object>}
 */
async function decodeProtobuf(buffer) {
	const root = await loadProtoSchema();
	const YearInProfile = root.lookupType("yearin.YearInProfile");

	// Decode the buffer
	const message = YearInProfile.decode(buffer);

	// Convert to plain object with proper handling of longs and bytes
	const decoded = YearInProfile.toObject(message, {
		longs: Number,
		enums: String,
		bytes: String,
		defaults: true,
		arrays: true,
		objects: true,
	});

	return decoded;
}

/**
 * Transform decoded protobuf to a more readable format
 * @param {Object} decoded - Decoded protobuf object
 * @returns {Object}
 */
function transformProfileData(decoded) {
	const profile = {
		metadata: null,
		gameModes: [],
		achievements: [],
		duoStats: null,
	};

	// Transform metadata
	if (decoded.metadata) {
		profile.metadata = {
			version: decoded.metadata.version || "unknown",
			profileId: decoded.metadata.profileId || "unknown",
		};
	}

	// Transform game modes
	if (decoded.gameModes && Array.isArray(decoded.gameModes)) {
		for (const mode of decoded.gameModes) {
			const gameMode = {
				modeType: mode.modeType || 0,
				modeName: GAME_MODE_NAMES[mode.modeType] || `Mode ${mode.modeType}`,
				aggregate: null,
				champions: [],
			};

			// Transform aggregate stats
			if (mode.aggregate) {
				const agg = mode.aggregate;
				gameMode.aggregate = {
					totalGames: agg.totalGames || 0,
					wins: agg.wins || 0,
					losses: (agg.totalGames || 0) - (agg.wins || 0),
					totalTimeSeconds: agg.totalTimeSeconds || 0,
					totalKills: agg.totalKills || 0,
					totalDeaths: agg.totalDeaths || 0,
					totalAssists: agg.totalAssists || 0,
					totalDamageDealt: agg.totalDamageDealt || 0,
					totalDamageTaken: agg.totalDamageTaken || 0,
					totalGoldEarned: agg.totalGoldEarned || 0,
					totalCs: agg.totalCs || 0,
					totalVisionScore: agg.totalVisionScore || 0,
					pentaKills: agg.pentaKills || 0,
					quadraKills: agg.quadraKills || 0,
					tripleKills: agg.tripleKills || 0,
					doubleKills: agg.doubleKills || 0,
					longestWinStreak: agg.longestWinStreak || 0,
					longestLoseStreak: agg.longestLoseStreak || 0,
					mvpCount: agg.mvpCount || 0,
					aceCount: agg.aceCount || 0,
					firstBloodCount: agg.firstBloodCount || 0,
					dragonsKilled: agg.dragonsKilled || 0,
					baronsKilled: agg.baronsKilled || 0,
					heraldsKilled: agg.heraldsKilled || 0,
					towersDestroyed: agg.towersDestroyed || 0,
				};

				// Calculate derived stats
				const g = gameMode.aggregate;
				g.winRate = g.totalGames > 0 ? ((g.wins / g.totalGames) * 100).toFixed(1) : "0.0";
				g.kda =
					g.totalDeaths > 0
						? ((g.totalKills + g.totalAssists) / g.totalDeaths).toFixed(2)
						: "Perfect";
				g.avgKills = g.totalGames > 0 ? (g.totalKills / g.totalGames).toFixed(1) : "0.0";
				g.avgDeaths = g.totalGames > 0 ? (g.totalDeaths / g.totalGames).toFixed(1) : "0.0";
				g.avgAssists = g.totalGames > 0 ? (g.totalAssists / g.totalGames).toFixed(1) : "0.0";
			}

			// Transform champion stats
			if (mode.champions && Array.isArray(mode.champions)) {
				for (const champ of mode.champions) {
					const champId = champ.championId || 0;
					const champStats = {
						championId: champId,
						championName: CHAMPION_NAMES[champId] || `Champion ${champId}`,
						gamesPlayed: champ.gamesPlayed || 0,
						wins: champ.wins || 0,
						losses: (champ.gamesPlayed || 0) - (champ.wins || 0),
						totalKills: champ.totalKills || 0,
						totalDeaths: champ.totalDeaths || 0,
						totalAssists: champ.totalAssists || 0,
						avgDamageDealt: champ.avgDamageDealt || 0,
						avgDamageTaken: champ.avgDamageTaken || 0,
						avgGoldEarned: champ.avgGoldEarned || 0,
						avgCs: champ.avgCs || 0,
						totalTimePlayed: champ.totalTimePlayedMs || 0,
						pentaKills: champ.pentaKills || 0,
					};

					// Calculate derived stats
					champStats.winRate =
						champStats.gamesPlayed > 0
							? ((champStats.wins / champStats.gamesPlayed) * 100).toFixed(1)
							: "0.0";
					champStats.kda =
						champStats.totalDeaths > 0
							? (
									(champStats.totalKills + champStats.totalAssists) /
									champStats.totalDeaths
							  ).toFixed(2)
							: "Perfect";

					gameMode.champions.push(champStats);
				}

				// Sort champions by games played
				gameMode.champions.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
			}

			profile.gameModes.push(gameMode);
		}
	}

	// Transform achievements
	if (decoded.achievements && Array.isArray(decoded.achievements)) {
		profile.achievements = decoded.achievements.map((ach) => ({
			type: ach.type || 0,
			value: ach.value || 0,
			count: ach.count || 0,
		}));
	}

	// Transform duo stats
	if (decoded.duoStats) {
		const duo = decoded.duoStats;
		profile.duoStats = {
			totalDuoGames: duo.totalDuoGames || 0,
			duoWins: duo.duoWins || 0,
			duoLosses: duo.duoLosses || 0,
			uniquePartnersCount: duo.uniquePartnersCount || 0,
			partners: [],
		};

		if (duo.partners && Array.isArray(duo.partners)) {
			profile.duoStats.partners = duo.partners.map((p) => ({
				profileId: p.profileId || "",
				gamesTogether: p.gamesTogether || 0,
				gameName: p.gameName || "",
				tagLine: p.tagLine || "",
				winsTogether: p.winsTogether || 0,
				lossesTogether: p.lossesTogether || 0,
				winRate:
					p.gamesTogether > 0
						? (((p.winsTogether || 0) / p.gamesTogether) * 100).toFixed(1)
						: "0.0",
			}));

			// Sort partners by games together
			profile.duoStats.partners.sort((a, b) => b.gamesTogether - a.gamesTogether);
		}
	}

	return profile;
}

/**
 * Pretty print profile data
 */
function printProfile(userInfo, gameData) {
	console.log("\n" + "=".repeat(60));
	console.log("📊 YearIn.LoL Profile Data");
	console.log("=".repeat(60));

	// User info
	console.log(`\n👤 Player Info:`);
	console.log(`   Name: ${userInfo.gameName}#${userInfo.tagLine}`);
	console.log(`   Level: ${userInfo.level}`);
	console.log(`   Region: ${userInfo.shard}`);
	if (userInfo.tags && userInfo.tags.length > 0) {
		console.log(`   Tags: ${userInfo.tags.join(", ")}`);
	}

	// Game data
	if (gameData.metadata) {
		console.log(`\n📋 Data Version: ${gameData.metadata.version}`);
	}

	for (const mode of gameData.gameModes) {
		console.log(`\n🎮 ${mode.modeName}:`);

		if (mode.aggregate) {
			const stats = mode.aggregate;
			console.log(`   Total Games: ${stats.totalGames}`);
			console.log(`   Win Rate: ${stats.winRate}% (${stats.wins}W / ${stats.losses}L)`);
			console.log(
				`   KDA: ${stats.kda} (${stats.avgKills}/${stats.avgDeaths}/${stats.avgAssists} avg)`,
			);
			console.log(`   Total Damage: ${stats.totalDamageDealt.toLocaleString()}`);
			console.log(`   Total Gold: ${stats.totalGoldEarned.toLocaleString()}`);

			if (stats.pentaKills > 0) {
				console.log(`   Penta Kills: ${stats.pentaKills}`);
			}
			if (stats.mvpCount > 0) {
				console.log(`   MVP Count: ${stats.mvpCount}`);
			}
		}

		if (mode.champions.length > 0) {
			console.log(`\n   🏆 Top Champions (${mode.champions.length} played):`);
			const topChamps = mode.champions.slice(0, 5);

			for (const champ of topChamps) {
				console.log(
					`      ${champ.championName}: ${champ.gamesPlayed} games, ${champ.winRate}% WR, ${champ.kda} KDA`,
				);
			}
		}
	}

	if (gameData.duoStats && gameData.duoStats.partners.length > 0) {
		console.log(`\n👥 Duo Partners (${gameData.duoStats.uniquePartnersCount} unique):`);
		const topPartners = gameData.duoStats.partners.slice(0, 5);

		for (const partner of topPartners) {
			console.log(
				`   ${partner.gameName}#${partner.tagLine}: ${partner.gamesTogether} games, ${partner.winRate}% WR`,
			);
		}
	}

	console.log("\n" + "=".repeat(60));
}

/**
 * Main API function - can be used programmatically
 * @param {string} username - Format: "GameName#TagLine"
 * @returns {Promise<{userInfo: Object, gameData: Object, rawDecoded: Object}>}
 */
async function getYearInData(username) {
	// Parse username
	const { gameName, tagLine } = parseUsername(username);

	// Step 1: Get profile info from GraphQL
	const userInfo = await getProfileInfo(gameName, tagLine);

	if (!userInfo.id) {
		throw new Error("Profile ID not found in response");
	}

	// Step 2: Fetch game data from CDN
	const buffer = await fetchGameData(userInfo.id);

	// Step 3: Decode protobuf data using schema
	const rawDecoded = await decodeProtobuf(buffer);

	// Step 4: Transform to readable format
	const gameData = transformProfileData(rawDecoded);

	return {
		userInfo,
		gameData,
		rawDecoded, // Include raw decoded data for debugging
	};
}

/**
 * Main CLI function
 */
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log('Usage: node yearin-client.js "GameName#TagLine"');
		console.log("");
		console.log("Examples:");
		console.log('  node yearin-client.js "Hoàng Nha Khoa#QDP"');
		console.log('  node yearin-client.js "Faker#KR1"');
		console.log('  node yearin-client.js "user123#NA1"');
		process.exit(1);
	}

	const username = args[0];

	console.log("\n🎮 YearIn.LoL Client (Protobuf)");
	console.log("================================\n");

	try {
		const { gameName, tagLine } = parseUsername(username);
		console.log(`Looking up: ${gameName}#${tagLine}`);

		// Step 1: Get profile info
		console.log("\n📡 Step 1: Fetching profile info...");
		const userInfo = await getProfileInfo(gameName, tagLine);
		console.log(`✅ Found player: ${userInfo.gameName}#${userInfo.tagLine}`);
		console.log(`   Level: ${userInfo.level}`);
		console.log(`   Region: ${userInfo.shard}`);
		console.log(`   Profile ID: ${userInfo.id}`);

		// Step 2: Fetch game data
		console.log("\n📡 Step 2: Fetching game data from CDN...");
		const buffer = await fetchGameData(userInfo.id);
		console.log(`✅ Received ${buffer.length} bytes`);

		// Step 3: Decode protobuf
		console.log("\n🔧 Step 3: Decoding protobuf with schema...");
		const rawDecoded = await decodeProtobuf(buffer);
		console.log(`✅ Decoded successfully`);

		// Step 4: Transform data
		console.log("\n🔄 Step 4: Transforming data...");
		const gameData = transformProfileData(rawDecoded);
		console.log(`✅ Found ${gameData.gameModes.length} game modes`);

		// Print results
		printProfile(userInfo, gameData);

		// Save to file
		const safeFilename = username.replace(/[^a-zA-Z0-9]/g, "_");
		const timestamp = Date.now();
		const filename = `yearin_${safeFilename}_${timestamp}.json`;

		const output = {
			timestamp: new Date().toISOString(),
			username,
			userInfo,
			gameData,
			rawDecoded, // Include raw for debugging
		};

		fs.writeFileSync(filename, JSON.stringify(output, null, 2));
		console.log(`\n📁 Data saved to: ${filename}`);
	} catch (error) {
		console.error(`\n❌ Error: ${error.message}`);
		if (error.stack) {
			console.error(error.stack);
		}
		process.exit(1);
	}
}

// Export for use as module
module.exports = {
	getYearInData,
	getProfileInfo,
	fetchGameData,
	decodeProtobuf,
	parseUsername,
	transformProfileData,
	loadProtoSchema,
	CHAMPION_NAMES,
	GAME_MODE_NAMES,
};

// Run if called directly
if (require.main === module) {
	main().catch(console.error);
}
