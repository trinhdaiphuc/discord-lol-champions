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
│       └── updateChampions.ts
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
