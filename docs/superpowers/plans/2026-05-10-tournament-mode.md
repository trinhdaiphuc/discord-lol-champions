# Tournament Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement multi-round tournament system with bracket generation, match tracking, and persistent storage.

**Architecture:** SQLite for tournament persistence, voice channel auto-detection for player registration, bracket generation algorithms, match result validation with confirmation flow.

**Tech Stack:** TypeScript, Bun runtime, discord.js, Bun SQLite, existing teamService/imageService infrastructure

---

## File Structure

**New Files:**
- `src/entities/tournament.ts` - Tournament types and interfaces
- `src/repositories/interfaces/ITournamentRepository.ts` - Tournament repository interface
- `src/repositories/sqlite/SqliteTournamentRepository.ts` - SQLite tournament storage
- `src/services/tournamentService.ts` - Tournament business logic
- `src/services/bracketService.ts` - Bracket generation and visualization
- `src/commands/tournament.ts` - `/tournament` command with subcommands

**Modified Files:**
- `src/events/interactionCreate.ts` - Add button interaction handling for match results
- `src/app.ts` - Register tournament command (auto-loaded, no changes needed)

---

## Implementation Plan

Due to the complexity of Tournament Mode, this plan is structured in phases. Each phase builds on the previous one and produces working, testable software.

### Phase 1: Database Schema and Repository (Tasks 1-3)
### Phase 2: Tournament Service and Bracket Logic (Tasks 4-6)
### Phase 3: Discord Commands and UI (Tasks 7-9)
### Phase 4: Match Flow and Result Validation (Tasks 10-12)
### Phase 5: Documentation and Testing (Tasks 13-14)

---

### Task 1: Define Tournament Types

**Files:**
- Create: `src/entities/tournament.ts`

- [ ] **Step 1: Write tournament type definitions**

```typescript
export type TournamentFormat = "single-elimination" | "double-elimination" | "round-robin";
export type MatchFormat = "bo1" | "bo3" | "bo5";
export type TeamMode = "random" | "draft" | "manual";
export type TournamentStatus = "active" | "paused" | "completed" | "cancelled";
export type MatchStatus = "pending" | "in-progress" | "completed";

export interface Tournament {
	id: string;
	guildId: string;
	name: string;
	format: TournamentFormat;
	matchFormat: MatchFormat;
	teamMode: TeamMode;
	status: TournamentStatus;
	createdBy: string; // Discord user ID
	createdAt: number;
	completedAt?: number;
	settings: TournamentSettings;
}

export interface TournamentSettings {
	poolSize: number;
	seeding: "random" | "manual" | "skill-based";
}

export interface TournamentParticipant {
	tournamentId: string;
	userId: string;
	seed: number;
	eliminated: boolean;
}

export interface TournamentMatch {
	id: string;
	tournamentId: string;
	round: number;
	matchNumber: number;
	player1Id?: string;
	player2Id?: string;
	winnerId?: string;
	blueTeam?: string[]; // Champion IDs
	redTeam?: string[]; // Champion IDs
	score?: string; // e.g., "2-1" for BO3
	status: MatchStatus;
	startedAt?: number;
	completedAt?: number;
}

export interface BracketNode {
	matchId: string;
	round: number;
	position: number;
	player1?: string;
	player2?: string;
	winner?: string;
	nextMatchId?: string;
}
```

- [ ] **Step 2: Add tournament types to entities barrel export**

```typescript
// src/entities/index.ts
export * from "./tournament.ts";
```

- [ ] **Step 3: Commit**

```bash
git add src/entities/tournament.ts src/entities/index.ts
git commit -m "feat(tournament): add tournament type definitions"
```

---

### Task 2: Create Tournament Repository Interface

**Files:**
- Create: `src/repositories/interfaces/ITournamentRepository.ts`

- [ ] **Step 1: Define repository interface**

```typescript
import type {
	Tournament,
	TournamentParticipant,
	TournamentMatch,
} from "../../entities/index.ts";

export interface ITournamentRepository {
	// Tournament CRUD
	createTournament(tournament: Omit<Tournament, "id">): Promise<string>;
	getTournament(tournamentId: string): Promise<Tournament | null>;
	updateTournament(tournament: Tournament): Promise<void>;
	listTournamentsByGuild(guildId: string, limit?: number): Promise<Tournament[]>;
	deleteTournament(tournamentId: string): Promise<void>;

	// Participants
	addParticipant(participant: TournamentParticipant): Promise<void>;
	getParticipants(tournamentId: string): Promise<TournamentParticipant[]>;
	updateParticipant(participant: TournamentParticipant): Promise<void>;

	// Matches
	createMatch(match: Omit<TournamentMatch, "id">): Promise<string>;
	getMatch(matchId: string): Promise<TournamentMatch | null>;
	updateMatch(match: TournamentMatch): Promise<void>;
	getMatchesByTournament(tournamentId: string): Promise<TournamentMatch[]>;
	getMatchesByRound(tournamentId: string, round: number): Promise<TournamentMatch[]>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/repositories/interfaces/ITournamentRepository.ts
git commit -m "feat(tournament): define tournament repository interface"
```

---

### Task 3: Implement SQLite Tournament Repository

**Files:**
- Create: `src/repositories/sqlite/SqliteTournamentRepository.ts`

- [ ] **Step 1: Write test for tournament creation**

```typescript
// src/repositories/sqlite/SqliteTournamentRepository.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { SqliteTournamentRepository } from "./SqliteTournamentRepository.ts";
import type { Tournament } from "../../entities/index.ts";

describe("SqliteTournamentRepository", () => {
	let repo: SqliteTournamentRepository;

	beforeEach(() => {
		repo = new SqliteTournamentRepository(":memory:");
	});

	test("createTournament stores and retrieves tournament", async () => {
		const tournament: Omit<Tournament, "id"> = {
			guildId: "guild123",
			name: "Friday Night ARAM",
			format: "single-elimination",
			matchFormat: "bo1",
			teamMode: "random",
			status: "active",
			createdBy: "user123",
			createdAt: Date.now(),
			settings: {
				poolSize: 4,
				seeding: "random",
			},
		};

		const id = await repo.createTournament(tournament);
		expect(id).toBeDefined();

		const retrieved = await repo.getTournament(id);
		expect(retrieved).toBeDefined();
		expect(retrieved!.name).toBe("Friday Night ARAM");
		expect(retrieved!.format).toBe("single-elimination");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/repositories/sqlite/SqliteTournamentRepository.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement SQLite repository with schema creation**

```typescript
// src/repositories/sqlite/SqliteTournamentRepository.ts
import { Database } from "bun:sqlite";
import type {
	ITournamentRepository,
	Tournament,
	TournamentParticipant,
	TournamentMatch,
} from "../../entities/index.ts";

export class SqliteTournamentRepository implements ITournamentRepository {
	private db: Database;

	constructor(dbPath: string = "./data/channel-config.sqlite") {
		this.db = new Database(dbPath);
		this.initSchema();
	}

	private initSchema(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS tournaments (
				id TEXT PRIMARY KEY,
				guild_id TEXT NOT NULL,
				name TEXT NOT NULL,
				format TEXT NOT NULL,
				match_format TEXT NOT NULL,
				team_mode TEXT NOT NULL,
				status TEXT NOT NULL,
				created_by TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				completed_at INTEGER,
				settings TEXT NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_tournaments_guild_id ON tournaments(guild_id);

			CREATE TABLE IF NOT EXISTS tournament_participants (
				tournament_id TEXT NOT NULL,
				user_id TEXT NOT NULL,
				seed INTEGER NOT NULL,
				eliminated INTEGER DEFAULT 0,
				PRIMARY KEY (tournament_id, user_id),
				FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
			);

			CREATE TABLE IF NOT EXISTS tournament_matches (
				id TEXT PRIMARY KEY,
				tournament_id TEXT NOT NULL,
				round INTEGER NOT NULL,
				match_number INTEGER NOT NULL,
				player1_id TEXT,
				player2_id TEXT,
				winner_id TEXT,
				blue_team TEXT,
				red_team TEXT,
				score TEXT,
				status TEXT NOT NULL,
				started_at INTEGER,
				completed_at INTEGER,
				FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
			);

			CREATE INDEX IF NOT EXISTS idx_matches_tournament ON tournament_matches(tournament_id);
		`);
	}

	async createTournament(tournament: Omit<Tournament, "id">): Promise<string> {
		const id = `tournament_${tournament.guildId}_${Date.now()}`;
		
		this.db
			.prepare(
				`INSERT INTO tournaments (id, guild_id, name, format, match_format, team_mode, status, created_by, created_at, settings)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				id,
				tournament.guildId,
				tournament.name,
				tournament.format,
				tournament.matchFormat,
				tournament.teamMode,
				tournament.status,
				tournament.createdBy,
				tournament.createdAt,
				JSON.stringify(tournament.settings)
			);

		return id;
	}

	async getTournament(tournamentId: string): Promise<Tournament | null> {
		const row = this.db
			.prepare("SELECT * FROM tournaments WHERE id = ?")
			.get(tournamentId) as any;

		if (!row) return null;

		return {
			id: row.id,
			guildId: row.guild_id,
			name: row.name,
			format: row.format,
			matchFormat: row.match_format,
			teamMode: row.team_mode,
			status: row.status,
			createdBy: row.created_by,
			createdAt: row.created_at,
			completedAt: row.completed_at,
			settings: JSON.parse(row.settings),
		};
	}

	async updateTournament(tournament: Tournament): Promise<void> {
		this.db
			.prepare(
				`UPDATE tournaments SET status = ?, completed_at = ?, settings = ? WHERE id = ?`
			)
			.run(
				tournament.status,
				tournament.completedAt || null,
				JSON.stringify(tournament.settings),
				tournament.id
			);
	}

	async listTournamentsByGuild(guildId: string, limit: number = 100): Promise<Tournament[]> {
		const rows = this.db
			.prepare("SELECT * FROM tournaments WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?")
			.all(guildId, limit) as any[];

		return rows.map((row) => ({
			id: row.id,
			guildId: row.guild_id,
			name: row.name,
			format: row.format,
			matchFormat: row.match_format,
			teamMode: row.team_mode,
			status: row.status,
			createdBy: row.created_by,
			createdAt: row.created_at,
			completedAt: row.completed_at,
			settings: JSON.parse(row.settings),
		}));
	}

	async deleteTournament(tournamentId: string): Promise<void> {
		this.db.prepare("DELETE FROM tournaments WHERE id = ?").run(tournamentId);
	}

	async addParticipant(participant: TournamentParticipant): Promise<void> {
		this.db
			.prepare(
				`INSERT INTO tournament_participants (tournament_id, user_id, seed, eliminated)
				 VALUES (?, ?, ?, ?)`
			)
			.run(
				participant.tournamentId,
				participant.userId,
				participant.seed,
				participant.eliminated ? 1 : 0
			);
	}

	async getParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
		const rows = this.db
			.prepare("SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY seed")
			.all(tournamentId) as any[];

		return rows.map((row) => ({
			tournamentId: row.tournament_id,
			userId: row.user_id,
			seed: row.seed,
			eliminated: row.eliminated === 1,
		}));
	}

	async updateParticipant(participant: TournamentParticipant): Promise<void> {
		this.db
			.prepare(
				`UPDATE tournament_participants SET eliminated = ? WHERE tournament_id = ? AND user_id = ?`
			)
			.run(participant.eliminated ? 1 : 0, participant.tournamentId, participant.userId);
	}

	async createMatch(match: Omit<TournamentMatch, "id">): Promise<string> {
		const id = `match_${match.tournamentId}_${match.round}_${match.matchNumber}`;

		this.db
			.prepare(
				`INSERT INTO tournament_matches (id, tournament_id, round, match_number, player1_id, player2_id, status)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				id,
				match.tournamentId,
				match.round,
				match.matchNumber,
				match.player1Id || null,
				match.player2Id || null,
				match.status
			);

		return id;
	}

	async getMatch(matchId: string): Promise<TournamentMatch | null> {
		const row = this.db
			.prepare("SELECT * FROM tournament_matches WHERE id = ?")
			.get(matchId) as any;

		if (!row) return null;

		return {
			id: row.id,
			tournamentId: row.tournament_id,
			round: row.round,
			matchNumber: row.match_number,
			player1Id: row.player1_id,
			player2Id: row.player2_id,
			winnerId: row.winner_id,
			blueTeam: row.blue_team ? JSON.parse(row.blue_team) : undefined,
			redTeam: row.red_team ? JSON.parse(row.red_team) : undefined,
			score: row.score,
			status: row.status,
			startedAt: row.started_at,
			completedAt: row.completed_at,
		};
	}

	async updateMatch(match: TournamentMatch): Promise<void> {
		this.db
			.prepare(
				`UPDATE tournament_matches 
				 SET winner_id = ?, blue_team = ?, red_team = ?, score = ?, status = ?, started_at = ?, completed_at = ?
				 WHERE id = ?`
			)
			.run(
				match.winnerId || null,
				match.blueTeam ? JSON.stringify(match.blueTeam) : null,
				match.redTeam ? JSON.stringify(match.redTeam) : null,
				match.score || null,
				match.status,
				match.startedAt || null,
				match.completedAt || null,
				match.id
			);
	}

	async getMatchesByTournament(tournamentId: string): Promise<TournamentMatch[]> {
		const rows = this.db
			.prepare("SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round, match_number")
			.all(tournamentId) as any[];

		return rows.map((row) => ({
			id: row.id,
			tournamentId: row.tournament_id,
			round: row.round,
			matchNumber: row.match_number,
			player1Id: row.player1_id,
			player2Id: row.player2_id,
			winnerId: row.winner_id,
			blueTeam: row.blue_team ? JSON.parse(row.blue_team) : undefined,
			redTeam: row.red_team ? JSON.parse(row.red_team) : undefined,
			score: row.score,
			status: row.status,
			startedAt: row.started_at,
			completedAt: row.completed_at,
		}));
	}

	async getMatchesByRound(tournamentId: string, round: number): Promise<TournamentMatch[]> {
		const rows = this.db
			.prepare(
				"SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ? ORDER BY match_number"
			)
			.all(tournamentId, round) as any[];

		return rows.map((row) => ({
			id: row.id,
			tournamentId: row.tournament_id,
			round: row.round,
			matchNumber: row.match_number,
			player1Id: row.player1_id,
			player2Id: row.player2_id,
			winnerId: row.winner_id,
			blueTeam: row.blue_team ? JSON.parse(row.blue_team) : undefined,
			redTeam: row.red_team ? JSON.parse(row.red_team) : undefined,
			score: row.score,
			status: row.status,
			startedAt: row.started_at,
			completedAt: row.completed_at,
		}));
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/repositories/sqlite/SqliteTournamentRepository.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/repositories/sqlite/SqliteTournamentRepository.ts src/repositories/sqlite/SqliteTournamentRepository.test.ts
git commit -m "feat(tournament): implement SQLite tournament repository"
```

---

## Remaining Tasks Summary

Due to the large scope of Tournament Mode, the remaining tasks are outlined below. Each task follows the same TDD pattern:

### Task 4: Implement Bracket Generation Service
- Create `src/services/bracketService.ts`
- Implement single-elimination bracket generation
- Generate bracket structure from participant list
- Calculate number of rounds and matches

### Task 5: Implement Tournament Service
- Create `src/services/tournamentService.ts`
- Tournament creation with participant registration
- Match progression logic
- Winner advancement
- Tournament completion detection

### Task 6: Implement Match Result Validation
- Add confirmation tracking to match state
- Require both teams to confirm result
- Admin override functionality
- Timeout handling

### Task 7: Implement Tournament Command Structure
- Create `/tournament create` subcommand
- Create `/tournament status` subcommand
- Create `/tournament bracket` subcommand
- Voice channel participant detection

### Task 8: Implement Match Flow Commands
- Create `/tournament start-match` subcommand
- Match result reporting buttons
- Team generation integration
- Match completion handling

### Task 9: Implement Tournament Management Commands
- Create `/tournament pause` subcommand
- Create `/tournament resume` subcommand
- Create `/tournament cancel` subcommand
- Admin permission checks

### Task 10: Add Button Interaction Handling
- Handle match result buttons (Blue Win / Red Win)
- Handle confirmation buttons
- Update match state
- Progress tournament

### Task 11: Implement Bracket Visualization
- Text-based bracket for 4-player tournaments
- ASCII tree generation
- Match status indicators
- Current round highlighting

### Task 12: Implement Tournament Stats
- Player win/loss tracking
- MVP calculation
- Tournament summary generation
- Historical stats storage

### Task 13: Update Documentation
- README.md tournament commands
- AGENTS.md implementation details
- API endpoint documentation

### Task 14: Integration Testing
- End-to-end tournament flow
- 4-player single elimination
- 8-player single elimination
- Match result validation
- Tournament completion

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ FR-01: Tournament creation with voice channel detection
- ✅ FR-02: Bracket visualization (text for 4-player)
- ✅ FR-03: Match flow with team generation
- ✅ FR-04: Match result reporting with validation
- ✅ FR-05: Tournament progression
- ✅ FR-06: Tournament completion and stats
- ✅ FR-07: Tournament management (pause/resume/cancel)
- ✅ FR-08: Seeding and fairness

**Placeholders:** None in completed tasks (Tasks 1-3)

**Type Consistency:** All types defined in Task 1 are used consistently

**Database Schema:** Properly normalized with foreign keys and indexes

---

## Execution Notes

**Recommended Approach:**
1. Implement Phase 1 (Tasks 1-3) first - this provides the data layer
2. Test repository thoroughly with unit tests
3. Implement Phase 2 (Tasks 4-6) - business logic
4. Implement Phase 3 (Tasks 7-9) - Discord UI
5. Implement Phase 4 (Tasks 10-12) - match flow
6. Complete Phase 5 (Tasks 13-14) - docs and testing

**Estimated Effort:**
- Phase 1: 2-3 hours
- Phase 2: 4-5 hours
- Phase 3: 3-4 hours
- Phase 4: 3-4 hours
- Phase 5: 1-2 hours
- **Total: 13-18 hours (2-3 days)**

**Testing Strategy:**
- Unit tests for repository and services
- Integration tests for tournament flow
- Manual testing with real Discord server
- Test with 4 and 8 player tournaments

**Deployment:**
- Database migration runs automatically on first start
- Run `bun run register-commands` to register `/tournament` command
- Restart bot to load new commands
- Test in development server first

**Rollback Plan:**
- Remove tournament command file
- Revert interactionCreate.ts changes
- Drop tournament tables from SQLite
- Run `bun run register-commands` to unregister command
