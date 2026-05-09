# Project Overview: Discord LoL Champions Bot

This project is a Discord bot and web server designed to generate League of Legends team compositions and images. It uses `discord.js` for bot interactions and `Bun.serve` for the HTTP API. **Built with Bun runtime and TypeScript.**

## 📂 Project Structure

```
.
├── src/
│   ├── app.ts              # Main entry point
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── commands/           # Discord slash command definitions
│   │   ├── ask.ts
│   │   ├── clear.ts
│   │   ├── config.ts
│   │   ├── echo.ts
│   │   ├── g9.ts
│   │   ├── gen.ts
│   │   ├── gen-exclude.ts
│   │   ├── gen-role.ts
│   │   ├── ping.ts
│   │   └── random-team.ts
│   ├── core/               # Core infrastructure
│   │   ├── bot.ts          # Discord client factory
│   │   ├── server.ts       # Bun.serve HTTP server setup
│   │   ├── config.ts       # Configuration loader
│   │   └── promise.ts      # Promise utilities
│   ├── data/               # Data access layer
│   │   └── championRepository.ts
│   ├── events/             # Discord event handlers
│   │   ├── ready.ts
│   │   └── interactionCreate.ts
│   ├── services/           # Business logic
│   │   ├── aiService.ts
│   │   ├── championNameService.ts
│   │   ├── championService.ts
│   │   ├── channelConfigService.ts
│   │   ├── compAnalysisHistoryService.ts
│   │   ├── imageService.ts
│   │   ├── riotApiService.ts
│   │   ├── synergyAnalysisService.ts
│   │   ├── teamService.ts
│   │   └── themeService.ts
│   └── scripts/            # Utility scripts
│       ├── compareOldVsNewTags.ts
│       ├── testGenerateExclusions.ts
│       ├── testNewRoleLogic.ts
│       ├── updateChampions.ts
│       └── verifyRoleConfig.ts
├── data/                   # Persistent SQLite storage
│   └── channel-config.sqlite
├── images/                 # Champion images
├── themes/                 # Image theme JSON files
│   ├── index.json
│   ├── cyberpunk-terminal.json
│   ├── eclipse-jade.json
│   ├── ember-dusk.json
│   ├── hextech-current.json
│   ├── midnight-tide.json
│   ├── obsidian-gold.json
│   ├── pixel-arcade.json
│   ├── retro-futurism-neon.json
│   └── skyforge-light.json
├── champions.json          # Champion data
├── checksum.json           # Champion data checksum for update detection
├── config.json             # Bot configuration (role assignments)
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── Dockerfile              # Multi-stage Docker build with Bun
├── docker-compose.yml      # Docker Compose configuration
├── fly.toml                # Fly.io deployment configuration
└── .prettierrc             # Prettier configuration
```

## 🔑 Key Components

### 1. Discord Bot (`src/core/bot.ts`, `src/commands`, `src/events`)
-   Built with `discord.js` and TypeScript.
-   **Commands**: Defined in `src/commands/*.ts`. Automatically loaded by `src/app.ts`.
-   **Events**: Handled in `src/events/*.ts`.
-   **Registration**: Run `bun run register-commands` to update slash commands.

#### Slash Commands

| Command | Description |
|---|---|
| `/gen` | Generate a random champion team image for the server |
| `/gen-role` | Generate teams filtered by a specific role |
| `/gen-exclude` | Generate teams excluding specified champions (comma-separated) |
| `/config` | Configure server settings (pool size, history window, theme) |
| `/clear` | Clear champion team cache for the server |
| `/ask` | Ask the AI a League of Legends question |
| `/random-team` | Split members into two random teams |
| `/ping` | Health check |
| `/echo` | Echo a message |
| `/g9` | G9 |

### 2. Web Server (`src/core/server.ts`)
-   Built with `Bun.serve` (native Bun HTTP server — faster than Express).
-   **Port**: Defaults to 3000.
-   **Endpoints**:
    -   `GET /`: Health check.
    -   `GET /gen-champions/:guildId`: Generates and returns a team composition image (JPEG).
    -   `GET /gen-champions/role/:roleName?guildId=...`: Generates teams filtered by role.
    -   `POST /ask`: AI question endpoint.
    -   `POST /random-team`: Split member list into two random teams.
    -   `GET /guilds/:guildId/config`: Read guild configuration.
    -   `PUT /guilds/:guildId/config`: Update guild configuration (poolSize, historyWindow, themeId).
    -   `POST /guilds/:guildId/config/reload`: Reload guild config from persistent storage.

### 3. Image Generation (`src/services/imageService.ts`)
-   Uses `canvas` (node-canvas) to draw images.
-   **Functionality**: Creates a visual representation of Blue vs. Red teams with configurable themes.
-   **Assets**: Loads champion images from the `images/` directory.

### 4. Theme System (`src/services/themeService.ts`, `themes/`)
-   JSON-driven visual themes for generated images.
-   **Available themes**: `cyberpunk-terminal`, `eclipse-jade`, `ember-dusk`, `hextech-current`, `midnight-tide`, `obsidian-gold`, `pixel-arcade`, `retro-futurism-neon`, `skyforge-light`.
-   **Special theme**: `random` — picks a new theme on every generate call.
-   Themes are listed in `themes/index.json` and loaded at runtime.

### 5. Guild Config Service (`src/services/channelConfigService.ts`)
-   Stores per-guild settings in SQLite (`data/channel-config.sqlite`).
-   **Settings**:
    -   `poolSize`: Champions per role per side (3–6, default 4).
    -   `historyWindow`: Recent matches to avoid repeating (0–5, default 1).
    -   `themeId`: Active image theme for the guild.

### 6. Data Management (`src/services/championService.ts`)
-   Loads champion data from `champions.json`.
-   Provides methods to get random champions, filter by role, etc.

### 7. Champion Name Service (`src/services/championNameService.ts`)
-   Fuzzy/alias mapping from human-readable champion names to internal champion IDs.
-   Used by `/gen-exclude` to resolve user-provided exclusion lists.

### 8. AI Service (`src/services/aiService.ts`)
-   Supports both OpenAI and Google Gemini.
-   **Graceful degradation**: Returns friendly message if AI is not configured.

### 9. Riot API Service (`src/services/riotApiService.ts`)
-   Fetches live player stats and match history from Riot Games API.
-   Requires `RIOT_API_KEY` environment variable.

### 10. Synergy Analysis (`src/services/synergyAnalysisService.ts`)
-   Analyzes champion synergies and composition strengths.

### 11. Comp Analysis History (`src/services/compAnalysisHistoryService.ts`)
-   Tracks previously generated compositions to avoid recent repeats (implements the `historyWindow` feature).

### 12. Utility Scripts (`src/scripts/`)

#### `updateChampions.ts`
-   **Purpose**: Fetches the latest champion data from Riot's Data Dragon API and updates `champions.json`, `config.json`, and `checksum.json`.
-   **Role Logic**:
    -   Champions with both Fighter and Assassin tags → assigned to Assassin role
    -   Champions with both Tank and Support tags → assigned to BOTH roles
    -   All other champions → assigned to their first tag
-   **Run**: `bun run update-champions`

#### `verifyRoleConfig.ts`
-   **Purpose**: Verifies that `config.json` role assignments match the expected logic based on champion tags from `champions.json`.
-   **Output**: Shows role distribution and validates that all roles match correctly.
-   **Run**: `bun run src/scripts/verifyRoleConfig.ts`

#### `compareOldVsNewTags.ts`
-   **Purpose**: Compares old logic (all tags) vs new logic (first tag only) to show which champions were filtered out.
-   **Run**: `bun run src/scripts/compareOldVsNewTags.ts`

#### `testNewRoleLogic.ts`
-   **Purpose**: Tests and displays the current role assignment logic with special rules for Fighter/Assassin and Tank/Support combinations.
-   **Run**: `bun run src/scripts/testNewRoleLogic.ts`

#### `testGenerateExclusions.ts`
-   **Purpose**: Tests champion exclusion logic — verifies that `generateTeamsWithExclusions` correctly omits specified champions.
-   **Run**: `bun run src/scripts/testGenerateExclusions.ts`

## 🚀 Workflow

### Development
-   **Start**: `bun run dev` (uses Bun's built-in watch mode)
-   **Register Commands**: `bun run register-commands`
-   **Update Champions**: `bun run update-champions`
-   **Type Check**: `bun run typecheck`
-   **Lint**: `bun run lint` or `bun run lint:fix`
-   **Format**: `bun run format` or `bun run format:check`
-   **Lint + Format**: `bun run check` (check only) or `bun run fix` (auto-fix)

### Production (Docker)
-   **Build**: `docker build -t mr-gold:latest .`
-   **Run**: `docker run --rm -p 3000:3000 --env-file .env mr-gold:latest`
-   **Compose**: `docker-compose up`

### Deploy (Fly.io)
-   App name: `mr-gold-lol-bot`
-   Region: `sin` (Singapore)
-   **Deploy**: `fly deploy`

### Configuration
-   **Environment Variables**: Managed via `.env`.
    -   `BOT_TOKEN`: Discord Bot Token.
    -   `CLIENT_ID`: Discord Application ID.
    -   `DRAGON_VERSION`: Riot Data Dragon API version (e.g. `16.9.1`).
    -   `GOOGLE_API_KEY`: API key for Google Gemini (optional).
    -   `OPENAI_KEY`: API key for OpenAI (optional).
    -   `RIOT_API_KEY`: API key for Riot Games API (optional, enables player stats).

## 🐳 Docker

The Dockerfile uses a multi-stage build with Bun:

1. **Base stage**: Bun runtime with canvas dependencies and fonts.
2. **Build stage**: Compiles native modules (canvas).
3. **Final stage**: Clean image with just the app.

## 🛠️ Code Quality

### TypeScript (`tsconfig.json`)
-   ES2022 target with ESNext modules
-   Strict mode enabled
-   Bun types included

### ESLint (`eslint.config.js`)
-   TypeScript ESLint parser and plugin
-   Integrated with Prettier

### Prettier (`.prettierrc`)
-   Tabs for indentation
-   Double quotes
-   Trailing commas (ES5)
-   Print width: 100

## 📝 Notes for Agents

-   **Runtime**: This project uses Bun, not Node.js. Use `bun` commands instead of `npm`/`node`.
-   **TypeScript**: All source files are TypeScript (`.ts`). No compilation step needed — Bun runs TS natively.
-   **Imports**: Use `.ts` extensions in imports for Bun compatibility.
-   **Canvas**: The `canvas` package works with Bun but requires native dependencies.
-   **SQLite**: Guild configs are persisted in `data/channel-config.sqlite` via Bun's native SQLite API.
-   **Themes**: New themes must be added as JSON files in `themes/` and registered in `themes/index.json`.
-   **Code Style**: Run `bun run fix` before committing to ensure consistent formatting.
-   **Scripts shortcut**: `bun run update-champions` is the canonical way to refresh champion data (not calling the script path directly).
