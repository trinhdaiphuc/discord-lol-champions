# Discord League of Legends Champion Bot

A Discord bot that generates random League of Legends champion team compositions and renders them as images. Includes AI-powered champion analysis, player stats lookup via Riot API, theming support, and per-server configuration.

You can invite the bot to your server: [Invite Bot](https://discord.com/oauth2/authorize?client_id=1437063850976477254&permissions=1374389603344&integration_type=0&scope=bot).

## Features

-   🎲 **Random champion team generation** with configurable pool sizes
-   🎨 **Multiple visual themes** for generated images
-   🔕 **Champion exclusions** with autocomplete search — exclude specific champions from generation
-   📜 **History window** — avoid repeating champions from recent sessions
-   📊 **Team synergy analysis** — AI-powered composition strength analysis with detailed metrics
-   📈 **Composition history** — track and review past team generations
-   ⚙️ **Per-server configuration** stored in SQLite with repository pattern
-   🤖 **AI assistant** (OpenAI or Google Gemini) for LoL questions
-   📊 **Player stats** via Riot Games API

## Slash Commands

| Command | Description |
|---|---|
| `/gen` | Generate a random champion team image |
| `/gen-role` | Generate teams filtered by a specific role |
| `/gen-exclude` | Generate teams excluding specified champions (autocomplete search + text input) |
| `/history` | View recent team composition analyses |
| `/config view` | Show current server configuration |
| `/config pool` | Set champions per role (3–6) |
| `/config history` | Set how many recent matches to avoid repeating |
| `/config theme` | Set the image theme for this server |
| `/config reload` | Reload config from persistent storage |
| `/clear` | Clear champion cache for this server |
| `/ask` | Ask the AI a LoL question |
| `/random-team` | Split members into two random teams |
| `/ping` | Health check |

## Self Hosting

### Prerequisites

-   [Bun](https://bun.sh/) runtime (v1.x+)
-   Canvas native dependencies (`libcairo`, `libpango`, etc.) — see [node-canvas](https://github.com/Automattic/node-canvas#compiling)

### Environment Variables

Create a `.env` file in the root directory:

```env
DRAGON_VERSION=16.9.1
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
GOOGLE_API_KEY=your_google_api_key
# OR
OPENAI_KEY=your_openai_key
RIOT_API_KEY=your_riot_api_key
```

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | ✅ | Discord Bot Token from the [Discord Developer Portal](https://discord.com/developers/applications) |
| `CLIENT_ID` | ✅ | Discord Application Client ID |
| `DRAGON_VERSION` | ✅ | Riot Data Dragon version (e.g. `16.9.1`) |
| `GOOGLE_API_KEY` | Optional | API key for Google Gemini from [Google AI Studio](https://aistudio.google.com/) |
| `OPENAI_KEY` | Optional | API key for OpenAI from [OpenAI Platform](https://platform.openai.com/) |
| `RIOT_API_KEY` | Optional | API key from [Riot Developer Portal](https://developer.riotgames.com/) — enables player stats |

> You only need one of `GOOGLE_API_KEY` or `OPENAI_KEY` for AI features.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/trinhdaiphuc/discord-lol-champions.git
    cd discord-lol-champions
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

## How to Run

### Running Locally

1.  **Start the bot (development mode with auto-reload):**
    ```bash
    bun run dev
    ```

2.  **Or start in production mode:**
    ```bash
    bun run start
    ```

3.  **Register Slash Commands** (run once, or whenever commands change):
    ```bash
    bun run register-commands
    ```

4.  **Update champion data** from Riot's Data Dragon API:
    ```bash
    bun run update-champions
    ```

### Running with Docker

1.  **Build the Docker image:**
    ```bash
    docker build -t discord-lol-champions .
    ```

2.  **Run the container:**
    ```bash
    docker run --env-file .env -p 3000:3000 discord-lol-champions
    ```

3.  **Or use Docker Compose:**
    ```bash
    docker-compose up
    ```

### Deploy to Fly.io

```bash
fly deploy
```

## API Endpoints

The bot exposes a REST API on port 3000.

### `GET /`

Health check.

---

### `POST /ask`

Ask the AI a League of Legends question.

**Request:**
```json
{ "question": "What is the best build for Yasuo?" }
```

**Response:**
```json
{ "question": "...", "answer": "..." }
```

---

### `POST /random-team`

Split a list of members into two random teams.

**Request:**
```json
{ "members": ["Player1", "Player2", "Player3", "Player4"] }
```

**Response:**
```json
{ "teamA": ["Player1", "Player3"], "teamB": ["Player2", "Player4"] }
```

---

### `GET /gen-champions/:guildId`

Generate a champion team composition image (JPEG) for a guild using its configured settings.

---

### `GET /gen-champions/role/:roleName?guildId=<id>`

Generate a champion team composition image filtered by role.

**Roles:** `Fighter` | `Mage` | `Tank` | `Marksman` | `Support` | `Assassin`

---

### `GET /guilds/:guildId/config`

Get the current configuration for a guild.

**Response:**
```json
{
  "guildId": "...",
  "poolSize": 4,
  "historyWindow": 1,
  "themeId": "hextech-current",
  "themeName": "Hextech Current",
  "updatedAt": "..."
}
```

---

### `PUT /guilds/:guildId/config`

Update configuration for a guild.

**Request:**
```json
{
  "poolSize": 5,
  "historyWindow": 2,
  "themeId": "skyforge-light"
}
```

**Available `themeId` values:** `random` | `cyberpunk-terminal` | `eclipse-jade` | `ember-dusk` | `hextech-current` | `midnight-tide` | `obsidian-gold` | `pixel-arcade` | `retro-futurism-neon` | `skyforge-light`

---

### `GET /guilds/:guildId/history`

Get recent team composition analysis history for a guild.

**Query Parameters:**
- `limit` (optional, default: 10, max: 50) - Number of records to retrieve
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "guildId": "...",
  "total": 42,
  "limit": 10,
  "offset": 0,
  "records": [
    {
      "id": 1,
      "generationMode": "full",
      "poolSize": 5,
      "blueTeam": ["Ahri", "Garen", ...],
      "redTeam": ["Yasuo", "Lux", ...],
      "blueScores": {
        "engage": { "score": 75, "label": "Good" },
        "damage": { "score": 82, "label": "Strong" },
        ...
      },
      "redScores": { ... },
      "summary": "...",
      "compositionSignature": "abc123...",
      "createdAt": "2026-05-10T04:30:00.000Z"
    }
  ]
}
```

---

---

### `POST /guilds/:guildId/config/reload`

Reload guild configuration from persistent storage.

## Development Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start with watch mode (auto-reload on changes) |
| `bun run start` | Start in production mode |
| `bun run register-commands` | Register slash commands with Discord |
| `bun run update-champions` | Fetch latest champion data from Riot API |
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | Run ESLint |
| `bun run lint:fix` | Run ESLint with auto-fix |
| `bun run format` | Format code with Prettier |
| `bun run format:check` | Check formatting without writing |
| `bun run check` | Lint + format check |
| `bun run fix` | Lint fix + format (run before committing) |
