// Browser-friendly surface of @mastra/core agent framework.
//
// We re-export the agent loop building blocks and explicitly avoid server-only
// subpaths (a2a, channels, voice, deployer, server, worker, durable, code-mode).
// LLM providers are NOT re-exported here — the demo injects them explicitly so
// the `provider-registry` (which scans node_modules) never runs.

export {
  Agent,
} from '@mastra/core/agent'

export type {
  AgentConfig,
  AgentGenerateOptions,
  AgentStreamOptions,
  AgentGenerateReturn,
  AgentStreamReturn,
} from '@mastra/core/agent'

export { MessageList } from '@mastra/core/agent'
export type { OutputFormat } from '@mastra/core/agent'

export {
  createTool,
  ToolStream,
} from '@mastra/core/tools'

export type {
  Tool,
  InternalCoreTool,
  ToolInput,
  ToolOutput,
  ToolExecutionContext,
} from '@mastra/core/tools'

export {
  createSkill,
} from '@mastra/core/skills'

export type {
  Skill,
  SkillConfig,
} from '@mastra/core/skills'

export { Mastra } from '@mastra/core/mastra'

export { InMemoryStore } from './memory.js'

export { resolveModel, type ResolvedModel, type ProviderKind } from './providers.js'

export {
  createHttpMcpTools,
  type HttpMcpOptions,
} from './mcp-http.js'

export { runDemo } from './demo/main.js'
