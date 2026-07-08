# @explorations/mastra-browser-loop

Browser-only PoC that runs the full `@mastra/core` agent loop in a Vite app —
no Node.js server required.

## Status

- Agent loop runs natively in the browser (verified with a mock language model).
- LLM providers (OpenAI / Anthropic / OpenAI-compatible) injected explicitly.
- Skills, custom tools, in-memory storage, HTTP MCP all wired up.
- Production bundle: **~4.3 MB minified / ~1.0 MB gzipped** including Mastra
  core, AI SDK, and zod.

## What's included

| Module            | Status | Notes                                                            |
| ----------------- | ------ | ---------------------------------------------------------------- |
| Agent             | ✅     | `Agent.generate` / `Agent.stream` work; pass explicit `Mastra`.  |
| MessageList       | ✅     | Native, no Node deps.                                            |
| Tools             | ✅     | `createTool` works; builtins (ask-user, submit-plan, tasks) ok.  |
| Skills            | ✅     | `createSkill` works; pure TS.                                    |
| Memory            | ✅     | `InMemoryStore` works. IndexedDB persistence = bring your own.   |
| MCP HTTP/SSE      | ✅     | Use `createHttpMcpTools` in `src/mcp-http.ts`.                   |
| Mastra (registry) | ✅     | Constructed explicitly to bypass `startWorkers`.                 |
| MCP stdio         | ❌     | Physically impossible in browser (no child_process).             |
| Durable agent     | ❌     | Needs persistent execution engine.                               |
| Filesystem store  | ❌     | Node-only.                                                       |
| Voice / ACP / A2A | ❌     | Out of scope per design decision.                                |

## Why this is non-trivial

`@mastra/core`'s published dist references several Node-only modules in
shared chunks (the agent loop itself doesn't call them, but tree-shaking
doesn't separate them out). We resolve them with stubs that:

- Throw at runtime if invoked (`fs`, `child_process`, `http`, `net`, `tls`, …).
- Provide minimal browser-compatible implementations where the agent loop
  actually needs them:
  - `node:crypto` → wraps `globalThis.crypto` + FNV-1a for `createHash`
    (`stubs/crypto.js`).
  - `node:async_hooks` → tiny `AsyncLocalStorage` shim that holds a single
    ambient slot (`stubs/async-hooks.js`).
  - `stream/web` → re-exports native browser globals (`stubs/stream-web.js`)
    — **do not** use `web-streams-polyfill` here, its prototypes differ from
    native and break `pipeThrough`.

## Run it

```bash
pnpm install --ignore-workspace
pnpm dev
# open http://localhost:5180
```

This project uses the **published** `@mastra/core` from npm (not the workspace
link) so it can be installed independently of the monorepo's internal build
graph.

## Files

- `src/index.ts` — public re-exports, server-only subpaths intentionally
  excluded.
- `src/providers.ts` — explicit LLM provider builder (bypasses the
  Node-only provider-registry).
- `src/mcp-http.ts` — MCP HTTP/SSE client adapter (replaces `@mastra/mcp`
  which depends on stdio + AsyncLocalStorage).
- `src/memory.ts` — re-exports `InMemoryStore`.
- `src/demo/main.ts` — minimal chat UI that wires everything together.
- `stubs/` — Node builtin shims.
- `vite.config.ts` — alias map that directs every Node builtin.
