## ADDED Requirements

### Requirement: Guild-Scoped Generate Configuration
The system SHALL persist generate settings per `guildId`, including `poolSize` and `themeId`.

#### Scenario: Resolve config on generate request
- **WHEN** a Discord command or API generate request includes a guild context
- **THEN** the system reads that guild's config from cache or persistent storage
- **AND** applies defaults when no persisted record exists

#### Scenario: Update config and persist immediately
- **WHEN** a user changes pool size or theme for a guild
- **THEN** the system validates input
- **AND** upserts the guild config to persistent storage
- **AND** updates in-memory cache for that guild

#### Scenario: Reload guild config only for one guild
- **WHEN** reload is requested for a guild
- **THEN** the system refreshes config from persistent storage for that guild only

### Requirement: Configurable Pool Size
The system SHALL support pool size values from 3 to 6 champions per role per side, defaulting to 4.

#### Scenario: Generate with configured pool size
- **WHEN** a guild has `poolSize = N` (N in 3..6)
- **THEN** generated teams contain `6 * N` champions per side

### Requirement: Theme Preset Registry
The system SHALL provide a predefined theme catalog stored in project-local theme files and use `themeId` for rendering.

#### Scenario: Use configured theme
- **WHEN** a guild has a valid `themeId`
- **THEN** image generation uses that theme tokens

#### Scenario: Invalid or missing theme id fallback
- **WHEN** configured `themeId` is missing or invalid
- **THEN** rendering falls back to the default theme

### Requirement: User-Facing Theme Selection
Discord config command SHALL display human-readable theme names while using internal `themeId` values for storage.

#### Scenario: Theme choices in slash command
- **WHEN** user opens `/config theme`
- **THEN** choice labels show theme names
- **AND** submitted choice value maps to internal `themeId`

### Requirement: API Config Endpoints
The system SHALL expose endpoints to view, update, and reload per-guild config.

#### Scenario: Update config via API
- **WHEN** client calls update endpoint with valid payload
- **THEN** guild config is persisted and returned

#### Scenario: Reject invalid config via API
- **WHEN** client sends invalid `poolSize` or unknown `themeId`
- **THEN** API returns HTTP 400 with validation details
