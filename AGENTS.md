# Project Overview: Discord LoL Champions Bot

This project is a Discord bot and web server designed to generate League of Legends team compositions and images. It uses `discord.js` for bot interactions and `express` for serving generated images.

## 📂 Project Structure

```
.
├── app.js                  # Main entry point. Initializes Bot and Server.
├── ecosystem.config.js     # PM2 configuration for production.
├── package.json            # Dependencies and scripts.
├── champions.json          # Data file containing champion information.
├── Dockerfile              # Multi-stage Docker build with PM2.
├── .prettierrc             # Prettier configuration.
├── eslint.config.js        # ESLint configuration (flat config).
├── images/                 # Directory storing champion images.
└── src/
    ├── commands/           # Discord slash command definitions.
    ├── core/               # Core infrastructure.
    │   ├── bot.js          # Discord client factory.
    │   ├── server.js       # Express server setup.
    │   └── config.js       # Configuration loader.
    ├── data/               # Data access layer.
    │   └── championRepository.js # Champion data persistence.
    ├── events/             # Discord event handlers (e.g., ready, interactionCreate).
    ├── services/           # Business logic.
    │   ├── championService.js # Manages champion data.
    │   ├── imageService.js    # Generates team images using Canvas.
    │   ├── teamService.js     # Team generation logic.
    │   └── aiService.js       # AI integration (Gemini/OpenAI).
    └── scripts/            # Utility scripts (e.g., data updates).
```

## 🔑 Key Components

### 1. Discord Bot (`src/core/bot.js`, `src/commands`, `src/events`)
-   Built with `discord.js`.
-   **Commands**: Defined in `src/commands`. Automatically loaded by `app.js`.
-   **Events**: Handled in `src/events`.
-   **Registration**: Run `npm run register-commands` to update slash commands.

### 2. Web Server (`src/core/server.js`, `app.js`)
-   Built with `express`.
-   **Port**: Defaults to 3000.
-   **Endpoints**:
    -   `/gen-champions/:guildId`: Generates and displays a team composition image.
    -   `/gen-champions/role/:roleName`: Generates teams filtered by role.
    -   `/ask`: AI question endpoint.
    -   `/random-team`: Create random teams from members.

### 3. Image Generation (`src/services/imageService.js`)
-   Uses `canvas` (node-canvas) to draw images.
-   **Functionality**: Creates a visual representation of Blue vs. Red teams with a "Hextech" aesthetic.
-   **Assets**: Loads champion images from the `images/` directory.
-   **Fonts**: Uses Liberation fonts (Arial-compatible) in Docker.

### 4. Data Management (`src/services/championService.js`)
-   Loads champion data from `champions.json`.
-   Provides methods to get random champions, filter by role, etc.

### 5. AI Service (`src/services/aiService.js`)
-   Supports both OpenAI and Google Gemini.
-   **Graceful degradation**: Returns friendly message if AI is not configured.
-   **Priority**: OpenAI > Gemini (checks env vars in order).

## 🚀 Workflow

### Development
-   **Start**: `npm run dev` (uses `nodemon` for hot reloading).
-   **Register Commands**: `npm run register-commands`.
-   **Lint**: `npm run lint` (check) or `npm run lint:fix` (auto-fix).
-   **Format**: `npm run format` (format all) or `npm run format:check` (check only).
-   **Fix All**: `npm run fix` (lint + format).

### Production (Docker)
-   **Build**: `docker build -t mr-gold:latest .`
-   **Run**: `docker run --rm -p 3000:3000 -e BOT_TOKEN=... -e CLIENT_ID=... mr-gold:latest`
-   **Process Manager**: Uses PM2 with `ecosystem.config.js` for graceful shutdown.

### Configuration
-   **Environment Variables**: Managed via `.env`.
    -   `BOT_TOKEN`: Discord Bot Token.
    -   `CLIENT_ID`: Discord Application ID.
    -   `GOOGLE_API_KEY`: API key for Google Gemini.
    -   `OPENAI_KEY`: API key for OpenAI (optional).

## 🐳 Docker

The Dockerfile uses a multi-stage build for optimization:

1. **Base stage**: Runtime dependencies (canvas libs, fonts, PM2).
2. **Build stage**: Compiles native modules (canvas).
3. **Final stage**: Clean image with just the app.

**Key packages installed**:
-   `libcairo2`, `libpango`, `libjpeg`, `libgif`, `librsvg` - Canvas runtime.
-   `fonts-liberation` - Arial-compatible fonts.
-   `pm2` - Process manager for graceful shutdown.

## 🛠️ Code Quality

### ESLint (`eslint.config.js`)
-   Uses ESLint 9 flat config.
-   Rules: `eqeqeq`, `curly`, `no-var`, `prefer-const`.
-   Integrated with Prettier via `eslint-config-prettier`.

### Prettier (`.prettierrc`)
-   Tabs for indentation.
-   Double quotes.
-   Trailing commas (ES5).
-   Print width: 100.

## 📝 Notes for Agents

-   **Image Generation**: When modifying `imageService.js`, remember that it runs on the server. Visual changes usually require checking the generated image URL.
-   **Canvas**: The project uses `canvas`. Ensure you understand the 2D context API for drawing operations.
-   **File Paths**: Always use absolute paths or `path.join` when dealing with file system operations to ensure cross-platform compatibility.
-   **AI Service**: The AI service gracefully handles missing configuration - it returns a friendly message instead of throwing errors.
-   **Docker Fonts**: The Docker image uses Liberation fonts. "Arial" in code will render as Liberation Sans.
-   **Graceful Shutdown**: PM2 handles SIGTERM/SIGINT signals in Docker. The app has a 5-second kill timeout.
-   **Code Style**: Run `npm run fix` before committing to ensure consistent formatting.
