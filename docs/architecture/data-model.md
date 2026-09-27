# Data Model & Storage Specifications

## Canonical Storage
- **Sessions & Messages**: Stored in local SQLite (`userData/bob.db`) with Write-Ahead Logging (`WAL`), 64MB cache, and FTS indexing.
- **Structured Knowledge Graph**: Local findings, claims, and sources mapped by research ID.
- **User Memory**: In-memory hot cache persisted to `keza_memory.json` in Electron and local storage in browser environments.
