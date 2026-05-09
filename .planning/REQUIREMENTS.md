# Requirements

## REQ-001: Default Team Synergy Summary

After each team generation, the system SHALL compute a short rule-based synergy summary from champion data and tags.

### Acceptance notes

- The summary includes scores for `engage`, `damage balance`, `CC`, `peel`, `scaling`, and `lane stability`
- The summary is compact enough for Discord consumption
- The scoring is deterministic and does not depend on LLM availability

## REQ-002: Persist Generated Composition Analysis

The system SHALL persist each generated composition analysis in SQLite for later retrieval and reuse.

### Acceptance notes

- Each persisted record includes `guildId`, champion composition data, metric scores, summary text, and creation time
- Stored data supports history retrieval, duplicate avoidance, and guild-level statistics
