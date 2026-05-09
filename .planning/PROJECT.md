# Project: Discord LoL Champions Bot

## Purpose

Build a Bun-based Discord bot and lightweight web API that generates League of Legends champion pools for two sides, renders them as shareable images, and adds useful game-oriented guidance on top of the generated output.

## Current Focus

Phase 1 focuses on a deterministic post-generate synergy summary for generated champion pools, backed by SQLite history so the bot can support history views, duplicate avoidance, and guild-level trend analysis later.

## Core Value

Generated teams should feel useful immediately, not just random. Each generation should give players a fast read on what the pool is good at and where it is weak.

## Constraints

- Runtime is Bun with native TypeScript execution.
- Champion data is local in `champions.json` and role mappings live in `config.json`.
- Existing persistence already uses `bun:sqlite` in `data/channel-config.sqlite`.
- Discord output must stay compact and readable.
- Synergy scoring must be deterministic and must not depend on AI providers.

## Key Decisions

| Date | Decision | Why |
|------|----------|-----|
| 2026-05-09 | Synergy summaries are rule-based from champion data/tags/stats | Stable, cheap, and works without LLM availability |
| 2026-05-09 | Synergy analysis runs by default after generation flows | Makes the feature visible and reusable |
| 2026-05-09 | Analysis records are stored in SQLite | Reuses current persistence and enables history/statistics later |
| 2026-05-09 | Discord responses stay summary-sized, not long reports | Matches the bot's primary interaction surface |

## Success Definition

- Full team-generation flows return a short, consistent synergy scorecard.
- Analysis is persisted per guild with enough structure for history and anti-duplicate logic.
- The implementation fits the current service boundaries instead of scattering scoring logic through commands and routes.
