# Phase 1: Comp Synergy Analysis - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a deterministic synergy summary to generated champion pools and persist the analysis result in SQLite. This phase covers the scoring engine, persistence model, and integration into the existing generation flows that already return teams. It does not add rich history UI or analytics commands yet; it lays the foundation for them.

</domain>

<decisions>
## Implementation Decisions

### Scoring model
- **D-01:** Synergy scoring is fully rule-based from local champion data and config data, not AI-assisted.
- **D-02:** The user-facing output is a short scorecard plus a short overall takeaway, suitable for Discord replies.
- **D-03:** The six required dimensions are `engage`, `damage balance`, `CC`, `peel`, `scaling`, and `lane stability`.

### Persistence
- **D-04:** Analysis records must be stored in SQLite, reusing the current Bun SQLite setup already used for guild config.
- **D-05:** Stored data must be sufficient for later history retrieval, duplicate avoidance, and guild-level aggregate stats.

### Execution behavior
- **D-06:** Analysis runs by default after team generation flows instead of requiring a separate command.
- **D-07:** The implementation should centralize scoring/persistence in services rather than duplicating logic inside commands and routes.

### the agent's Discretion
- Exact scoring weights and thresholds per dimension
- Whether to persist blue/red side analysis as separate rows or a single generation record with nested side payloads
- Whether partial role-only generation uses full score semantics or an explicitly labeled partial-analysis mode

</decisions>

<specifics>
## Specific Ideas

- The current bot already has generate, exclude, and API generate flows; synergy should feel like a natural extension of those results rather than a separate feature branch.
- The feature should make people want to reuse the generator because they get quick strategic feedback every time.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and planning
- `.planning/PROJECT.md` — project purpose, constraints, and locked decisions for this milestone
- `.planning/ROADMAP.md` — phase goal, requirement coverage, and plan inventory
- `.planning/REQUIREMENTS.md` — normative requirements for the new capability

### Spec changes
- `openspec/changes/add-comp-synergy-analysis/proposal.md` — scope and impact statement for the capability
- `openspec/changes/add-comp-synergy-analysis/tasks.md` — implementation checklist for the approved change
- `openspec/changes/add-comp-synergy-analysis/specs/comp-synergy-analysis/spec.md` — added requirements and scenarios

### Existing implementation
- `src/services/teamService.ts` — current generation logic, history window behavior, and shape of generated team output
- `src/services/channelConfigService.ts` — existing SQLite setup and guild-scoped persistence pattern
- `src/commands/gen.ts` — primary Discord generation response path
- `src/commands/gen-exclude.ts` — generation flow with exclusions
- `src/commands/gen-role.ts` — role-only generation path that may need partial-analysis handling
- `src/core/server.ts` — HTTP generate endpoints and response-shape constraints
- `src/types/index.ts` — shared types for champion, team, and guild config models
- `champions.json` — local champion data with tags, info, and stats available for heuristics
- `config.json` — canonical role/fallback groupings used by generator logic

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/services/channelConfigService.ts`: already manages SQLite initialization, migrations, and guild-scoped records in `data/channel-config.sqlite`.
- `src/services/teamService.ts`: already centralizes full generation, exclusion-aware generation, and recent-history caching.
- `src/services/championService.ts`: loads the in-memory champion dataset that the scoring engine can reuse.

### Established Patterns
- Commands and HTTP routes are thin orchestration layers over service modules.
- Persistent guild settings live in SQLite while short-term recent-match state lives in `node-cache`.
- Team generation currently returns flat `blueTeam` and `redTeam` arrays, with role segments implied by generation order and `poolSize`.

### Integration Points
- Full team-generation analysis should hook directly after `generateTeams()` and `generateTeamsWithExclusions()`.
- Role-only generation likely needs either a partial-analysis mode or an explicit summary contract that avoids misleading "full comp" claims.
- API routes currently return JPEG images only, so adding analysis likely requires metadata endpoints, response-shape changes, or headers/secondary routes if image-only behavior must remain compatible.

</code_context>

<deferred>
## Deferred Ideas

- Standalone history commands or dashboards for browsing persisted comp analyses
- Guild-level statistics endpoints and leaderboards
- Strong anti-duplicate generation heuristics that consume persisted analysis history instead of only in-memory recent match history

</deferred>

---

*Phase: 01-comp-synergy-analysis*
*Context gathered: 2026-05-09*
