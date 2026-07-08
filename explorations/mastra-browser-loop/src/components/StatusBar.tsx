import { useLanguage } from '../i18n'

interface StatusBarProps {
  status: string
  isStreaming: boolean
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null
  mcpConnected: boolean
}

const STATUS_MAP: Record<string, string> = {
  'ready': 'status.ready',
  'building agent...': 'status.building',
  'streaming...': 'status.streaming',
  'done': 'status.done',
  'aborted': 'status.aborted',
  'error': 'status.error',
}

function translateStatus(raw: string, t: (k: string) => string): string {
  // Check exact match first
  if (STATUS_MAP[raw]) return t(STATUS_MAP[raw])
  // Dynamic MCP statuses — keep the raw text since it contains counts/errors
  return raw
}

export function StatusBar({ status, isStreaming, usage, mcpConnected }: StatusBarProps) {
  const { t } = useLanguage()

  return (
    <footer className="h-9 shrink-0 flex items-center gap-3 px-4 border-t border-(--border1) bg-(--surface2) text-xs">
      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={`size-2 rounded-full ${
            isStreaming
              ? 'bg-(--accent1) animate-pulse-dot'
              : status === 'error'
                ? 'bg-(--negative1)'
                : status === 'done' || status === 'ready'
                  ? 'bg-(--accent1)'
                  : 'bg-(--warning1)'
          }`}
        />
        <span className="text-(--neutral3)">{translateStatus(status, t)}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* MCP status */}
      {mcpConnected && (
        <span className="text-(--accent1)">MCP</span>
      )}

      {/* Usage */}
      {usage && (
        <div className="flex items-center gap-2 text-(--neutral2)">
          <span title={t('status.promptTokens')}>in: {usage.promptTokens.toLocaleString()}</span>
          <span title={t('status.completionTokens')}>out: {usage.completionTokens.toLocaleString()}</span>
          <span title={t('status.totalTokens')} className="text-(--neutral3)">| {usage.totalTokens.toLocaleString()} {t('status.tok')}</span>
        </div>
      )}
    </footer>
  )
}
