// Browser shim for node:async_hooks AsyncLocalStorage.
//
// Mastra's observability layer creates AsyncLocalStorage instances at module
// load time to track the "current span". Browsers don't have async hooks, but
// we can fake the API surface: a single global slot holds the current store,
// and run() sets it for the duration of a synchronous callback. This is enough
// for the agent loop hot path which doesn't actually rely on cross-async-boundary
// propagation in the browser.

class AsyncLocalStorage {
  #store
  constructor() { this.#store = undefined }
  getStore() { return this.#store }
  enterWith(v) { this.#store = v }
  disable() { this.#store = undefined }
  run(store, callback, ...args) {
    const prev = this.#store
    this.#store = store
    try { return callback(...args) }
    finally { this.#store = prev }
  }
  exit(callback, ...args) {
    const prev = this.#store
    this.#store = undefined
    try { return callback(...args) }
    finally { this.#store = prev }
  }
  static bind(fn) { return fn }
  static snapshot() {
    return (cb, ...args) => cb(...args)
  }
}

export { AsyncLocalStorage }
export default { AsyncLocalStorage }
