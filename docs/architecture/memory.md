# Memory Architecture (`keza_memory.json` & SQLite)

## Design
- **In-RAM Hot Cache**: Memory is loaded once into module scope and accessible in <1ms.
- **Sensitive Data Shield**: Explicit regex and keyword filter preventing passwords, credit card numbers, bank credentials, and national IDs from entering persistent storage.
- **Deduplication & Conflict Resolution**: Compresses older summaries when entries exceed 200 items into an archive summary, maintaining a footprint under 500KB.
