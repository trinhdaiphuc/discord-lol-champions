# Phase 1: Comp Synergy Analysis - Research

**Researched:** 2026-05-09
**Domain:** Rule-based composition scoring and Bun SQLite persistence
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Synergy scoring is fully rule-based from local champion data and config data, not AI-assisted.
- The user-facing output is a short scorecard plus a short overall takeaway, suitable for Discord replies.
- The six required dimensions are `engage`, `damage balance`, `CC`, `peel`, `scaling`, and `lane stability`.
- Analysis records must be stored in SQLite, reusing the current Bun SQLite setup already used for guild config.
- Stored data must be sufficient for later history retrieval, duplicate avoidance, and guild-level aggregate stats.
- Analysis runs by default after team generation flows instead of requiring a separate command.
- The implementation should centralize scoring/persistence in services rather than duplicating logic inside commands and routes.

### the agent's Discretion
- Exact scoring weights and thresholds per dimension
- Whether to persist blue/red side analysis as separate rows or a single generation record with nested side payloads
- Whether partial role-only generation uses full score semantics or an explicitly labeled partial-analysis mode

### Deferred Ideas (OUT OF SCOPE)
- Standalone history commands or dashboards for browsing persisted comp analyses
- Guild-level statistics endpoints and leaderboards
- Strong anti-duplicate generation heuristics that consume persisted analysis history instead of only in-memory recent match history

</user_constraints>

<architectural_responsibility_map>
## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Compute synergy metrics from champion pool data | API/Backend | Database/Storage | Deterministic service logic should live with generation services, not in Discord command code |
| Persist generated analysis records | Database/Storage | API/Backend | SQLite owns durable records; services own schema and query behavior |
| Render short summaries into Discord/API outputs | API/Backend | Browser/Client | Current app already formats command and route responses server-side |

</architectural_responsibility_map>

<research_summary>
## Summary

The cleanest implementation is to treat synergy analysis as a post-processing service over generated champion pools, not as logic embedded inside `teamService`, commands, or routes. `teamService` already owns generation and recent-match cache behavior; a new analysis service can consume `{ blueTeam, redTeam, poolSize }`, reconstruct or accept role segmentation, compute side-level metrics, and return a compact summary object for callers.

The current SQLite usage in `channelConfigService.ts` is a good persistence pattern to mirror: initialize lazily, create or migrate tables in one place, and expose narrow service functions. For this phase, a separate persistence service is preferable to overloading guild config storage concerns. A generation-scoped table with guild ID, generation mode, side payloads, scores, summary text, and a normalized signature/hash gives enough structure for exact history lookup and future anti-duplicate queries.

The most important design pressure is that current generated teams are flat arrays. Because the generator appends champions in role order, the analysis layer should either receive an explicit role order constant or evolve the generation result to carry role slices. That avoids fragile assumptions spreading across callers and makes `lane stability` score derivation defensible.

**Primary recommendation:** Add two new services: one for deterministic synergy scoring and one for analysis-history persistence, then integrate them in full generation flows before considering richer history/stat features.

</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `bun:sqlite` | Bun runtime built-in | Durable analysis-history persistence | Already used in-project, zero new dependency cost |
| `bun:test` | Bun runtime built-in | Service-level regression tests | Existing repo test style already uses it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node-cache` | existing | Short-term in-memory generation history | Keep for current recent-match behavior; do not replace with SQLite in this phase |
| `champions.json` + `config.json` | local project data | Deterministic scoring inputs | Use for tags, combat stats, and role groupings |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Deterministic heuristics | LLM-generated comp commentary | Better flavor but unstable, slower, and violates the locked decision |
| Dedicated analytics DB | Keep everything in the current SQLite file | SQLite is sufficient here and matches project scale |
| Inferring role slices everywhere | Return structured generation payloads | Structured payloads are safer long-term and avoid fragile array slicing |

</standard_stack>

<architecture_patterns>
## Architecture Patterns

### System Architecture Diagram

`generate command / API route`
→ `teamService`
→ `synergyAnalysisService`
→ `analysisHistoryService`
→ `SQLite`
→ `compact response formatter`

### Recommended Project Structure
```text
src/
├── services/
│   ├── synergyAnalysisService.ts
│   ├── compAnalysisHistoryService.ts
│   └── teamService.ts
├── commands/
│   ├── gen.ts
│   ├── gen-exclude.ts
│   └── gen-role.ts
└── core/
    └── server.ts
```

### Pattern 1: Post-generate analysis service
**What:** Keep scoring in a dedicated service that takes generated teams plus contextual metadata and returns a stable analysis object.
**When to use:** Any generation flow that needs the same summary output.
**Why:** Prevents Discord commands and API routes from diverging in score calculation or wording.

### Pattern 2: Dedicated SQLite history service
**What:** Encapsulate table creation, migrations, inserts, and query helpers in a single persistence module.
**When to use:** Any durable comp-analysis read/write path.
**Why:** Avoids coupling guild config concerns with generation-history concerns and keeps schema evolution local.

### Anti-Patterns to Avoid
- **Embedding weights in command files:** Causes score drift between Discord and API surfaces.
- **Using champion tags alone for every metric:** Works for coarse role shape but loses useful signal already present in `info` and `stats`.
- **Relying on implicit array order in multiple callers:** Increases breakage risk if generation order changes later.

</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Guild config persistence | A second database layer | Existing `bun:sqlite` pattern | The project already solved connection/init mechanics |
| Response formatting | Separate score text builders per command | One summary formatter helper | Keeps phrasing consistent and testable |
| Duplicate detection now | Complex fuzzy-similarity engine | Exact signature/hash foundation | This phase only needs a persistence base for later anti-duplicate work |

**Key insight:** The risky custom part here is the scoring rubric, not the storage or orchestration. Keep everything around the rubric boring and centralized.

</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Scoring a pool like a locked five-player lineup
**What goes wrong:** Metrics become misleading because the bot generates option pools, not one final drafted lineup.
**Why it happens:** The current output is multiple champions per role per side.
**How to avoid:** Define metrics as "pool-level strategic affordances" and explicitly use role coverage plus stat distributions, not assumed final picks.
**Warning signs:** A single assassin-heavy role slice collapses the whole side score unrealistically.

### Pitfall 2: Mixing persistence concerns into guild config service
**What goes wrong:** One service ends up owning unrelated tables and responsibilities.
**Why it happens:** The existing SQLite file looks like the easiest place to keep adding code.
**How to avoid:** Reuse the same database file but create a separate analysis-history service module.
**Warning signs:** `channelConfigService.ts` starts importing scoring types or history queries.

### Pitfall 3: Breaking image-only API compatibility
**What goes wrong:** Existing `/gen-champions/*` consumers may expect JPEG bytes only.
**Why it happens:** Adding JSON metadata directly to image routes changes the contract.
**How to avoid:** Decide explicitly whether to add metadata endpoints, response headers, or non-breaking optional modes before touching API contracts.
**Warning signs:** Planned route changes require clients to stop treating generate endpoints as images.

</common_pitfalls>

<open_questions>
## Open Questions

- Should full-comp API routes stay image-only and expose analysis through a sibling JSON endpoint, or should they support an optional metadata mode?
- For `gen-role`, is a "partial comp" label sufficient, or should the phase scope exclude role-only summaries until a later milestone?
- Is a single generation record with nested side payloads easier for future stats, or are one-row-per-side writes better for querying top/bottom pools?

</open_questions>

## RESEARCH COMPLETE
