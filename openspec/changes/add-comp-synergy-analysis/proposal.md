# Change: Add Team Synergy Analysis History

## Why

The bot currently generates teams but gives little strategic feedback after the pick is shown. A lightweight synergy summary would make each generation more useful immediately, while persisted analysis data would unlock history, anti-duplicate behavior, and guild-level composition statistics.

## What Changes

- Add a default post-generate synergy analysis step for every team generation flow
- Score generated teams with deterministic rule-based logic derived from champion data and tags
- Return a compact Discord-friendly summary covering `engage`, `damage balance`, `CC`, `peel`, `scaling`, and `lane stability`
- Persist generated composition analysis in SQLite for history, duplicate avoidance, and later analytics

## Impact

- Affected specs: team synergy analysis, generated comp history
- Affected code: team generation flow, command responses, API generate endpoints, SQLite persistence services
