# Discord League of Legends Champion Bot

This Discord bot generates random teams of League of Legends champions and displays them in an image format. It also includes an AI chat feature using OpenAI or Google Gemini.

You can use this url to invite the bot to your server: [Invite Bot](https://discord.com/oauth2/authorize?client_id=1437063850976477254&permissions=1374389603344&integration_type=0&scope=bot).

## Self Hosting

To host this bot yourself, you need to configure the environment variables. Create a `.env` file in the root directory with the following content:

```env
DRAGON_VERSION=13.24.1
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
GOOGLE_API_KEY=your_google_api_key
# OR
OPENAI_KEY=your_openai_key
```

### Environment Variables

-   `DRAGON_VERSION`: The version of the Riot Data Dragon API (e.g., `13.24.1`).
-   `BOT_TOKEN`: Your Discord Bot Token. You can create one at the [Discord Developer Portal](https://discord.com/developers/applications).
-   `CLIENT_ID`: Your Discord App Client ID.
-   `GOOGLE_API_KEY`: (Optional) API Key for Google Gemini. Get it from [Google AI Studio](https://aistudio.google.com/).
-   `OPENAI_KEY`: (Optional) API Key for OpenAI. Get it from [OpenAI Platform](https://platform.openai.com/).

**Note:** You only need either `GOOGLE_API_KEY` or `OPENAI_KEY` for the AI features. The bot supports fallback if both are provided.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/trinhdaiphuc/discord-lol-champions.git
    cd discord-lol-champions
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## How to Run

### Running Locally

1.  **Start the bot:**
    ```bash
    npm start
    ```

2.  **Register Slash Commands:**
    Run this once to register the commands (`/ask`, etc.) with Discord:
    ```bash
    npm run register-commands
    ```

### Running with Docker

1.  **Build the Docker image:**
    ```bash
    docker build -t discord-lol-champions .
    ```

2.  **Run the container:**
    ```bash
    docker run --env-file .env discord-lol-champions
    ```

## API Endpoints

The bot exposes a REST API for interacting with its features.

### POST /ask

Ask a question to the AI (League of Legends Expert).

**Request:**
```json
{
  "question": "What is the best build for Yasuo?"
}
```

**Response:**
```json
{
  "question": "What is the best build for Yasuo?",
  "answer": "The best build for Yasuo typically involves..."
}
```

### POST /random-team

Generate random teams.

**Request:**
```json
{
  "members": ["Player1", "Player2", ...]
}
```

### GET /gen-champions/:guildId

Generate champion image for a guild.

### GET /gen-champions/role/:roleName

Generate champion image by role.
