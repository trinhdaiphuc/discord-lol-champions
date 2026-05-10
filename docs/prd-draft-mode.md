# Product Requirements Document: Draft Mode

## Overview

**Product/Feature Name**: Draft Mode (Interactive Champion Selection)

**Problem Statement**: Players in ARAM groups want more agency over team composition while maintaining the fun, casual spirit of random selection. Current `/gen` command provides zero control, leading to frustration when players get champions they dislike or when team compositions feel unbalanced before the game even starts.

**Goal**: Enable turn-based champion selection where players pick from a randomized pool, creating a middle ground between full randomness and full control. Success means players feel more invested in their team composition while preserving the quick, low-friction experience that makes ARAM appealing.

## Target Users

**Primary Persona**: Casual ARAM players in 6-10 person Discord groups who:
- Play for fun but care about having a decent champion
- Want some control without the overhead of full draft
- Value quick setup (< 5 minutes from start to game-ready)
- Prefer Discord-native workflows over external tools

**Secondary Persona**: Competitive ARAM players who:
- Want strategic depth in champion selection
- Care about team synergy and counter-picking
- Are willing to invest more time in draft phase

## Functional Requirements

### FR-01: Draft Session Initialization
- Bot generates a randomized champion pool (configurable size: 15-30 champions, default 20)
- Pool respects guild's configured exclusions and history window
- Pool is divided into 5 role-based sub-pools (3-6 champions per role)
- Draft session is created with unique ID and 10-minute timeout
- Initial message displays:
  - Draft order (randomized player sequence)
  - Current pool overview (champion count per role)
  - Instructions for picking

### FR-02: Turn-Based Selection Flow
- Players pick in snake draft order: 1→2→3→4→5→5→4→3→2→1
- On each player's turn:
  - Bot sends ephemeral message (visible only to that player) with available champions
  - Player selects via dropdown menu (grouped by role)
  - Selection is confirmed and announced to all participants
  - Selected champion is removed from pool
- If player doesn't pick within 60 seconds, bot auto-assigns a random champion from pool
- Draft continues until all 10 champions are selected

### FR-03: Pool Visibility and Updates
- Public message shows:
  - Current draft state (which picks are complete)
  - Remaining champions per role (count only, not names)
  - Whose turn it is
- After each pick, public message is edited to reflect new state
- Players can view full remaining pool via button interaction (ephemeral response)

### FR-04: Team Assignment and Image Generation
- After all picks complete:
  - Bot randomly assigns 5 champions to Blue team, 5 to Red team
  - Generates team composition image (same format as `/gen`)
  - Displays synergy analysis for both teams
  - Shows final draft order and pick sequence

### FR-05: Draft Cancellation and Timeout
- Any participant can cancel draft via button (requires confirmation)
- If draft times out (10 minutes), session is cancelled and pool is discarded
- Cancelled/timed-out drafts do not affect history window

### FR-06: Draft History Integration
- Completed drafts are saved to composition history (same as `/gen`)
- Drafted champions are added to history window to avoid repeats
- Draft metadata (pick order, timestamps) is stored for future analytics

## Non-Functional Requirements

### Performance
- Draft session creation: < 2 seconds
- Pick confirmation and state update: < 1 second
- Image generation after draft completion: < 5 seconds (same as current `/gen`)

### Scalability
- Support up to 5 concurrent draft sessions per guild
- Handle 100+ concurrent draft sessions across all guilds

### Usability
- Draft interface must work on mobile Discord clients
- Ephemeral messages prevent channel spam
- Clear visual indicators for whose turn it is
- Undo last pick (only for current turn, within 10 seconds)

### Security
- Only registered participants can make picks
- Prevent duplicate picks via state validation
- Rate limit draft session creation (1 per guild per minute)

## User Stories

### FR-01: Draft Session Initialization
**As a** Discord user in an ARAM group  
**I want to** start a draft session with my friends  
**So that** we can pick champions from a randomized pool instead of getting fully random assignments

**Acceptance Criteria**:
- `/draft start` command creates a new draft session
- Bot generates a pool of 20 champions (configurable via `/config draft-pool-size`)
- Pool respects current exclusions and history window
- Bot displays draft order (randomized player sequence) and pool overview
- Session has 10-minute timeout displayed in initial message

---

### FR-02: Turn-Based Selection Flow
**As a** player in a draft session  
**I want to** pick my champion when it's my turn  
**So that** I can choose a champion I'm comfortable playing

**Acceptance Criteria**:
- Bot sends me an ephemeral message when it's my turn
- Message contains dropdown menu with available champions (grouped by role)
- After I select, bot confirms my pick publicly and moves to next player
- If I don't pick within 60 seconds, bot auto-assigns a random champion
- I can see which champions have been picked and by whom

---

### FR-03: Pool Visibility and Updates
**As a** participant in a draft session  
**I want to** see what champions are still available  
**So that** I can plan my pick when my turn comes

**Acceptance Criteria**:
- Public message shows remaining champion count per role
- I can click "View Pool" button to see full list of available champions (ephemeral)
- Public message updates after each pick to show new state
- I can see whose turn it is at any time

---

### FR-04: Team Assignment and Image Generation
**As a** participant in a completed draft  
**I want to** see the final team compositions with analysis  
**So that** I know which team I'm on and how strong our composition is

**Acceptance Criteria**:
- After all 10 picks, bot randomly assigns champions to Blue/Red teams
- Bot generates team image (same format as `/gen`)
- Bot displays synergy analysis for both teams
- Final message shows draft order and pick sequence for reference

---

### FR-05: Draft Cancellation and Timeout
**As a** participant in a draft session  
**I want to** cancel the draft if we decide not to continue  
**So that** we can start a new draft or use a different mode

**Acceptance Criteria**:
- Any participant can click "Cancel Draft" button
- Bot asks for confirmation before cancelling
- Cancelled draft does not affect history window
- If draft times out (10 minutes), bot automatically cancels and notifies participants

---

### FR-06: Draft History Integration
**As a** Discord user  
**I want** completed drafts to be tracked in history  
**So that** we don't repeat the same champions in consecutive drafts

**Acceptance Criteria**:
- Completed draft is saved to composition history (same as `/gen`)
- Drafted champions are added to history window
- `/history` command shows draft sessions with pick order metadata
- Draft metadata includes: pick order, timestamps, player names (if available)

## Out of Scope

- **Voice channel integration**: Draft happens via text/buttons only, no voice commands
- **Role-specific pools**: All players pick from the same pool, no role restrictions
- **Champion bans**: No ban phase before draft starts
- **Custom pick timers**: 60-second timer is fixed, not configurable per session
- **Draft templates**: No saved draft configurations or presets
- **Spectator mode**: Only participants can view ephemeral pick messages
- **Pick trading**: Once a champion is picked, it cannot be traded to another player
- **Multi-guild drafts**: Draft sessions are isolated to a single guild

## Success Metrics

### Adoption
- 30% of active guilds use `/draft` at least once within first month
- 15% of active guilds use `/draft` as their primary generation mode (>50% of sessions)

### Engagement
- Average draft completion rate: >80% (not cancelled or timed out)
- Average time to complete draft: 3-5 minutes
- Player satisfaction: >4.0/5.0 rating (post-draft survey)

### Retention
- Guilds that use `/draft` have 20% higher 30-day retention vs `/gen`-only guilds
- Average drafts per active guild per week: 3-5

## Open Questions

1. **Player registration**: How do we identify which Discord users are participating in the draft?
   - Option A: Players react to initial message to join (up to 10 players)
   - Option B: Command initiator specifies player count, bot assigns turn order
   - Option C: Bot detects active voice channel members and auto-registers them

2. **Pool generation strategy**: Should pool be purely random or weighted by role balance?
   - Current: Random selection respecting role distribution (2 per role)
   - Alternative: Ensure at least 1 tank, 1 support, 1 ADC in pool

3. **Pick order fairness**: Should first-pick players get compensation (e.g., extra time, priority in next draft)?
   - Current: Pure snake draft, no compensation
   - Alternative: Track pick order history and rotate first-pick privilege

4. **Mobile UX**: How do we ensure dropdown menus work well on mobile Discord?
   - Need to test with 20+ champion dropdown on iOS/Android
   - May need to split into role-selection → champion-selection flow

5. **Undo mechanism**: Should players be able to undo their pick?
   - Option A: No undo, picks are final
   - Option B: Undo within 10 seconds of pick (only current turn)
   - Option C: Undo requires majority vote from participants

## Technical Notes

- Draft state stored in NodeCache (same as current team generation cache)
- Draft session structure:
  ```typescript
  interface DraftSession {
    id: string;
    guildId: string;
    participants: string[]; // Discord user IDs
    pickOrder: string[]; // Snake draft order
    pool: string[]; // Available champion IDs
    picks: Array<{ userId: string; championId: string; timestamp: number }>;
    currentTurnIndex: number;
    status: 'active' | 'completed' | 'cancelled' | 'timeout';
    createdAt: number;
    expiresAt: number;
  }
  ```
- Ephemeral messages use Discord's `flags: MessageFlags.Ephemeral`
- State updates use message editing to avoid channel spam
- Draft completion triggers same image generation + synergy analysis as `/gen`
