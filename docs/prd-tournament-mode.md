# Product Requirements Document: Tournament Bracket Mode

## Overview

**Product/Feature Name**: Tournament Bracket Mode

**Problem Statement**: ARAM groups with 6-10 players want a structured, competitive way to play multiple matches with persistent scoring and bracket progression. Current bot only supports one-off team generation with no tournament infrastructure, forcing groups to manually track scores and manage brackets externally.

**Goal**: Enable multi-round tournament creation with automatic bracket generation, match tracking, and winner progression. Success means groups can run complete tournaments (best-of-3, best-of-5, single/double elimination) without leaving Discord or using external tools.

## Target Users

**Primary Persona**: Competitive ARAM groups (6-10 players) who:
- Want structured competition with clear winners
- Play multiple matches in a single session (2-4 hours)
- Value automated bracket management over manual tracking
- Enjoy the social/competitive aspect of tournaments

**Secondary Persona**: Casual groups who:
- Want to try tournament format occasionally (monthly/seasonal events)
- Prefer simple single-elimination brackets
- Don't need advanced features (seeding, double elimination)

## Functional Requirements

### FR-01: Tournament Creation
- Command: `/tournament create [name] [format] [players]`
- Supported formats:
  - Single Elimination (4, 8 players)
  - Double Elimination (4, 8 players)
  - Round Robin (4, 6 players)
- Tournament settings:
  - Match format: Best-of-1 (BO1), Best-of-3 (BO3), Best-of-5 (BO5)
  - Team generation mode: Random (`/gen`), Draft (`/draft`), Manual (players form teams)
  - Pool size: Inherited from guild config or custom per tournament
- Bot generates:
  - Unique tournament ID
  - Initial bracket structure
  - Match schedule (Round 1, Round 2, Finals, etc.)
- Tournament persists in SQLite database (not just cache)

### FR-02: Bracket Visualization
- Bot displays bracket as:
  - Text-based tree structure (ASCII art for simple brackets)
  - Generated image (for complex brackets with 8+ players)
- Bracket shows:
  - Match numbers (M1, M2, M3, etc.)
  - Player/team assignments
  - Current match status (pending, in-progress, completed)
  - Scores for completed matches
  - Winner progression paths
- Bracket updates automatically after each match result

### FR-03: Match Flow
- For each match:
  1. Bot announces match start (mentions participating players)
  2. Bot generates teams based on tournament settings:
     - Random: Uses `/gen` logic
     - Draft: Initiates `/draft` session for match participants
     - Manual: Players form teams and report composition
  3. Bot displays team compositions and synergy analysis
  4. Players play the match in League client
  5. Players report result via button interaction (Blue Win / Red Win)
  6. Bot validates result (requires confirmation from both teams or tournament admin)
  7. Bot updates bracket and announces next match

### FR-04: Match Result Reporting
- After match completion, bot sends result reporting message with buttons:
  - "Blue Team Won"
  - "Red Team Won"
  - "Remake" (match doesn't count, regenerate teams)
- Result confirmation:
  - Option A: Any participant can report, requires 1 confirmation from opposing team
  - Option B: Tournament admin (creator) confirms all results
  - Option C: Majority vote from all match participants (3+ confirmations)
- For BO3/BO5:
  - Bot tracks series score (e.g., "Blue 1-0 Red")
  - Next game in series auto-starts after result confirmation
  - Series winner advances in bracket

### FR-05: Tournament Progression
- After each match:
  - Winner advances to next round
  - Loser is eliminated (single elim) or moves to lower bracket (double elim)
  - Bot announces next match and mentions participants
- Automatic scheduling:
  - Matches in same round can run in parallel (if enough players)
  - Next round starts when all current round matches complete
- Tournament status tracking:
  - Current round
  - Completed matches
  - Pending matches
  - Estimated time remaining (based on average match duration)

### FR-06: Tournament Completion and Stats
- When tournament ends:
  - Bot announces winner(s) and final standings
  - Generates tournament summary:
    - Final bracket image
    - Match history (all results)
    - Player stats: wins, losses, win rate, most played champions
    - MVP: Player with highest win rate or most wins
  - Saves tournament to history (persistent storage)
- Tournament archive:
  - `/tournament history` shows past tournaments
  - `/tournament stats [tournament-id]` displays detailed stats

### FR-07: Tournament Management
- Tournament admin commands:
  - `/tournament pause` - Pause tournament (no new matches start)
  - `/tournament resume` - Resume paused tournament
  - `/tournament cancel` - Cancel tournament (requires confirmation)
  - `/tournament kick [player]` - Remove player and forfeit their matches
  - `/tournament substitute [old-player] [new-player]` - Replace player mid-tournament
- Automatic timeout:
  - If no match results reported for 30 minutes, bot sends reminder
  - If no activity for 2 hours, tournament auto-pauses
  - Paused tournaments expire after 24 hours

### FR-08: Seeding and Fairness
- Player seeding options:
  - Random: Players randomly assigned to bracket positions
  - Manual: Tournament creator assigns seeds (1-8)
  - Skill-based: Bot uses historical win rate from past tournaments (if available)
- Bracket balancing:
  - Top seeds placed on opposite sides of bracket (1 vs 8, 2 vs 7, etc.)
  - Ensures strongest players don't meet until finals

## Non-Functional Requirements

### Performance
- Tournament creation: < 3 seconds
- Bracket generation and image rendering: < 5 seconds
- Match result processing and bracket update: < 2 seconds
- Tournament history query: < 1 second

### Scalability
- Support up to 10 concurrent tournaments per guild
- Support up to 500 total active tournaments across all guilds
- Tournament history: Store up to 100 tournaments per guild (auto-archive older ones)

### Persistence
- All tournament data stored in SQLite:
  - Tournament metadata (name, format, settings, status)
  - Match results (winner, loser, score, timestamp)
  - Player participation and stats
- Tournament state survives bot restarts
- Bracket state can be reconstructed from match history

### Usability
- Bracket visualization works on mobile Discord clients
- Clear instructions for reporting match results
- Undo last match result (admin only, within 5 minutes)
- Tournament status visible at any time via `/tournament status`

### Security
- Only tournament admin can cancel or modify tournament
- Match result reporting requires validation (prevent trolling)
- Rate limit tournament creation (1 per guild per hour)

## User Stories

### FR-01: Tournament Creation
**As a** Discord user organizing an ARAM tournament  
**I want to** create a tournament with specific format and settings  
**So that** my group can compete in a structured bracket without manual tracking

**Acceptance Criteria**:
- `/tournament create "Friday Night ARAM" single-elimination 8` creates an 8-player single-elimination tournament
- Bot asks for match format (BO1/BO3/BO5) and team generation mode (Random/Draft/Manual)
- Bot generates initial bracket and displays it in channel
- Tournament is saved to database and persists across bot restarts
- Tournament has unique ID for reference in other commands

---

### FR-02: Bracket Visualization
**As a** tournament participant  
**I want to** see the current bracket state  
**So that** I know who I'm playing next and how the tournament is progressing

**Acceptance Criteria**:
- Bot displays bracket as text tree or generated image (depending on size)
- Bracket shows match numbers, player assignments, and current status
- Bracket updates automatically after each match result
- I can view bracket at any time via `/tournament bracket [tournament-id]`

---

### FR-03: Match Flow
**As a** tournament participant  
**I want** the bot to generate teams for my match  
**So that** I can focus on playing instead of manually forming teams

**Acceptance Criteria**:
- When my match starts, bot mentions me and my opponent(s)
- Bot generates teams based on tournament settings (Random/Draft/Manual)
- Bot displays team compositions and synergy analysis
- After playing in League client, I can report the result via buttons
- Bot validates result and updates bracket

---

### FR-04: Match Result Reporting
**As a** tournament participant  
**I want to** report my match result easily  
**So that** the tournament can progress without delays

**Acceptance Criteria**:
- After match, bot sends message with "Blue Team Won" / "Red Team Won" buttons
- I can click the button to report result
- Bot requires confirmation from opponent or admin before accepting result
- For BO3/BO5, bot tracks series score and auto-starts next game
- If result is disputed, admin can override via `/tournament override-result`

---

### FR-05: Tournament Progression
**As a** tournament participant  
**I want** the tournament to automatically progress after each match  
**So that** I don't have to wait for manual bracket updates

**Acceptance Criteria**:
- After match result is confirmed, winner advances to next round
- Bot announces next match and mentions participants
- If multiple matches can run in parallel, bot starts them simultaneously
- Bot displays current round and estimated time remaining

---

### FR-06: Tournament Completion and Stats
**As a** tournament participant  
**I want to** see final standings and stats after tournament ends  
**So that** I can review my performance and celebrate the winner

**Acceptance Criteria**:
- When tournament ends, bot announces winner and final standings
- Bot generates tournament summary with match history and player stats
- Bot displays MVP (player with highest win rate)
- Tournament is saved to history and accessible via `/tournament history`

---

### FR-07: Tournament Management
**As a** tournament admin  
**I want to** pause, resume, or cancel the tournament  
**So that** I can handle unexpected situations (player leaves, technical issues)

**Acceptance Criteria**:
- `/tournament pause` stops new matches from starting
- `/tournament resume` continues paused tournament
- `/tournament cancel` cancels tournament with confirmation prompt
- `/tournament kick [player]` removes player and forfeits their matches
- `/tournament substitute [old] [new]` replaces player mid-tournament

---

### FR-08: Seeding and Fairness
**As a** tournament admin  
**I want to** seed players based on skill level  
**So that** the bracket is balanced and competitive

**Acceptance Criteria**:
- During tournament creation, bot asks for seeding method (Random/Manual/Skill-based)
- For manual seeding, bot prompts admin to assign seeds 1-8
- For skill-based seeding, bot uses historical win rate from past tournaments
- Top seeds are placed on opposite sides of bracket (1 vs 8, 2 vs 7, etc.)

## Out of Scope

- **Cross-guild tournaments**: Tournaments are isolated to a single guild
- **Spectator mode**: No live match tracking or spectator view
- **Prize distribution**: No automated prize/reward system
- **Streaming integration**: No Twitch/YouTube integration for broadcasting
- **Advanced stats**: No detailed champion stats, damage charts, or replay analysis
- **Custom bracket formats**: Only standard single/double elimination and round robin
- **Team tournaments**: Only individual player tournaments (teams are generated per match)
- **Scheduling**: No calendar integration or match scheduling (all matches are immediate)
- **Elo/MMR system**: No persistent skill rating across tournaments

## Success Metrics

### Adoption
- 20% of active guilds create at least one tournament within first month
- 10% of active guilds run tournaments regularly (1+ per week)

### Engagement
- Average tournament completion rate: >70% (not cancelled or abandoned)
- Average tournament duration: 2-3 hours for 8-player single elimination
- Average matches per tournament: 7-10 (including BO3/BO5 games)

### Retention
- Guilds that run tournaments have 30% higher 30-day retention vs non-tournament guilds
- Tournament participants have 40% higher engagement (messages, commands) than non-participants

## Open Questions

1. **Player registration**: How do we handle player registration for tournaments?
   - Option A: Players react to tournament creation message to join (first 8 get in)
   - Option B: Admin specifies player list during creation
   - Option C: Bot detects voice channel members and auto-registers them

2. **Match result validation**: What's the best way to prevent false result reporting?
   - Option A: Require confirmation from both teams (2+ players)
   - Option B: Admin confirms all results manually
   - Option C: Integrate with Riot API to auto-detect match results (requires player summoner names)

3. **Parallel matches**: Should bot allow multiple matches in same round to run simultaneously?
   - Pro: Faster tournament completion
   - Con: Requires more players online at once, harder to track
   - Compromise: Allow parallel matches only if 8+ players are registered

4. **Tournament persistence**: How long should completed tournaments be stored?
   - Option A: Forever (until manually deleted)
   - Option B: 30 days, then auto-archived
   - Option C: Keep last 100 tournaments per guild, delete oldest

5. **Bracket visualization**: Should we generate images for all brackets or use text for small ones?
   - Text pros: Faster, works on all devices, easier to update
   - Image pros: More visual, easier to understand at a glance
   - Compromise: Text for 4-player, image for 8+ player brackets

6. **Team generation in tournaments**: Should teams be persistent across matches or regenerated each time?
   - Option A: Regenerate teams for each match (more variety)
   - Option B: Keep same teams throughout tournament (more consistency)
   - Option C: Let admin choose during tournament creation

## Technical Notes

- Tournament data stored in SQLite with new tables:
  ```sql
  CREATE TABLE tournaments (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    format TEXT NOT NULL, -- 'single-elim', 'double-elim', 'round-robin'
    match_format TEXT NOT NULL, -- 'bo1', 'bo3', 'bo5'
    team_mode TEXT NOT NULL, -- 'random', 'draft', 'manual'
    status TEXT NOT NULL, -- 'active', 'paused', 'completed', 'cancelled'
    created_by TEXT NOT NULL, -- Discord user ID
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    settings TEXT -- JSON blob for additional settings
  );

  CREATE TABLE tournament_participants (
    tournament_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    seed INTEGER,
    eliminated BOOLEAN DEFAULT 0,
    PRIMARY KEY (tournament_id, user_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
  );

  CREATE TABLE tournament_matches (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    round INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    player1_id TEXT,
    player2_id TEXT,
    winner_id TEXT,
    blue_team TEXT, -- JSON array of champion IDs
    red_team TEXT, -- JSON array of champion IDs
    score TEXT, -- e.g., "2-1" for BO3
    status TEXT NOT NULL, -- 'pending', 'in-progress', 'completed'
    started_at INTEGER,
    completed_at INTEGER,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
  );
  ```

- Bracket generation algorithm:
  - Single elimination: Binary tree structure, 2^n players
  - Double elimination: Two brackets (winners + losers), complex progression rules
  - Round robin: All-play-all matrix, n*(n-1)/2 matches

- Bracket image generation:
  - Use canvas (node-canvas) to draw bracket tree
  - Similar to team composition image generation
  - Cache generated images to avoid regeneration on every view
