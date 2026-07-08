# Mastra 浏览器版 vs Node.js 版

## 核心架构对比

| 维度 | Node.js 原版 | 浏览器版 |
|------|------------|----------------|
| 运行时 | Node.js ≥ 22.13 | 浏览器(Chrome/Edge/Firefox/Safari 现代版) |
| 发布形式 | npm 多包 + workspace | npm 单包 + Vite shim |
| Provider 加载 | 自动扫 node_modules | 显式注入 |
| 持久化 | 文件系统 / DB | 内存 / IndexedDB(自接) |
| 部署 | 服务器 / Cloudflare Workers / Vercel | 静态站点 / SPA |

---

## 浏览器版**保留**的能力(已 PoC 验证)

### Agent 核心
- ✅ **Agent loop** — `agent.generate()` / `agent.stream()` / `agent.streamLegacy()`
- ✅ **流式输出** — `stream.fullStream` 异步迭代器
- ✅ **Structured output** — `output` schema 参数
- ✅ **Tool calling** — 自定义工具 + 并行 tool calls
- ✅ **Subagent** — 主 agent 派生子 agent
- ✅ **Goal / Trip wire / Signals** — 循环终止条件
- ✅ **Stream until idle** — 自动判断结束
- ✅ **AbortController** — 中断执行(浏览器原生更好用)
- ✅ **Skills** — `createSkill` 完整可用,纯 TS
- ✅ **内置工具** — `ask-user`(suspend/resume 人工审批)、`submit-plan`、`task-tools`
- ✅ **MessageList** — 多轮上下文管理
- ✅ **MockMemory + InMemoryStore** — 单 tab 内存历史

### Provider 支持(显式注入)
- ✅ OpenAI(`@ai-sdk/openai` v4 = V1 spec,走 `streamLegacy`)
- ✅ Anthropic
- ✅ OpenAI-compatible(任意 base URL,如 OpenRouter、DeepSeek、Moonshot 等)

### MCP
- ✅ **HTTP / SSE transport**(浏览器原生 fetch 驱动)
- ✅ 自动 fallback(HTTP → SSE,按 MCP spec 的 400/404/405 状态码)
- ✅ 工具发现 + 调用,包成 Mastra `Tool`

### Observability
- ✅ Console logger
- ⚠️ OpenTelemetry(需要后端 collector)

---

## 浏览器版**砍掉**的能力

### 物理不可能(浏览器限制)

| 模块 | 原因 |
|------|------|
| **MCP stdio transport** | 浏览器无 `child_process`,不能 spawn 本地 MCP 进程 |
| **Durable agent** | checkpoint 持久化、suspend/resume 跨进程,纯服务器概念 |
| **Shell 命令工具** | `run-command-tool` 用 `child_process.exec` |
| **Code-mode tool** | 写临时文件 + `import()` 动态加载 |
| **Filesystem storage** | `fs/promises` |
| **Git history** | `child_process` + `fs` |
| **文件系统 DB** | LibSQL / Postgres / pgvector / Pinecone 等所有 Node driver |
| **网络层 Node 内建** | `node:http` / `node:net` / `node:tls`(浏览器有 `fetch`/`WebSocket` 原生替代) |

### 按需求砍掉(非浏览器限制)

| 模块 | 状态 |
|------|------|
| **A2A**(Agent-to-Agent 协议) | alias 到空模块,不引入 |
| **ACP**(Agent Communication Protocol) | 同上 |
| **Voice**(TTS / STT / ElevenLabs / AWS Nova) | 同上 |
| **Channels**(Slack / Telegram / Discord 等消息渠道) | 同上 |

### 服务端专属(架构上不进浏览器)

| 模块 | 原因 |
|------|------|
| `@mastra/server`(Hono HTTP) | 服务器侧,浏览器是客户端不需要 |
| `server-adapters/*`(Express/Hono/Fastify/Nest/Next/TanStack) | 同上 |
| `@mastra/deployer` | 部署到 Cloudflare/Vercel 的打包器 |
| `@mastra/cloud` | Mastra Cloud SaaS 集成 |
| `packages/playground` + `playground-ui` | Studio 调试 UI(虽然可嵌入,但需要 server) |
| Auth (FGA / EE RBAC) | 服务器中间件 |
| Background tasks | 服务端调度 |
| Workflow 持久化执行引擎 | Inngest / 持久 DB |

---

## 浏览器版**改造**的能力

| 能力 | Node 原版 | 浏览器版 |
|------|---------|--------|
| **Provider 注入** | `model: 'openai/gpt-4'`(走 `provider-registry.ts` 扫 `node_modules`) | 显式 `import { createOpenAI } from '@ai-sdk/openai'` 后传 model 实例 |
| **MCP 客户端** | `@mastra/mcp`(支持 stdio + SSE + StreamableHTTP,内部用 `AsyncLocalStorage`) | `src/mcp-http.ts` 仅 HTTP/SSE,直接用 `@modelcontextprotocol/sdk` 的 `Client` |
| **Memory** | `@mastra/memory`(LibSQL/Postgres + 向量召回) | `MockMemory + InMemoryStore`(无向量召回) |
| **Storage** | LibSQL/Postgres/文件系统 | `InMemoryStore` 或自实现 IndexedDB 适配 `StorageDomain` 接口 |
| **Crypto** | `node:crypto`(randomUUID / createHash / randomBytes) | `stubs/crypto.js` 用 `globalThis.crypto` + FNV-1a hash |
| **AsyncLocalStorage** | `node:async_hooks`(跨 async 边界传递 context) | `stubs/async-hooks.js` 单 slot 模拟(同步回调用够,跨 await 不行) |
| **Streams** | `node:stream/web` | 浏览器原生 `ReadableStream` / `WritableStream` 透传(必须用原生,不能用 polyfill,否则破坏 `pipeThrough`) |
| **Mastra 实例** | 自动 ephemeral-mastra + startWorkers | 显式 `new Mastra({ agents })`(避开 `timer.unref()`) |
| **Stream 调用** | `agent.stream()`(V2+ spec) | `agent.streamLegacy()`(V1 spec 走 legacy 路径) |
| **Buffer** | Node 全局 | `import { Buffer } from 'buffer'` + 赋给 `globalThis.Buffer` |

---

## 功能差异矩阵(按 agent 框架需求)

| Claude Code 类能力 | 浏览器版 |
|---------------------------|--------|
| Agent loop(LLM → tool → 结果回灌) | ✅ |
| 流式 token 输出 | ✅ |
| 工具调用 + 并行 | ✅ |
| Skills(slash command) | ✅ |
| MCP 集成 | ✅(仅 HTTP/SSE) |
| 多轮上下文 | ✅(内存,刷新丢失) |
| Structured output | ✅ |
| Subagent | ✅ |
| 工具 suspend/resume(人工审批) | ✅ |
| 中断(AbortController) | ✅(比 Node 更顺手) |
| 长期记忆(IndexedDB) | ⚠️ 需自实现 `StorageDomain` |
| 本地 MCP 进程 | ❌ 物理不可能 |
| 跨会话持久化(suspend 几天后续跑) | ❌ 砍掉 durable |

---

## 实际工程影响

**Bundle 体积:** ~4.3 MB min / ~1 MB gzip(整个 Mastra core + AI SDK + zod)

**开发体验:**
- 装 `node_modules` 后 `vite dev` 直接跑
- 配置(provider/key/model)走 localStorage,刷新不丢
- Cmd/Ctrl+Enter 提交

**安全考量:**
- API key 存在浏览器 localStorage —— 桌面应用 OK,公网部署建议走后端代理
- `eval` warning 来自 `gray-matter`(MCP skill 解析 frontmatter),不影响 agent loop 主路径
- 所有 `node:fs` / `child_process` 调用都 stub 成 throw,即使误触发也是清晰报错

**何时选浏览器版,何时选 Node 版?**

- **选浏览器版**:本地工具(GitHub Copilot 风格)、内部 dashboard、Electron 应用、教育/demo、PWA 离线 agent
- **选 Node 版**:多用户生产环境、需要 RAG/向量召回、需要 durable workflow、需要 MCP stdio(本地工具)、需要 RBAC/审计

**何时混合(server + browser)?**

需要浏览器 UI + 持久记忆 + 后端 MCP stdio 时,用 `@mastra/server` 后端 + `client-sdks/js` 浏览器前端,两边都跑 Mastra,通过 HTTP 协议 —— 这是 Mastra 官方推荐的浏览器方案。
