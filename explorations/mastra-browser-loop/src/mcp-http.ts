// Browser-friendly MCP client adapter.
//
// We deliberately avoid @mastra/mcp because its stdio transport spawns child
// processes and its connection layer relies on AsyncLocalStorage / fs. In the
// browser we only support the HTTP transports (Streamable HTTP and SSE), which
// are backed by fetch.

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { createTool } from '@mastra/core/tools'
import type { Tool } from '@mastra/core/tools'
import { z } from 'zod'

export interface HttpMcpOptions {
  /** Endpoint URL of the MCP server. */
  url: URL | string
  /** Bearer token / API key sent as Authorization header, if any. */
  authToken?: string
  /** Custom fetch implementation (defaults to global fetch). */
  fetchImpl?: typeof fetch
  /**
   * Force a transport. If omitted, we try StreamableHTTP first, then fall back
   * to SSE on the status codes the MCP spec allows (400/404/405).
   */
  transport?: 'streamable-http' | 'sse'
  /** Friendly name used as the tool id prefix. */
  name?: string
}

const SSE_FALLBACK_CODES = new Set([400, 404, 405])

interface DiscoveredTool {
  name: string
  description?: string
  inputSchema: unknown
}

async function discoverTools(client: Client): Promise<DiscoveredTool[]> {
  const list = await client.listTools()
  return (list.tools ?? []).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }))
}

function buildTransport(opts: HttpMcpOptions, kind: 'streamable-http' | 'sse'): Transport {
  const url = new URL(typeof opts.url === 'string' ? opts.url : opts.url.href)
  const requestInit: RequestInit = opts.fetchImpl ? { fetch: opts.fetchImpl as any } : {}
  if (opts.authToken) {
    requestInit.headers = { ...(requestInit.headers as any), Authorization: `Bearer ${opts.authToken}` }
  }
  if (kind === 'streamable-http') {
    return new StreamableHTTPClientTransport(url, requestInit as any)
  }
  return new SSEClientTransport(url, requestInit as any)
}

async function connectWithFallback(opts: HttpMcpOptions): Promise<{ client: Client; close: () => Promise<void> }> {
  const kinds: Array<'streamable-http' | 'sse'> = opts.transport
    ? [opts.transport]
    : ['streamable-http', 'sse']

  let lastError: unknown
  for (const kind of kinds) {
    const transport = buildTransport(opts, kind)
    const client = new Client(
      { name: opts.name ?? 'mastra-browser-loop', version: '0.0.0' },
      { capabilities: {} },
    )
    try {
      await client.connect(transport)
      return {
        client,
        close: async () => {
          try { await transport.close() } catch {}
          try { await client.close() } catch {}
        },
      }
    } catch (err: any) {
      lastError = err
      // The MCP spec lets servers signal "use SSE instead" via specific status codes.
      const code = err?.code ?? err?.status ?? err?.response?.status
      if (code && SSE_FALLBACK_CODES.has(code) && kind === 'streamable-http' && !opts.transport) {
        continue
      }
      try { await transport.close() } catch {}
    }
  }
  throw lastError ?? new Error('Failed to connect to MCP server')
}

/**
 * Connect to an HTTP-only MCP server and return its tools wrapped as Mastra tools.
 * The returned object includes a `close()` that should be called on teardown.
 */
export async function createHttpMcpTools(opts: HttpMcpOptions): Promise<{
  tools: Record<string, Tool>
  close: () => Promise<void>
}> {
  const { client, close } = await connectWithFallback(opts)
  const discovered = await discoverTools(client)
  const prefix = (opts.name ?? 'mcp').replace(/[^a-z0-9_-]/gi, '_')

  const tools: Record<string, Tool> = {}
  for (const t of discovered) {
    const safeName = t.name.replace(/[^a-z0-9_-]/gi, '_')
    const id = `${prefix}_${safeName}`
    tools[id] = createTool({
      id,
      description: t.description ?? `MCP tool ${t.name}`,
      inputSchema: z.record(z.any()),
      execute: async ({ context }) => {
        const result = await client.callTool({ name: t.name, arguments: (context ?? {}) as Record<string, unknown> })
        return { content: result.content, isError: Boolean(result.isError) }
      },
    })
  }

  return { tools, close }
}
