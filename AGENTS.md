<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Project Overview: Discord LoL Champions Bot

This project is a Discord bot and web server designed to generate League of Legends team compositions and images. It uses `discord.js` for bot interactions and `express` for serving generated images. **Built with Bun runtime and TypeScript.**

## 📂 Project Structure

```
.
├── src/
│   ├── app.ts              # Main entry point
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── commands/           # Discord slash command definitions
│   │   ├── ask.ts
│   │   ├── echo.ts
│   │   ├── g9.ts
│   │   ├── gen.ts
│   │   ├── gen-role.ts
│   │   ├── ping.ts
│   │   └── random-team.ts
│   ├── core/               # Core infrastructure
│   │   ├── bot.ts          # Discord client factory
│   │   ├── server.ts       # Express server setup
│   │   ├── config.ts       # Configuration loader
│   │   └── promise.ts      # Promise utilities
│   ├── data/               # Data access layer
│   │   └── championRepository.ts
│   ├── events/             # Discord event handlers
│   │   ├── ready.ts
│   │   └── interactionCreate.ts
│   ├── services/           # Business logic
│   │   ├── championService.ts
│   │   ├── imageService.ts
│   │   ├── teamService.ts
│   │   └── aiService.ts
│   └── scripts/            # Utility scripts
│       ├── updateChampions.ts
│       ├── verifyRoleConfig.ts
│       ├── compareOldVsNewTags.ts
│       └── testNewRoleLogic.ts
├── images/                 # Champion images
├── champions.json          # Champion data
├── config.json             # Bot configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── Dockerfile              # Multi-stage Docker build with Bun
└── .prettierrc             # Prettier configuration
```

## 🔑 Key Components

### 1. Discord Bot (`src/core/bot.ts`, `src/commands`, `src/events`)
-   Built with `discord.js` and TypeScript.
-   **Commands**: Defined in `src/commands/*.ts`. Automatically loaded by `src/app.ts`.
-   **Events**: Handled in `src/events/*.ts`.
-   **Registration**: Run `bun run register-commands` to update slash commands.

### 2. Web Server (`src/core/server.ts`)
-   Built with `Bun.serve` (native Bun HTTP server - faster than Express).
-   **Port**: Defaults to 3000.
-   **Endpoints**:
    -   `/gen-champions/:guildId`: Generates and displays a team composition image.
    -   `/gen-champions/role/:roleName`: Generates teams filtered by role.
    -   `/ask`: AI question endpoint.
    -   `/random-team`: Create random teams from members.

### 3. Image Generation (`src/services/imageService.ts`)
-   Uses `canvas` (node-canvas) to draw images.
-   **Functionality**: Creates a visual representation of Blue vs. Red teams with a "Hextech" aesthetic.
-   **Assets**: Loads champion images from the `images/` directory.

### 4. Data Management (`src/services/championService.ts`)
-   Loads champion data from `champions.json`.
-   Provides methods to get random champions, filter by role, etc.

### 5. AI Service (`src/services/aiService.ts`)
-   Supports both OpenAI and Google Gemini.
-   **Graceful degradation**: Returns friendly message if AI is not configured.

### 6. Utility Scripts (`src/scripts/`)

#### `updateChampions.ts`
-   **Purpose**: Fetches the latest champion data from Riot's Data Dragon API and updates `champions.json` and `config.json`.
-   **Role Logic**: 
    -   Champions with both Fighter and Assassin tags → assigned to Assassin role
    -   Champions with both Tank and Support tags → assigned to BOTH roles
    -   All other champions → assigned to their first tag
-   **Run**: `bun run src/scripts/updateChampions.ts`

#### `verifyRoleConfig.ts`
-   **Purpose**: Verifies that `config.json` role assignments match the expected logic based on champion tags from `champions.json`.
-   **Output**: Shows role distribution and validates that all roles match correctly.
-   **Run**: `bun run src/scripts/verifyRoleConfig.ts`

#### `compareOldVsNewTags.ts`
-   **Purpose**: Compares old logic (all tags) vs new logic (first tag only) to show which champions were filtered out.
-   **Output**: Lists 130 champions that were removed from secondary roles when switching to first-tag-only logic.
-   **Run**: `bun run src/scripts/compareOldVsNewTags.ts`

#### `testNewRoleLogic.ts`
-   **Purpose**: Tests and displays the current role assignment logic with special rules for Fighter/Assassin and Tank/Support combinations.
-   **Output**: Shows role distribution changes and lists all champions in each role.
-   **Run**: `bun run src/scripts/testNewRoleLogic.ts`

## 🚀 Workflow

### Development
-   **Start**: `bun run dev` (uses Bun's built-in watch mode)
-   **Register Commands**: `bun run register-commands`
-   **Type Check**: `bun run typecheck`
-   **Lint**: `bun run lint` or `bun run lint:fix`
-   **Format**: `bun run format` or `bun run format:check`

### Production (Docker)
-   **Build**: `docker build -t mr-gold:latest .`
-   **Run**: `docker run --rm -p 3000:3000 -e BOT_TOKEN=... -e CLIENT_ID=... mr-gold:latest`

### Configuration
-   **Environment Variables**: Managed via `.env`.
    -   `BOT_TOKEN`: Discord Bot Token.
    -   `CLIENT_ID`: Discord Application ID.
    -   `GOOGLE_API_KEY`: API key for Google Gemini.
    -   `OPENAI_KEY`: API key for OpenAI (optional).

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
-   **TypeScript**: All source files are TypeScript (`.ts`). No compilation step needed - Bun runs TS natively.
-   **Imports**: Use `.ts` extensions in imports for Bun compatibility.
-   **Canvas**: The `canvas` package works with Bun but requires native dependencies.
-   **Code Style**: Run `bun run fix` before committing to ensure consistent formatting.
