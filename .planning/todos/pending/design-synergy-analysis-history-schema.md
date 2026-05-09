---
title: "Design SQLite schema for synergy analysis history"
date: "2026-05-09"
priority: "high"
---

# Design SQLite schema for synergy analysis history

## Goal

Define the persistence model for generated team synergy summaries.

## Requirements

- Store `guildId` for guild-scoped history and stats
- Store the generated team payload in a queryable form
- Store per-metric scores for `engage`, `damage balance`, `CC`, `peel`, `scaling`, and `lane stability`
- Store a short summary string returned to Discord
- Store generation timestamp

## Future-facing needs

- Enable anti-duplicate logic against recent compositions
- Enable "top recent comps" and history lookups
- Enable guild-level trend and aggregate reporting

## Design questions

- One row per generated side, or one row per full blue/red matchup?
- Store champion IDs as JSON, normalized join table, or both?
- Which indexes are needed for recent-history lookups by `guildId` and time?
- Should duplicate detection use exact champion sets, ordered lists, or a normalized hash?
