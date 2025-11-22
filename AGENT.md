# Project Overview: Discord LoL Champions Bot

This project is a Discord bot and web server designed to generate League of Legends team compositions and images. It uses `discord.js` for bot interactions and `express` for serving generated images.

## 📂 Project Structure

```
.
├── app.js                  # Main entry point. Initializes Bot and Server.
├── package.json            # Dependencies and scripts.
├── champions.json          # Data file containing champion information.
├── images/                 # Directory storing champion images.
└── src/
    ├── commands/           # Discord slash command definitions.
    ├── core/               # Core infrastructure.
    │   ├── bot.js          # Discord client factory.
    │   ├── server.js       # Express server setup.
    │   └── config.js       # Configuration loader.
    ├── events/             # Discord event handlers (e.g., ready, interactionCreate).
    ├── services/           # Business logic.
    │   ├── championService.js # Manages champion data.
    │   ├── imageService.js    # Generates team images using Canvas.
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
    -   `/gen-champions/:seed`: Generates and displays a team composition image based on a seed.

### 3. Image Generation (`src/services/imageService.js`)
-   Uses `canvas` (node-canvas) to draw images.
-   **Functionality**: Creates a visual representation of Blue vs. Red teams with a "Hextech" aesthetic.
-   **Assets**: Loads champion images from the `images/` directory.

### 4. Data Management (`src/services/championService.js`)
-   Loads champion data from `champions.json`.
-   Provides methods to get random champions, filter by role, etc.

## 🚀 Workflow

### Development
-   **Start**: `npm run dev` (uses `nodemon` for hot reloading).
-   **Register Commands**: `npm run register-commands`.

### Configuration
-   **Environment Variables**: Managed via `.env`.
    -   `BOT_TOKEN`: Discord Bot Token.
    -   `CLIENT_ID`: Discord Application ID.
    -   `GEMINI_API_KEY`: API key for Google Gemini.

## 📝 Notes for Agents
-   **Image Generation**: When modifying `imageService.js`, remember that it runs on the server. Visual changes usually require checking the generated image URL.
-   **Canvas**: The project uses `canvas`. Ensure you understand the 2D context API for drawing operations.
-   **File Paths**: Always use absolute paths or `path.join` when dealing with file system operations to ensure cross-platform compatibility.
