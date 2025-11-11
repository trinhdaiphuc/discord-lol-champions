# Discord League of Legends Champion Bot

This Discord bot generates random teams of League of Legends champions and displays them in an image format. It's designed to be a fun tool for custom games or for challenging yourself with random champion picks.

## File Structure

Here's a breakdown of the important files in this project:

-   `app.js`: The main entry point for the application. It initializes the bot and handles basic setup.
-   `bot.js`: Contains the core logic for the Discord bot, including event handling and command processing.
-   `botManager.js`: Manages the bot's state and interactions with the Discord API.
-   `championLoader.js`: Responsible for loading champion data from the `champions.json` file.
-   `championManager.js`: Manages the list of champions, including fetching and updating data.
-   `champions.json`: A JSON file containing data about all the League of Legends champions.
-   `commandHandler.js`: Handles the registration and execution of slash commands for the bot.
-   `config.json`: Contains static configuration for the bot, such as the version of the Dragon API.
-   `configManager.js`: Manages the bot's configuration, loading settings from both `config.json` and environment variables.
-   `Dockerfile`: A script for building a Docker image of the application, allowing for easy containerized deployment.
-   `eventHandler.js`: Handles various events from the Discord gateway, such as when the bot is ready.
-   `fly.toml`: Configuration file for deploying the application on the Fly.io platform.
-   `imageGenerator.js`: Generates the images of the champion teams using the `canvas` library.
-   `package.json`: Lists the project's dependencies and defines various scripts for running the application.
-   `teamGenerator.js`: Contains the logic for generating random teams of champions.
-   `updateChampions.js`: A script for updating the `champions.json` file with the latest champion data from the Data Dragon API.
-   `.env`: A file for storing your environment variables (you'll need to create this).

## Configuration

To run this bot, you'll need to configure a few environment variables. Create a file named `.env` in the root of the project and add the following:

```
DRAGON_VERSION=dragon_version_api
BOT_TOKEN=discord_bot_token
CHAMPION_IMAGE_PATH=champion_image_directory_path
```

-   `DRAGON_VERSION`: The version of the Dragon API to use for champion data.
-   `BOT_TOKEN`: The token for your Discord bot. You can get this from the Discord Developer Portal.
-   `CHAMPION_IMAGE_PATH`: The directory path where champion images are stored.

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

### Running the Bot

To start the bot, use the following command:

```bash
npm start
```

This will start the bot and it will connect to Discord.

### Updating Champion Data

To update the `champions.json` file with the latest data from Riot's Data Dragon API, run:

```bash
npm run update-champions
```

It's a good idea to run this periodically to keep the champion data up to date.

### Registering Slash Commands

Before the bot's slash commands are available in your Discord server, you need to register them. You can do this with the following command:

```bash
npm run deploy-commands
```

## Running with Docker

You can also run the bot inside a Docker container.

1.  **Build the Docker image:**
    ```bash
    docker build -t discord-lol-champions .
    ```

2.  **Run the container:**
    Make sure you have your `.env` file created with the necessary environment variables.

    ```bash
    docker run --env-file .env discord-lol-champions
    ```
