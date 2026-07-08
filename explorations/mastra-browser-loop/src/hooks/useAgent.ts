import { useState, useRef, useCallback, useEffect } from 'react'
import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { createSkill } from '@mastra/core/skills'
import { InMemoryStore } from '@mastra/core/storage'
import { MockMemory } from '@mastra/core/memory'
import { Mastra } from '@mastra/core/mastra'
import { z } from 'zod'

import { resolveModel, type ProviderKind } from '../providers'
import { createHttpMcpTools } from '../mcp-http'
import { webSearch } from '../anysearch'
import { GZH_DESIGN_SKILL_INSTRUCTIONS } from '../skills/gzh-design'
import type { AgentConfig, AppSettings } from './useConfig'
import { type UIMessage, nextId, resetIdCounter } from './types'

interface UseAgentOptions {
  config: AgentConfig
  settings: AppSettings
  fingerprint: string
  initialMessages?: UIMessage[]
  onMessagesChange?: (messages: UIMessage[]) => void
}

interface UseAgentReturn {
  messages: UIMessage[]
  isStreaming: boolean
  status: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null
  sendMessage: (input: string) => Promise<void>
  abort: () => void
  clearMessages: () => void
  setMessages: (messages: UIMessage[]) => void
}

// Pure-browser custom tool — demonstrates that arbitrary browser APIs slot in as Mastra tools.
const browserTimeTool = createTool({
  id: 'browserTime',
  description: 'Get the current time, time zone, and locale as seen by the browser.',
  inputSchema: z.object({}),
  execute: async () => {
    const now = new Date()
    return {
      iso: now.toISOString(),
      locale: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  },
})

const calculatorTool = createTool({
  id: 'calculator',
  description: 'Evaluate a mathematical expression. Supports +, -, *, /, %, **, and parentheses.',
  inputSchema: z.object({
    expression: z.string().describe('The math expression to evaluate, e.g. "(3 + 5) * 2"'),
  }),
  execute: async ({ expression }) => {
    const sanitized = expression.replace(/[^0-9+\-*/%.()\s]/g, '')
    if (sanitized !== expression) throw new Error(`Unsafe characters in expression: ${expression}`)
    const result = Function(`"use strict"; return (${sanitized})`)()
    return { expression, result }
  },
})

const fetchUrlTool = createTool({
  id: 'fetchUrl',
  description: 'Fetch the contents of a URL as plain text. Use to retrieve public web pages or API responses.',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to fetch'),
  }),
  execute: async ({ url }) => {
    const res = await fetch(url)
    if (!res.ok) return { status: res.status, statusText: res.statusText }
    const text = await res.text()
    return { status: res.status, contentType: res.headers.get('content-type'), body: text.slice(0, 3000) }
  },
})

const randomNumberTool = createTool({
  id: 'randomNumber',
  description: 'Generate a random integer between min and max (inclusive).',
  inputSchema: z.object({
    min: z.number().int().describe('Minimum value (inclusive)'),
    max: z.number().int().describe('Maximum value (inclusive)'),
  }),
  execute: async ({ min, max }) => {
    if (min > max) throw new Error(`min (${min}) must be <= max (${max})`)
    const value = Math.floor(Math.random() * (max - min + 1)) + min
    return { min, max, value }
  },
})

const webSearchTool = createTool({
  id: 'webSearch',
  description: 'Search the web for real-time information. Returns titles, URLs, and snippets. Use for current events, facts, documentation, or any topic that needs up-to-date information.',
  inputSchema: z.object({
    query: z.string().describe('The search query — be specific and use keywords'),
    maxResults: z.number().int().min(1).max(10).default(5).describe('Number of results (1-10, default 5)'),
    freshness: z.enum(['day', 'week', 'month', 'year']).optional().describe('Filter by recency'),
  }),
  execute: async ({ query, maxResults, freshness }) => {
    const { results, rawText } = await webSearch({ query, maxResults, freshness })
    return { query, count: results.length, results, rawText }
  },
})

const weatherSkill = createSkill({
  name: 'weather-smalltalk',
  description: 'Lightweight pattern for answering weather-related small talk.',
  instructions:
    'When the user asks about the weather, use the browserTime tool to acknowledge their time zone, then keep the response short and friendly.',
})

const toolsDemoSkill = createSkill({
  name: 'tools-demo',
  description: 'Demonstrates the built-in browser tools: time, calculator, random number, and URL fetching.',
  instructions: `You have access to these built-in browser tools:
- browserTime: get the current time, timezone, and locale
- calculator: evaluate math expressions
- fetchUrl: fetch a public URL's contents
- randomNumber: generate a random integer in a range

When a user wants to test or demo the tools, pick a few interesting examples and run them sequentially.
Explain what each tool does and show the results. Be playful and engaging.`,
})

const travelPlannerSkill = createSkill({
  name: 'travel-planner',
  description: 'A comprehensive travel planning assistant. Use when the user wants to plan a trip, create an itinerary, get travel advice, or discuss destinations, budgets, packing, and logistics.',
  instructions: `You are an expert travel planner. When a user wants to plan a trip, follow this structured workflow:

## Phase 1: Discovery
Gather key information from the user. Ask about:
- **Destination**: Where are they going? (city, country, or region)
- **Dates & Duration**: When and how many days?
- **Budget**: Total budget in their preferred currency (per person or total)
- **Travelers**: Solo, couple, family (with ages), friends?
- **Style**: Adventure, relaxation, cultural, foodie, luxury, budget backpacking, family-friendly?
- **Must-dos**: Any specific attractions or experiences they already have in mind?

Don't ask all at once — be conversational. Start with destination and dates, then naturally follow up.

## Phase 2: Planning
Once you have the essentials, use the available tools to build the plan:

1. **Use browserTime** to get the current date and timezone — this helps ground the plan in reality (how far away the trip is, timezone differences).

2. **Budget breakdown**: Use the calculator tool to allocate the budget:
   - Transportation (flights/trains): ~35-40%
   - Accommodation: ~25-30%
   - Food & Dining: ~15-20%
   - Activities & Attractions: ~10-15%
   - Miscellaneous / Emergency: ~5-10%

3. **Daily itinerary**: Create a day-by-day plan. For each day, suggest:
   - Morning activity (landmark, tour, museum)
   - Lunch spot (local cuisine)
   - Afternoon activity (exploration, shopping, nature)
   - Evening plan (dinner, nightlife, show)

4. **Packing suggestions**: Based on the destination's typical weather and planned activities.

## Phase 3: Enhancements
- Use the randomNumber tool for fun elements: "pick a random day for a surprise activity" or restaurant recommendations from a numbered list.
- Suggest local customs, basic phrases in the local language, tipping etiquette.
- Recommend travel insurance, visa requirements reminder, and any vaccinations.

## Presentation
Format your response with clear markdown:
- Use headings for each section (## Daily Itinerary, ## Budget Breakdown)
- Use tables for the budget summary
- Use bold for key recommendations
- Use numbered lists for the daily schedule
- End with an encouraging note!

Always be enthusiastic and personal — tailor recommendations to the user's preferences. If the user hasn't specified something, make reasonable assumptions and clearly state them.`,
})

const gzhDesignSkill = createSkill({
  name: 'gzh-design',
  description: '微信公众号文章排版引擎，将 Markdown 转换为可直接粘贴到公众号编辑器的 HTML。支持 6 套内置主题，自动章节编号、关键词下划线标记、引言卡片、代码块等。',
  instructions: GZH_DESIGN_SKILL_INSTRUCTIONS,
})

export function useAgent({ config, settings, fingerprint, initialMessages, onMessagesChange }: UseAgentOptions): UseAgentReturn {
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages ?? [])
  const [isStreaming, setIsStreaming] = useState(false)
  const [status, setStatus] = useState('ready')
  const [usage, setUsage] = useState<UseAgentReturn['usage']>(null)

  const agentRef = useRef<Agent<any, any, any, any> | null>(null)
  const lastFingerprintRef = useRef('')
  const controllerRef = useRef<AbortController | null>(null)
  const mcpCleanupRef = useRef<(() => void) | null>(null)

  const buildAgent = useCallback(async () => {
    const settingsFingerprint = `${settings.toolsEnabled.join(',')}|${settings.skillsEnabled.join(',')}|${settings.instructions}`
    const fullFingerprint = `${fingerprint}|${settingsFingerprint}`

    if (agentRef.current && lastFingerprintRef.current === fullFingerprint) {
      return agentRef.current
    }

    // Clean up previous MCP connection
    if (mcpCleanupRef.current) {
      mcpCleanupRef.current()
      mcpCleanupRef.current = null
    }

    const { provider, apiKey, baseUrl, model: modelId, mcpUrl } = config

    let resolvedModelId = modelId
    if (provider === 'anthropic' && !resolvedModelId) resolvedModelId = 'claude-3-5-sonnet-latest'
    if (provider === 'openai' && !resolvedModelId) resolvedModelId = 'gpt-4o-mini'
    if (provider === 'deepseek' && !resolvedModelId) resolvedModelId = 'deepseek-v4-flash'
    if (provider === 'openrouter' && !resolvedModelId) resolvedModelId = 'openrouter/auto'

    const { model } = resolveModel({ kind: provider as ProviderKind, apiKey, modelId: resolvedModelId, baseUrl: baseUrl || undefined })

    // Build tools map filtered by enabled settings
    const allTools: Record<string, ReturnType<typeof createTool>> = {
      browserTime: browserTimeTool,
      calculator: calculatorTool,
      fetchUrl: fetchUrlTool,
      randomNumber: randomNumberTool,
      webSearch: webSearchTool,
    }

    const tools: Record<string, ReturnType<typeof createTool>> = {}
    for (const [name, tool] of Object.entries(allTools)) {
      if (settings.toolsEnabled.includes(name)) {
        tools[name] = tool
      }
    }

    if (mcpUrl) {
      try {
        const mcp = await createHttpMcpTools({ url: mcpUrl, name: 'remote' })
        Object.assign(tools, mcp.tools)
        setStatus(`MCP: ${Object.keys(mcp.tools).length} tools connected`)
        mcpCleanupRef.current = () => { mcp.close() }
      } catch (err) {
        setStatus(`MCP connection failed: ${(err as Error).message}`)
      }
    }

    // Filter skills by enabled settings
    const allSkills = [weatherSkill, toolsDemoSkill, travelPlannerSkill, gzhDesignSkill]
    const skills = allSkills.filter(s => settings.skillsEnabled.includes(s.name))

    const storage = new InMemoryStore()
    const memory = new MockMemory({ storage, enableWorkingMemory: false, enableMessageHistory: true })

    let instructions = `You are a helpful agent running entirely in the user's browser.
Use tools when they help; otherwise reply concisely.
Always respond in Simplified Chinese (简体中文) unless the user explicitly asks for another language.`

    if (settings.instructions.trim()) {
      instructions += `\n\n${settings.instructions}`
    }

    const agent = new Agent({
      name: settings.agentName || 'browser-agent',
      instructions,
      model,
      tools,
      skills,
      memory,
    } as any)

    // Provide an explicit Mastra instance so the agent doesn't try startWorkers().
    new Mastra({ agents: { 'browser-agent': agent } })

    agentRef.current = agent
    lastFingerprintRef.current = fullFingerprint
    return agent
  }, [config, fingerprint, settings])

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim()) return

    const userMsg: UIMessage = { id: nextId(), role: 'user', content: input, createdAt: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)
    setStatus('building agent...')

    try {
      const agent = await buildAgent()

      controllerRef.current = new AbortController()
      const assistantId = nextId()
      const assistantMsg: UIMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        createdAt: Date.now(),
      }
      setMessages(prev => [...prev, assistantMsg])

      setStatus('streaming...')
      const stream = await agent.stream(
        { role: 'user', content: input },
        {
          resourceId: 'browser',
          threadId: 'demo',
          abortSignal: controllerRef.current.signal,
        } as any,
      )

      let acc = ''
      const toolMessages: UIMessage[] = []

      for await (const part of stream.fullStream) {
        if (controllerRef.current?.signal.aborted) break

        if (part.type === 'text-delta') {
          const delta = (part as any).payload?.text ?? ''
          if (typeof delta === 'string') {
            acc += delta
            setMessages(prev =>
              prev.map(m => (m.id === assistantId ? { ...m, content: acc } : m)),
            )
          }
        } else if (part.type === 'tool-call') {
          const p = (part as any).payload ?? part
          const tc: UIMessage = {
            id: nextId(),
            role: 'tool-call',
            content: '',
            toolName: p.toolName,
            toolInput: p.args,
            createdAt: Date.now(),
          }
          toolMessages.push(tc)
          setMessages(prev => [...prev, tc])
        } else if (part.type === 'tool-result') {
          const p = (part as any).payload ?? part
          const tr: UIMessage = {
            id: nextId(),
            role: 'tool-result',
            content: JSON.stringify(p.result ?? {}).slice(0, 500),
            toolName: p.toolName,
            createdAt: Date.now(),
          }
          toolMessages.push(tr)
          setMessages(prev => [...prev, tr])
        } else if (part.type === 'error') {
          const p = (part as any).payload ?? (part as any).error ?? part
          const msg = typeof p === 'object' ? (p?.message ?? JSON.stringify(p)) : String(p)
          setMessages(prev => [...prev, { id: nextId(), role: 'error', content: msg, createdAt: Date.now() }])
        }
      }

      // Mark assistant as done
      setMessages(prev =>
        prev.map(m => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
      )

      try {
        const usage: any = await stream.usage
        if (usage) {
          setUsage({
            promptTokens: usage.promptTokens ?? 0,
            completionTokens: usage.completionTokens ?? 0,
            totalTokens: usage.totalTokens ?? 0,
          })
        }
      } catch {}

      setStatus('done')
    } catch (err) {
      const msg = (err as Error).message ?? String(err)
      if (msg.includes('abort') || msg.includes('AbortError')) {
        setStatus('aborted')
      } else {
        setMessages(prev => [...prev, { id: nextId(), role: 'error', content: msg, createdAt: Date.now() }])
        setStatus('error')
      }
    } finally {
      setIsStreaming(false)
      controllerRef.current = null
    }
  }, [buildAgent])

  const abort = useCallback(() => {
    controllerRef.current?.abort()
    setStatus('aborted')
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setUsage(null)
    resetIdCounter()
  }, [])

  // Debounced persistence
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const onMessagesChangeRef = useRef(onMessagesChange)
  onMessagesChangeRef.current = onMessagesChange

  useEffect(() => {
    if (!onMessagesChange) return
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      onMessagesChangeRef.current?.(messagesRef.current)
    }, 400)
    return () => { if (persistTimerRef.current) clearTimeout(persistTimerRef.current) }
  }, [messages, onMessagesChange])

  // Flush persistence on unmount
  useEffect(() => {
    return () => {
      onMessagesChangeRef.current?.(messagesRef.current)
    }
  }, [])

  return { messages, isStreaming, status, usage, sendMessage, abort, clearMessages, setMessages }
}
