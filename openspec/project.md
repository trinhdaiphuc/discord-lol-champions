# Project Context

## Purpose
A Discord bot designed for League of Legends (LoL) players to generate randomized teams for ARAM matches. The goal is to provide balanced team compositions (6 roles x 3 champions per player) while ensuring a fair distribution of champions and preventing repetitions until the entire champion pool is exhausted.

## Tech Stack
- **Runtime**: [Bun](https://bun.sh/)
- **Language**: TypeScript
- **Discord API**: [discord.js](https://discord.js.org/) (v14)
- **Image Generation**: `canvas` for creating team composition images
- **AI Integration**: Google Gemini (via `@google/generative-ai`) for interactive commands like `/ask`
- **Data Source**: Riot Data Dragon API for the latest champion information and assets

## Project Conventions

### Code Style
- **Formatting**: Managed by Prettier and ESLint. Use `bun run lint` and `bun run format`.
- **Naming**: Use descriptive camelCase for variables/functions and PascalCase for interfaces/types.
- **Types**: Strict TypeScript usage; avoid `any` where possible.

### Architecture Patterns
- **Commands**: Slash commands are defined in `src/commands/`.
- **Services**: Business logic is separated into `src/services/` (e.g., `teamService.ts`, `imageService.ts`).
- **Core**: Configuration management and server entry points are in `src/core/`.
- **Scripts**: Utility scripts for data maintenance are in `src/scripts/` (e.g., `updateChampions.ts`).
- **Config**: Persistent state and static role data are stored in `config.json`.

### Testing Strategy
- **Unit Testing**: Use `bun test` for testing logic.
- **Priority**: Focus on team generation logic (`teamService.test.ts`) to ensure repetition prevention and fallback mechanisms work correctly across multiple matches.

### Git Workflow
- **Branching**: Use feature branches.
- **Commits**: Clear, descriptive commit messages.

## Domain Context
- **Champion Roles**: Champions are grouped into Fighter, Mage, Tank, Marksman, Assassin, and Support.
- **ARAM Logic**: Each generated match provides 18 champions per team (3 per role).
- **Fallback Mechanism**: Defined in `config.json`, allowing roles to "borrow" champions from compatible roles (e.g., Support can fallback to Tank or Mage) when the primary pool is empty.

## Important Constraints
- **Repetition Prevention**: No champion can be repeated across matches for a specific guild until the entire champion pool has been cycled through.
- **Accuracy**: Champion data and images must stay up-to-date with Riot’s official Data Dragon versions.

## External Dependencies
- **Discord**: Requires a valid Bot Token and Gateway intents.
- **Google Gemini**: Requires an API key for AI-powered features.
- **Riot Games**: Data Dragon for champion information.
