## 1. Specification
- [ ] 1.1 Define the scoring rubric for `engage`, `damage balance`, `CC`, `peel`, `scaling`, and `lane stability`
- [ ] 1.2 Define how champion tags and any supplemental metadata map into each metric

## 2. Persistence
- [ ] 2.1 Design SQLite schema for generated composition analysis history
- [ ] 2.2 Add indexes and duplicate-detection strategy for recent comp lookups

## 3. Integration
- [ ] 3.1 Run synergy analysis automatically after every team generation flow
- [ ] 3.2 Include the compact summary in Discord and API generate responses
- [ ] 3.3 Persist analysis records for each generated composition

## 4. Follow-on behavior
- [ ] 4.1 Add history retrieval support for recent generated comps per guild
- [ ] 4.2 Add a foundation for anti-duplicate generation against recent history
- [ ] 4.3 Add aggregate guild-level stat queries over persisted analysis
