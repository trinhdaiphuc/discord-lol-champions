## ADDED Requirements

### Requirement: Default Post-Generate Synergy Analysis
The system SHALL analyze every generated team immediately after generation using deterministic rule-based scoring derived from champion data.

#### Scenario: Generate a team in Discord
- **WHEN** a user runs a team generation command
- **THEN** the system computes synergy scores for the generated team
- **AND** includes a compact summary in the response without requiring a separate command

#### Scenario: Generate a team via API
- **WHEN** a client requests team generation from an API endpoint
- **THEN** the system computes the same synergy scores for the generated team
- **AND** returns the compact summary in the API response

### Requirement: Compact Synergy Scorecard
The system SHALL provide a short scorecard for each generated team covering `engage`, `damage balance`, `CC`, `peel`, `scaling`, and `lane stability`.

#### Scenario: Discord-friendly summary
- **WHEN** a generated team is returned to a user
- **THEN** the synergy output is concise enough to fit naturally in the existing Discord flow
- **AND** highlights the team's strongest dimension and most obvious weakness

### Requirement: Rule-Based Scoring
The system SHALL compute synergy analysis without depending on an AI model or external inference service.

#### Scenario: AI provider is unavailable
- **WHEN** OpenAI or Gemini is unavailable or not configured
- **THEN** synergy analysis still completes successfully
- **AND** uses the same deterministic scoring logic

### Requirement: Persist Generated Analysis History
The system SHALL store each generated composition analysis in SQLite for later retrieval and reuse.

#### Scenario: Persist generated composition
- **WHEN** a team generation flow completes
- **THEN** the system stores the guild identifier, generated composition data, per-metric scores, summary text, and creation timestamp

#### Scenario: Use stored history for future features
- **WHEN** later flows need recent composition history
- **THEN** the stored analysis data supports history views, duplicate avoidance, and guild-level aggregate statistics
