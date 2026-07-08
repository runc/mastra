import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type Language = 'zh' | 'en'

// ── Translation dictionaries ────────────────────────────────────────────────

const zh = {
  // App header
  'app.title': 'Mastra 浏览器智能体',
  'app.beta': 'BETA',
  'app.mcp': 'MCP',

  // Config panel
  'config.heading': 'Agent 配置',
  'config.provider': '模型提供商',
  'config.apiKey': 'API Key',
  'config.baseUrl': 'Base URL (可选)',
  'config.model': '模型',
  'config.mcpUrl': 'MCP HTTP 端点 (可选)',
  'config.quickPick': '快速选择',
  'config.agentPreset': '智能体预设',
  'config.settings': '设置',

  // Chat view
  'chat.emptyTitle': '发送消息开始对话',
  'chat.emptySubtitle': '智能体完全在你的浏览器中运行',
  'chat.placeholder': '输入消息... (Enter 发送，Shift+Enter 换行)',
  'chat.stop': '停止',
  'chat.send': '发送',
  'chat.clear': '清空',
  'chat.attach': '添加附件',
  'chat.removeAttachment': '移除附件',
  'chat.modelUnset': '未设置模型',
  'chat.streaming': '生成中',
  'chat.readingFiles': '读取附件中',
  'chat.attachmentsHeader': '附件内容',
  'chat.attachmentName': '文件名',
  'chat.attachmentType': '类型',
  'chat.attachmentSize': '大小',
  'chat.attachmentBinary': '此附件不是可读文本，已作为文件摘要提供。',
  'chat.attachmentReadFailed': '读取附件失败。',
  'chat.attachmentsOnlyMessage': '请根据附件内容继续处理。',

  // Message bubble
  'msg.thinking': '思考中...',
  'msg.you': '你',
  'msg.assistant': '助手',

  // Tool call card
  'tool.call': '调用',
  'tool.result': '结果',
  'tool.input': '输入',
  'tool.output': '输出',

  // Status bar
  'status.promptTokens': '输入 tokens',
  'status.completionTokens': '输出 tokens',
  'status.totalTokens': '总计 tokens',
  'status.tok': 'tok',

  // Status messages (from useAgent)
  'status.ready': '就绪',
  'status.building': '构建 agent...',
  'status.streaming': '流式输出...',
  'status.done': '完成',
  'status.aborted': '已中止',
  'status.error': '错误',

  // Theme toggle
  'theme.switchDark': '切换到深色主题',
  'theme.switchLight': '切换到浅色主题',

  // Settings dialog
  'settings.title': '设置',
  'settings.tab.llm': '模型',
  'settings.tab.skills': '技能',
  'settings.tab.tools': '工具',
  'settings.tab.general': '通用',
  'settings.tab.agent': '智能体',
  'settings.tab.about': '关于',
  'settings.agent.preset': '智能体预设',
  'settings.agent.customPreset': '自定义',
  'settings.agent.name': '智能体名称',
  'settings.agent.instructions': '系统指令',
  'settings.agent.instructionsHint': '自定义系统 prompt，留空则使用默认值。',
  'settings.agent.instructionsPlaceholder': '你是一个有帮助的助手...',
  'settings.llm.configs': '模型配置',
  'settings.llm.configsHint': '保存多个 provider 和模型配置，当前选中的配置会用于新对话请求。',
  'settings.llm.add': '新增配置',
  'settings.llm.delete': '删除',
  'settings.llm.test': '测试连接',
  'settings.llm.test.testing': '测试中...',
  'settings.llm.test.success': '连接成功',
  'settings.llm.test.failed': '连接失败',
  'settings.llm.name': '配置名称',
  'settings.llm.noModel': '未设置模型',
  'settings.llm.activeHint': '左侧选中的配置会立即成为当前生效模型。',
  'settings.llm.provider': '模型提供商',
  'settings.llm.apiKey': 'API Key',
  'settings.llm.baseUrl': 'Base URL (可选)',
  'settings.llm.model': '模型',
  'settings.skills.empty': '未启用任何技能',
  'settings.tools.empty': '未启用任何工具',
  'settings.general.language': '界面语言',
  'settings.about.badge': 'Mastra Exploration',
  'settings.about.title': 'Mastra 浏览器智能体',
  'settings.about.description': '一个在浏览器中运行的 Mastra 智能体实验界面，用于验证模型配置、技能、工具和会话体验。',
  'settings.about.runtime': '运行方式',
  'settings.about.runtimeValue': '前端直接在浏览器中构建并运行 agent。',
  'settings.about.storage': '数据存储',
  'settings.about.storageValue': '配置和会话保存在当前浏览器本地存储中。',
  'settings.about.scope': '功能范围',
  'settings.about.scopeValue': '支持多模型配置、技能/工具开关、会话管理和 HTML 片段预览。',
  'settings.done': '完成',

  // Session list
  'session.title': '会话列表',
  'session.new': '新建会话',
  'session.delete': '删除会话',
  'session.untitled': '未命名会话',
  'session.empty': '暂无会话',
  'session.expand': '展开侧栏',
  'session.collapse': '收起侧栏',
}

const en: typeof zh = {
  'app.title': 'Mastra Browser Agent',
  'app.beta': 'BETA',
  'app.mcp': 'MCP',

  'config.heading': 'Agent Config',
  'config.provider': 'Provider',
  'config.apiKey': 'API Key',
  'config.baseUrl': 'Base URL (optional)',
  'config.model': 'Model',
  'config.mcpUrl': 'MCP HTTP endpoint (optional)',
  'config.quickPick': 'Quick pick',
  'config.agentPreset': 'Agent Preset',
  'config.settings': 'Settings',

  'chat.emptyTitle': 'Send a message to start',
  'chat.emptySubtitle': 'The agent runs entirely in your browser',
  'chat.placeholder': 'Ask the agent... (Enter to send, Shift+Enter for newline)',
  'chat.stop': 'Stop',
  'chat.send': 'Send',
  'chat.clear': 'Clear',
  'chat.attach': 'Add attachments',
  'chat.removeAttachment': 'Remove attachment',
  'chat.modelUnset': 'No model set',
  'chat.streaming': 'Streaming',
  'chat.readingFiles': 'Reading attachments',
  'chat.attachmentsHeader': 'Attachment content',
  'chat.attachmentName': 'File name',
  'chat.attachmentType': 'Type',
  'chat.attachmentSize': 'Size',
  'chat.attachmentBinary': 'This attachment is not readable text, so only its file summary is included.',
  'chat.attachmentReadFailed': 'Failed to read attachment.',
  'chat.attachmentsOnlyMessage': 'Please continue using the attachment content.',

  'msg.thinking': 'Thinking...',
  'msg.you': 'You',
  'msg.assistant': 'Assistant',

  'tool.call': 'call',
  'tool.result': 'result',
  'tool.input': 'Input',
  'tool.output': 'Result',

  'status.promptTokens': 'Prompt tokens',
  'status.completionTokens': 'Completion tokens',
  'status.totalTokens': 'Total tokens',
  'status.tok': 'tok',

  'status.ready': 'ready',
  'status.building': 'building agent...',
  'status.streaming': 'streaming...',
  'status.done': 'done',
  'status.aborted': 'aborted',
  'status.error': 'error',

  'theme.switchDark': 'Switch to dark theme',
  'theme.switchLight': 'Switch to light theme',

  'settings.title': 'Settings',
  'settings.tab.llm': 'LLM',
  'settings.tab.skills': 'Skills',
  'settings.tab.tools': 'Tools',
  'settings.tab.general': 'General',
  'settings.tab.agent': 'Agent',
  'settings.tab.about': 'About',
  'settings.agent.preset': 'Agent Preset',
  'settings.agent.customPreset': 'Custom',
  'settings.agent.name': 'Agent Name',
  'settings.agent.instructions': 'System Instructions',
  'settings.agent.instructionsHint': 'Custom system prompt. Leave empty for defaults.',
  'settings.agent.instructionsPlaceholder': 'You are a helpful assistant...',
  'settings.llm.configs': 'Model configs',
  'settings.llm.configsHint': 'Save multiple providers and model configs. The selected config is used for new chat requests.',
  'settings.llm.add': 'Add config',
  'settings.llm.delete': 'Delete',
  'settings.llm.test': 'Test connection',
  'settings.llm.test.testing': 'Testing...',
  'settings.llm.test.success': 'Connection succeeded',
  'settings.llm.test.failed': 'Connection failed',
  'settings.llm.name': 'Config name',
  'settings.llm.noModel': 'No model',
  'settings.llm.activeHint': 'The selected config becomes the active model immediately.',
  'settings.llm.provider': 'Provider',
  'settings.llm.apiKey': 'API Key',
  'settings.llm.baseUrl': 'Base URL (optional)',
  'settings.llm.model': 'Model',
  'settings.skills.empty': 'No skills enabled',
  'settings.tools.empty': 'No tools enabled',
  'settings.general.language': 'UI Language',
  'settings.about.badge': 'Mastra Exploration',
  'settings.about.title': 'Mastra Browser Agent',
  'settings.about.description': 'An experimental Mastra agent UI that runs in the browser for validating model configs, skills, tools, and session workflows.',
  'settings.about.runtime': 'Runtime',
  'settings.about.runtimeValue': 'The agent is built and run directly in the browser.',
  'settings.about.storage': 'Storage',
  'settings.about.storageValue': 'Configs and sessions are saved in this browser locally.',
  'settings.about.scope': 'Scope',
  'settings.about.scopeValue': 'Supports multiple model configs, skill/tool toggles, session management, and HTML snippet preview.',
  'settings.done': 'Done',

  // Session list
  'session.title': 'Sessions',
  'session.new': 'New session',
  'session.delete': 'Delete session',
  'session.untitled': 'Untitled session',
  'session.empty': 'No sessions',
  'session.expand': 'Expand sidebar',
  'session.collapse': 'Collapse sidebar',
}

const dictionaries = { zh, en }

// ── Context ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mastra-browser-agent:settings'

function loadLanguage(): Language {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.language === 'zh' || parsed.language === 'en') return parsed.language
    }
  } catch {}
  return 'zh'
}

function saveLanguage(lang: Language) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const current = raw ? JSON.parse(raw) : {}
    current.language = lang
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {}
}

interface LanguageCtx {
  language: Language
  t: (key: string) => string
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageCtx>({
  language: 'zh',
  t: (key: string) => (zh as Record<string, string>)[key] ?? key,
  setLanguage: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(loadLanguage)

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    saveLanguage(lang)
  }, [])

  const t = useCallback(
    (key: string): string => {
      const dict = dictionaries[language] as Record<string, string>
      return dict[key] ?? key
    },
    [language],
  )

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
