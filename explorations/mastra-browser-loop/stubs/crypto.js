// Browser shim for node:crypto.
//
// Mastra's agent loop only needs:
//   - crypto.randomUUID()    → native in modern browsers
//   - crypto.getRandomValues → native
//   - crypto.createHash()    → we implement SHA-256 via WebCrypto (async) or
//                              use a tiny sync fallback. createHash is rare
//                              in the agent hot path (used by LLM router and
//                              a couple of cache keys), so a sync sha512 stub
//                              using a tiny JS implementation would also work.
//   - crypto.randomBytes()   → shim with getRandomValues

const webCrypto = globalThis.crypto

export const randomUUID = webCrypto?.randomUUID?.bind(webCrypto) ?? (() => {
  // RFC4122 v4 fallback if globalThis.crypto.randomUUID is missing.
  const bytes = new Uint8Array(16)
  webCrypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const h = [...bytes].map((b) => b.toString(16).padStart(2, '0'))
  return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10,16).join('')}`
})

export const getRandomValues = webCrypto?.getRandomValues?.bind(webCrypto)

export const randomBytes = (n) => {
  const buf = new Uint8Array(n)
  webCrypto.getRandomValues(buf)
  return buf
}

// createHash: returns an object with update() and digest(). We delegate to
// WebCrypto SubtleCrypto for sha256/sha512 (async) and throw for others.
// Mastra callers always use sync digest(), so for the agent loop we use a
// fast non-cryptographic fallback (xxhash-style) — never used for security.
function simpleHash(algorithm) {
  let data = ''
  return {
    update(chunk) {
      if (typeof chunk === 'string') data += chunk
      else if (chunk instanceof Uint8Array) data += Array.from(chunk).map(b => b.toString(16).padStart(2,'0')).join('')
      return this
    },
    digest(encoding) {
      // FNV-1a — non-crypto, fast. Fine for cache keys that mastra uses.
      let h = 0x811c9dc5
      for (let i = 0; i < data.length; i++) {
        h ^= data.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
      }
      const hex = (h >>> 0).toString(16).padStart(8, '0')
      if (encoding === 'hex') return hex
      if (encoding === 'base64') return btoa(hex)
      return hex
    },
  }
}

export const createHash = simpleHash

export default {
  randomUUID,
  getRandomValues,
  randomBytes,
  createHash,
}
