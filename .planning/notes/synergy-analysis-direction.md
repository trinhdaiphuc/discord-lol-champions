---
title: "Synergy analysis direction"
date: "2026-05-09"
context: "$gsd-explore"
---

# Synergy analysis direction

## Decision

Add a default post-generate synergy summary for every generated team.

## Constraints

- The summary must be short enough to read quickly inside Discord.
- Scoring must be rule-based from champion data and tags, not AI-generated.
- Results should be stored in SQLite alongside existing guild-scoped bot data.

## Expected output

Each generated composition should return:

- A compact score breakdown for `engage`, `damage balance`, `CC`, `peel`, `scaling`, and `lane stability`
- A short overall takeaway describing the comp's strongest point and biggest weakness

## Persistence goals

Store each generated composition analysis so the bot can later support:

- Per-guild history views
- Duplicate-avoidance heuristics across recent generations
- Guild-level statistics for strong and weak composition patterns

## Integration direction

- Run analysis automatically after every team generation flow
- Keep the scoring deterministic and explainable
- Reuse the existing Bun SQLite setup instead of introducing another datastore
