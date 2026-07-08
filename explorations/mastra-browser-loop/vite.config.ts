import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const root = fileURLToPath(new URL('./', import.meta.url))
const _require = createRequire(import.meta.url)

// Browser polyfill packages — resolved to absolute paths so Vite's esbuild
// can read them during dependency pre-bundling.
const POLY_WEB_STREAMS = resolve(root, 'stubs/stream-web.js')
const POLY_BUFFER = resolve(root, 'node_modules/buffer/index.js')
const POLY_PROCESS = resolve(root, 'node_modules/process/browser.js')
const POLY_UTIL = resolve(root, 'node_modules/util/util.js')
// createRequire works for these since they aren't shadowed by Node builtins.
const POLY_PATH_BROWSER = _require.resolve('path-browserify')
const POLY_READABLE_STREAM = _require.resolve('readable-stream')
const POLY_EVENTS = resolve(root, 'node_modules/events/events.js')
const STUB_THROW = resolve(root, 'stubs/empty-throw.js')
const STUB_OBJ = resolve(root, 'stubs/empty-object.js')
const STUB_ASYNC_HOOKS = resolve(root, 'stubs/async-hooks.js')
const STUB_CRYPTO = resolve(root, 'stubs/crypto.js')
const STUB_STRING_DECODER = resolve(root, 'stubs/string-decoder.js')

// Browser-only PoC for @mastra/core agent loop.
//
// @mastra/core's published dist references Node-only modules (fs/promises,
// child_process, path/posix, stream/web, ...). They live in shared chunks
// but are not invoked by the agent loop hot path in a browser context.
//
// We alias Node builtins to browser-compatible npm packages (buffer, stream,
// path, process, util) and stub server-only modules (fs, child_process, http,
// net, tls) with empty objects that throw on access. All polyfill paths are
// absolute so Vite's esbuild can read them during dependency pre-bundling.

export default defineConfig({
  define: {
    global: 'globalThis',
    'process.env': JSON.stringify({}),
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify('v0.0.0'),
  },
  resolve: {
    alias: [
      // Node builtins — exact match only (regex with ^ and $).
      { find: /^fs$/, replacement: STUB_THROW },
      { find: /^fs\/promises$/, replacement: STUB_THROW },
      { find: /^node:fs$/, replacement: STUB_THROW },
      { find: /^node:fs\/promises$/, replacement: STUB_THROW },
      { find: /^child_process$/, replacement: STUB_THROW },
      { find: /^node:child_process$/, replacement: STUB_THROW },
      { find: /^http$/, replacement: STUB_THROW },
      { find: /^https$/, replacement: STUB_THROW },
      { find: /^node:http$/, replacement: STUB_THROW },
      { find: /^node:https$/, replacement: STUB_THROW },
      { find: /^net$/, replacement: STUB_THROW },
      { find: /^node:net$/, replacement: STUB_THROW },
      { find: /^tls$/, replacement: STUB_THROW },
      { find: /^node:tls$/, replacement: STUB_THROW },
      { find: /^node:module$/, replacement: STUB_THROW },
      { find: /^module$/, replacement: STUB_THROW },

      // Browser-specific stubs.
      { find: /^node:async_hooks$/, replacement: STUB_ASYNC_HOOKS },
      { find: /^async_hooks$/, replacement: STUB_ASYNC_HOOKS },
      { find: /^url$/, replacement: STUB_OBJ },
      { find: /^node:url$/, replacement: STUB_OBJ },
      { find: /^string_decoder$/, replacement: STUB_STRING_DECODER },
      { find: /^node:string_decoder$/, replacement: STUB_STRING_DECODER },
      { find: /^node:os$/, replacement: STUB_OBJ },
      { find: /^os$/, replacement: STUB_OBJ },

      // Browser-compatible polyfills from npm (absolute paths).
      { find: /^events$/, replacement: POLY_EVENTS },
      { find: /^node:events$/, replacement: POLY_EVENTS },
      { find: /^buffer$/, replacement: POLY_BUFFER },
      { find: /^node:buffer$/, replacement: POLY_BUFFER },
      { find: /^process$/, replacement: POLY_PROCESS },
      { find: /^node:process$/, replacement: POLY_PROCESS },
      { find: /^process\/$/, replacement: POLY_PROCESS },
      { find: /^util$/, replacement: POLY_UTIL },
      { find: /^node:util$/, replacement: POLY_UTIL },

      // crypto — custom stub wraps globalThis.crypto + FNV-1a hash.
      { find: /^crypto$/, replacement: STUB_CRYPTO },
      { find: /^node:crypto$/, replacement: STUB_CRYPTO },

      // path / path-browserify.
      { find: /^path$/, replacement: POLY_PATH_BROWSER },
      { find: /^node:path$/, replacement: POLY_PATH_BROWSER },
      { find: /^path\/posix$/, replacement: POLY_PATH_BROWSER },
      { find: /^path\/win32$/, replacement: POLY_PATH_BROWSER },

      // stream / readable-stream.
      { find: /^stream$/, replacement: POLY_READABLE_STREAM },
      { find: /^node:stream$/, replacement: POLY_READABLE_STREAM },
      // Stream/web — use native browser globals.
      { find: /^stream\/web$/, replacement: POLY_WEB_STREAMS },
      { find: /^node:stream\/web$/, replacement: POLY_WEB_STREAMS },

      // Drop server-only @mastra/core subpaths.
      { find: /^@mastra\/core\/voice$/, replacement: STUB_OBJ },
      { find: /^@mastra\/core\/deployer$/, replacement: STUB_OBJ },
      { find: /^@mastra\/core\/server$/, replacement: STUB_OBJ },
      { find: /^@mastra\/core\/worker$/, replacement: STUB_OBJ },
      { find: /^@mastra\/core\/a2a$/, replacement: STUB_OBJ },
      { find: /^@mastra\/core\/a2a\/client$/, replacement: STUB_OBJ },
      { find: /^@mastra\/core\/channels$/, replacement: STUB_OBJ },
      { find: /^@mastra\/core\/tts$/, replacement: STUB_OBJ },
      { find: /^@mastra\/core\/browser$/, replacement: STUB_OBJ },
      { find: /^@mastra\/core\/loop\/server$/, replacement: STUB_OBJ },
    ],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: 5180,
  },
})
