# Roadmap: Discord LoL Champions Bot

## Overview

The next milestone deepens the bot's core generation loop instead of adding unrelated commands. The first phase adds rule-based synergy analysis and persistent history so each generated pool is more useful immediately and also becomes reusable data for later guild-facing features.

## Phases

- [x] **Phase 1: Comp Synergy Analysis** - Add deterministic scoring, compact summaries, and SQLite-backed analysis history for generated teams

## Phase Details

### Phase 1: Comp Synergy Analysis
**Goal**: Add a default synergy summary to generated champion pools and persist the results for later history, duplicate-avoidance, and guild statistics use cases.
**Depends on**: Nothing (first phase)
**Requirements**: [REQ-001, REQ-002]
**Success Criteria** (what must be TRUE):
  1. Discord and API team-generation flows return a compact scorecard with `engage`, `damage balance`, `CC`, `peel`, `scaling`, and `lane stability`.
  2. Synergy scoring is deterministic from local champion/config data and still works when AI providers are missing.
  3. Each generated analysis record is persisted in SQLite with guild scope, metric scores, summary text, and champion composition data.
  4. Stored history is queryable enough to support future recent-history, anti-duplicate, and aggregate-stat features without redesigning the schema.
**Plans**: 2 plans

Plans:
- [x] 01-01: Build synergy scoring and SQLite analysis-history foundations
- [x] 01-02: Wire summaries into generate flows and extend verification coverage

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Comp Synergy Analysis | 2/2 | Complete | 2026-05-09 |
