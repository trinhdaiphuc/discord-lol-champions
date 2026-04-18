# Change: Add Channel Generate Config (Pool Size + Theme)

## Why
Users need per-guild control for champion pool size and image theme, with persistence across restarts for both Discord commands and API usage.

## What Changes
- Add per-guild persistent config storage (`poolSize`, `themeId`) backed by SQLite.
- Add theme preset registry in `themes/` with default + custom presets.
- Add `/config` Discord command with subcommands (`view`, `pool`, `theme`, `reload`) and quick choices.
- Apply guild config to `/gen` command and API generate endpoints.
- Add API endpoints to read/update/reload guild config.

## Impact
- Affected specs: channel generate config, image theme presets, command/API config controls.
- Affected code: command handlers, server routes, team generation logic, image renderer, new persistence/theme services.
