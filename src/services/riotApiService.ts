import axios, { AxiosError } from "axios";

// Regional routing values for ACCOUNT API (only 3 regions)
const ACCOUNT_ROUTES = {
  AMERICAS: "americas.api.riotgames.com",
  ASIA: "asia.api.riotgames.com",
  EUROPE: "europe.api.riotgames.com",
} as const;

// Regional routing values for MATCH-V5 API (includes SEA for VN players)
const MATCH_ROUTES = {
  AMERICAS: "americas.api.riotgames.com",
  ASIA: "asia.api.riotgames.com",
  EUROPE: "europe.api.riotgames.com",
  SEA: "sea.api.riotgames.com",
} as const;

// Map taglines to ACCOUNT API regions (3 regions only)
const TAG_TO_ACCOUNT_REGION: Record<string, keyof typeof ACCOUNT_ROUTES> = {
  // Asia regions (including VN, SEA countries for account lookup)
  VN: "ASIA",
  VN2: "ASIA",
  SG: "ASIA",
  SG2: "ASIA",
  TH: "ASIA",
  TH2: "ASIA",
  PH: "ASIA",
  PH2: "ASIA",
  TW: "ASIA",
  TW2: "ASIA",
  KR: "ASIA",
  JP: "ASIA",
  JP1: "ASIA",
  OCE: "ASIA",
  // Americas regions
  NA: "AMERICAS",
  NA1: "AMERICAS",
  BR: "AMERICAS",
  BR1: "AMERICAS",
  LAN: "AMERICAS",
  LAS: "AMERICAS",
  // Europe regions
  EUW: "EUROPE",
  EUW1: "EUROPE",
  EUNE: "EUROPE",
  EUN1: "EUROPE",
  TR: "EUROPE",
  TR1: "EUROPE",
  RU: "EUROPE",
};

// Map taglines to MATCH-V5 API regions (4 regions - SEA for VN)
const TAG_TO_MATCH_REGION: Record<string, keyof typeof MATCH_ROUTES> = {
  // SEA regions (VN, SG, TH, PH, TW use SEA for match data)
  VN: "SEA",
  VN2: "SEA",
  SG: "SEA",
  SG2: "SEA",
  TH: "SEA",
  TH2: "SEA",
  PH: "SEA",
  PH2: "SEA",
  TW: "SEA",
  TW2: "SEA",
  OCE: "SEA",
  // Asia regions (KR, JP use ASIA for match data)
  KR: "ASIA",
  JP: "ASIA",
  JP1: "ASIA",
  // Americas regions
  NA: "AMERICAS",
  NA1: "AMERICAS",
  BR: "AMERICAS",
  BR1: "AMERICAS",
  LAN: "AMERICAS",
  LAS: "AMERICAS",
  // Europe regions
  EUW: "EUROPE",
  EUW1: "EUROPE",
  EUNE: "EUROPE",
  EUN1: "EUROPE",
  TR: "EUROPE",
  TR1: "EUROPE",
  RU: "EUROPE",
};

// Interfaces for API responses
export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface MatchParticipant {
  puuid: string;
  summonerName: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championName: string;
  champLevel: number;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  visionScore: number;
  win: boolean;
  teamPosition: string;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
}

export interface MatchInfo {
  gameId: number;
  gameMode: string;
  gameType: string;
  gameDuration: number;
  gameStartTimestamp: number;
  gameEndTimestamp: number;
  queueId: number;
  mapId: number;
  participants: MatchParticipant[];
}

export interface MatchData {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: MatchInfo;
}

export interface PlayerMatchStats {
  matchId: string;
  gameMode: string;
  gameDuration: number;
  gameDate: Date;
  champion: string;
  champLevel: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs: number;
  csPerMin: number;
  goldEarned: number;
  damage: number;
  visionScore: number;
  win: boolean;
  position: string;
  multiKills: {
    doubles: number;
    triples: number;
    quadras: number;
    pentas: number;
  };
}

export interface PlayerSummary {
  gameName: string;
  tagLine: string;
  puuid: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgKDA: number;
  avgCS: number;
  avgGold: number;
  avgDamage: number;
  avgVisionScore: number;
  favoriteChampions: { champion: string; games: number; winRate: number }[];
  favoritePositions: { position: string; games: number }[];
  recentMatches: PlayerMatchStats[];
}

class RiotApiService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.RIOT_API_KEY || "";
    if (!this.apiKey) {
      console.warn("⚠️ RIOT_API_KEY not found. Riot API features will be disabled.");
    }
    console.log("RIOT_API_KEY:", this.apiKey);
  }

  private getAccountRoute(tagLine: string): string {
    const normalizedTag = tagLine.toUpperCase();
    const region = TAG_TO_ACCOUNT_REGION[normalizedTag] || "ASIA"; // Default to ASIA
    console.log(`🗺️ Account region: ${tagLine} -> ${region} -> ${ACCOUNT_ROUTES[region]}`);
    return ACCOUNT_ROUTES[region];
  }

  private getMatchRoute(tagLine: string): string {
    const normalizedTag = tagLine.toUpperCase();
    const region = TAG_TO_MATCH_REGION[normalizedTag] || "SEA"; // Default to SEA for VN
    console.log(`🗺️ Match region: ${tagLine} -> ${region} -> ${MATCH_ROUTES[region]}`);
    return MATCH_ROUTES[region];
  }

  private async makeRequest<T>(url: string): Promise<T> {
    console.log(`🌐 Riot API Request: ${url}`);
    try {
      const response = await axios.get<T>(url, {
        headers: {
          "X-Riot-Token": this.apiKey,
        },
      });
      console.log(`✅ Riot API Response: ${response.status}`);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(`❌ Riot API Error: ${error.response?.status} - ${error.response?.statusText}`);
        console.error(`   URL: ${url}`);
        console.error(`   Response data:`, error.response?.data);
        if (error.response?.status === 404) {
          throw new Error("Không tìm thấy người chơi. Vui lòng kiểm tra lại tên game và tag.");
        }
        if (error.response?.status === 403) {
          throw new Error("API key không hợp lệ hoặc đã hết hạn.");
        }
        if (error.response?.status === 429) {
          throw new Error("Vượt quá giới hạn request. Vui lòng thử lại sau.");
        }
        if (error.response?.status === 401) {
          throw new Error("API key không được cung cấp hoặc không hợp lệ.");
        }
        throw new Error(`Riot API error: ${error.response?.status} - ${error.message}`);
      }
      console.error(`❌ Unexpected error:`, error);
      throw error;
    }
  }

  /**
   * Parse gameName#tagLine format
   */
  parseRiotId(input: string): { gameName: string; tagLine: string } {
    const parts = input.split("#");
    if (parts.length !== 2) {
      throw new Error("Định dạng không hợp lệ. Vui lòng nhập theo format: gameName#tagLine");
    }
    return {
      gameName: parts[0].trim(),
      tagLine: parts[1].trim(),
    };
  }

  /**
   * Get account info by Riot ID (gameName#tagLine)
   */
  async getAccountByRiotId(gameName: string, tagLine: string): Promise<RiotAccount> {
    if (!this.apiKey) {
      throw new Error("Riot API chưa được cấu hình. Vui lòng liên hệ admin.");
    }

    const accountRoute = this.getAccountRoute(tagLine);
    const url = `https://${accountRoute}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

    return this.makeRequest<RiotAccount>(url);
  }

  /**
   * Get list of match IDs for a player
   */
  async getMatchIdsByPuuid(
    puuid: string,
    tagLine: string,
    count: number = 10,
    queueId?: number
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error("Riot API chưa được cấu hình. Vui lòng liên hệ admin.");
    }

    const matchRoute = this.getMatchRoute(tagLine);
    let url = `https://${matchRoute}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`;

    if (queueId) {
      url += `&queue=${queueId}`;
    }

    return this.makeRequest<string[]>(url);
  }

  /**
   * Get match details by match ID
   */
  async getMatchById(matchId: string, tagLine: string): Promise<MatchData> {
    if (!this.apiKey) {
      throw new Error("Riot API chưa được cấu hình. Vui lòng liên hệ admin.");
    }

    const matchRoute = this.getMatchRoute(tagLine);
    const url = `https://${matchRoute}/lol/match/v5/matches/${matchId}`;

    return this.makeRequest<MatchData>(url);
  }

  /**
   * Extract player stats from a match
   */
  private extractPlayerStats(match: MatchData, puuid: string): PlayerMatchStats | null {
    const participant = match.info.participants.find((p) => p.puuid === puuid);
    if (!participant) return null;

    const gameDurationMinutes = match.info.gameDuration / 60;
    const cs = participant.totalMinionsKilled + participant.neutralMinionsKilled;
    const deaths = participant.deaths || 1; // Avoid division by zero

    return {
      matchId: match.metadata.matchId,
      gameMode: match.info.gameMode,
      gameDuration: match.info.gameDuration,
      gameDate: new Date(match.info.gameStartTimestamp),
      champion: participant.championName,
      champLevel: participant.champLevel,
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      kda: (participant.kills + participant.assists) / deaths,
      cs: cs,
      csPerMin: cs / gameDurationMinutes,
      goldEarned: participant.goldEarned,
      damage: participant.totalDamageDealtToChampions,
      visionScore: participant.visionScore,
      win: participant.win,
      position: participant.teamPosition || "UNKNOWN",
      multiKills: {
        doubles: participant.doubleKills,
        triples: participant.tripleKills,
        quadras: participant.quadraKills,
        pentas: participant.pentaKills,
      },
    };
  }

  /**
   * Get player match history summary
   */
  async getPlayerSummary(gameName: string, tagLine: string, matchCount: number = 10): Promise<PlayerSummary> {
    // Step 1: Get account info
    const account = await this.getAccountByRiotId(gameName, tagLine);

    // Step 2: Get match IDs
    const matchIds = await this.getMatchIdsByPuuid(account.puuid, tagLine, matchCount);

    if (matchIds.length === 0) {
      throw new Error("Không tìm thấy lịch sử trận đấu cho người chơi này.");
    }

    // Step 3: Get match details (limit concurrent requests)
    const matchPromises = matchIds.map((id) => this.getMatchById(id, tagLine));
    const matches = await Promise.all(matchPromises);

    // Step 4: Extract player stats from each match
    const matchStats: PlayerMatchStats[] = [];
    for (const match of matches) {
      const stats = this.extractPlayerStats(match, account.puuid);
      if (stats) {
        matchStats.push(stats);
      }
    }

    if (matchStats.length === 0) {
      throw new Error("Không thể phân tích lịch sử trận đấu.");
    }

    // Step 5: Calculate summary statistics
    const wins = matchStats.filter((m) => m.win).length;
    const losses = matchStats.length - wins;

    const avgKills = matchStats.reduce((sum, m) => sum + m.kills, 0) / matchStats.length;
    const avgDeaths = matchStats.reduce((sum, m) => sum + m.deaths, 0) / matchStats.length;
    const avgAssists = matchStats.reduce((sum, m) => sum + m.assists, 0) / matchStats.length;
    const avgKDA = matchStats.reduce((sum, m) => sum + m.kda, 0) / matchStats.length;
    const avgCS = matchStats.reduce((sum, m) => sum + m.cs, 0) / matchStats.length;
    const avgGold = matchStats.reduce((sum, m) => sum + m.goldEarned, 0) / matchStats.length;
    const avgDamage = matchStats.reduce((sum, m) => sum + m.damage, 0) / matchStats.length;
    const avgVisionScore = matchStats.reduce((sum, m) => sum + m.visionScore, 0) / matchStats.length;

    // Calculate favorite champions
    const championStats: Record<string, { games: number; wins: number }> = {};
    for (const match of matchStats) {
      if (!championStats[match.champion]) {
        championStats[match.champion] = { games: 0, wins: 0 };
      }
      championStats[match.champion].games++;
      if (match.win) championStats[match.champion].wins++;
    }

    const favoriteChampions = Object.entries(championStats)
      .map(([champion, stats]) => ({
        champion,
        games: stats.games,
        winRate: (stats.wins / stats.games) * 100,
      }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);

    // Calculate favorite positions
    const positionStats: Record<string, number> = {};
    for (const match of matchStats) {
      if (match.position && match.position !== "UNKNOWN") {
        positionStats[match.position] = (positionStats[match.position] || 0) + 1;
      }
    }

    const favoritePositions = Object.entries(positionStats)
      .map(([position, games]) => ({ position, games }))
      .sort((a, b) => b.games - a.games);

    return {
      gameName: account.gameName,
      tagLine: account.tagLine,
      puuid: account.puuid,
      totalGames: matchStats.length,
      wins,
      losses,
      winRate: (wins / matchStats.length) * 100,
      avgKills: Math.round(avgKills * 10) / 10,
      avgDeaths: Math.round(avgDeaths * 10) / 10,
      avgAssists: Math.round(avgAssists * 10) / 10,
      avgKDA: Math.round(avgKDA * 100) / 100,
      avgCS: Math.round(avgCS),
      avgGold: Math.round(avgGold),
      avgDamage: Math.round(avgDamage),
      avgVisionScore: Math.round(avgVisionScore * 10) / 10,
      favoriteChampions,
      favoritePositions,
      recentMatches: matchStats.slice(0, 5),
    };
  }

  /**
   * Format player summary for display
   */
  formatPlayerSummary(summary: PlayerSummary): string {
    const champList = summary.favoriteChampions
      .map((c) => `${c.champion} (${c.games} trận, ${c.winRate.toFixed(0)}% win)`)
      .join(", ");

    const positionList = summary.favoritePositions
      .map((p) => `${this.translatePosition(p.position)} (${p.games})`)
      .join(", ");

    const recentResults = summary.recentMatches
      .slice(0, 5)
      .map((m) => `${m.win ? "🏆" : "❌"} ${m.champion} ${m.kills}/${m.deaths}/${m.assists}`)
      .join("\n");

    return `
📊 **Thống kê người chơi: ${summary.gameName}#${summary.tagLine}**

**Tổng quan ${summary.totalGames} trận gần đây:**
• Tỷ lệ thắng: ${summary.winRate.toFixed(1)}% (${summary.wins}W - ${summary.losses}L)
• KDA trung bình: ${summary.avgKills}/${summary.avgDeaths}/${summary.avgAssists} (${summary.avgKDA} KDA)
• CS trung bình: ${summary.avgCS}
• Damage trung bình: ${summary.avgDamage.toLocaleString()}
• Vision Score TB: ${summary.avgVisionScore}

**Tướng hay chơi:** ${champList}

**Vị trí hay chơi:** ${positionList}

**5 trận gần nhất:**
${recentResults}
`.trim();
  }

  private translatePosition(position: string): string {
    const positionMap: Record<string, string> = {
      TOP: "Top",
      JUNGLE: "Jungle",
      MIDDLE: "Mid",
      BOTTOM: "ADC",
      UTILITY: "Support",
    };
    return positionMap[position] || position;
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Singleton instance
export const riotApiService = new RiotApiService();
