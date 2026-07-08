// Re-export the in-memory storage so the browser demo can wire up memory
// without depending on Node-only storage backends (filesystem, libsql, postgres).
//
// For IndexedDB persistence, implement the StorageDomain interfaces on top of
// your favourite IDB wrapper — the InMemoryStore in core shows the shape.

export { InMemoryStore } from '@mastra/core/storage'
