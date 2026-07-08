export type MessageRole = 'user' | 'assistant' | 'tool-call' | 'tool-result' | 'reasoning' | 'system' | 'error'

export interface UIMessage {
  id: string
  role: MessageRole
  content: string
  /** Only for tool-call / tool-result */
  toolName?: string
  /** Tool call input (JSON-serializable) */
  toolInput?: unknown
  /** Whether the assistant message is still streaming */
  isStreaming?: boolean
  /** Creation time in epoch milliseconds. Older saved sessions may omit this. */
  createdAt?: number
}

let _id = 0
export function nextId(): string {
  return String(++_id)
}

export function resetIdCounter() {
  _id = 0
}
