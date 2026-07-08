// Minimal AnySearch MCP client — just enough to call the search tool without
// the full MCP SDK dependency. Implements the Streamable HTTP transport subset
// needed for stateless tool calls.

const ANYSEARCH_ENDPOINT = 'https://api.anysearch.com/mcp'

interface SearchResult {
  title: string
  url: string
  snippet: string
  publishedDate?: string
}

let sessionId: string | null = null

async function mcpCall(method: string, params?: Record<string, unknown>, apiKey?: string): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
  if (sessionId) headers['Mcp-Session-Id'] = sessionId

  const res = await fetch(ANYSEARCH_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
  })

  // Persist session id from response
  const sid = res.headers.get('Mcp-Session-Id')
  if (sid) sessionId = sid

  const text = await res.text()

  // MCP Streamable HTTP may return SSE or JSON
  if (text.startsWith('event:') || text.startsWith('data:')) {
    // Parse SSE stream — extract the final data payload
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const data = JSON.parse(line.slice(5).trim())
        if (data.result) return data.result
        if (data.error) throw new Error(data.error.message ?? 'MCP error')
      }
    }
    throw new Error('No result in SSE stream')
  }

  const data = JSON.parse(text)
  if (data.error) throw new Error(data.error.message ?? 'MCP error')
  return data.result
}

let initialized = false

async function ensureInit(apiKey?: string): Promise<void> {
  if (initialized) return
  await mcpCall('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'mastra-browser-agent', version: '1.0.0' },
  }, apiKey)
  initialized = true
}

export interface WebSearchOptions {
  query: string
  maxResults?: number
  freshness?: 'day' | 'week' | 'month' | 'year'
  domain?: string
  apiKey?: string
}

export async function webSearch(opts: WebSearchOptions): Promise<{
  results: SearchResult[]
  totalEstimated: number
}> {
  const { query, maxResults = 5, freshness, domain, apiKey } = opts

  await ensureInit(apiKey)

  const args: Record<string, unknown> = {
    query,
    max_results: Math.min(maxResults, 20),
  }
  if (freshness) args.freshness = freshness
  if (domain) args.domain = domain

  const result = await mcpCall('tools/call', {
    name: 'search',
    arguments: args,
  }, apiKey)

  // The MCP result.content is an array of content blocks (text, image, etc.)
  const content = result?.content ?? result ?? {}
  const text = Array.isArray(content)
    ? content.find((c: any) => c.type === 'text')?.text ?? JSON.stringify(content)
    : typeof content === 'string' ? content : JSON.stringify(content)

  // AnySearch returns markdown-formatted results. Parse them into structured items
  // by extracting numbered sections with title, URL, and snippet.
  const results = parseSearchResults(text)

  return { query, results, rawText: text.slice(0, 5000) }
}

/**
 * Parse AnySearch markdown output into structured results.
 * Format: "### N. Title\n- **URL**: https://...\n- snippet text"
 */
function parseSearchResults(text: string) {
  const results: { title: string; url: string; snippet: string }[] = []
  // Split on "### N. " pattern to get individual results
  const sections = text.split(/\n(?=### \d+\.\s)/)
  for (const section of sections) {
    const titleMatch = section.match(/^### \d+\.\s+(.+?)$/m)
    const urlMatch = section.match(/\*\*URL\*\*:\s+(https?:\/\/\S+)/)
    const snippet = section
      .replace(/^### \d+\..+$/m, '')
      .replace(/\*\*URL\*\*:\s+https?:\/\/\S+/g, '')
      .replace(/^[-*]\s+/gm, '')
      .trim()
      .slice(0, 400)

    if (titleMatch) {
      results.push({
        title: titleMatch[1].trim(),
        url: urlMatch?.[1] ?? '',
        snippet,
      })
    }
  }
  // If no structured results found, return the raw text as one result
  if (results.length === 0) {
    results.push({ title: 'Search Results', url: '', snippet: text.slice(0, 2000) })
  }
  return results
}
