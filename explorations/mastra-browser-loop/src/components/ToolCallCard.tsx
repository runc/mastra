import { useState } from 'react'
import type { UIMessage } from '../hooks/types'
import { useLanguage } from '../i18n'

interface ToolCallCardProps {
  message: UIMessage
}

export function ToolCallCard({ message }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isCall = message.role === 'tool-call'
  const isResult = message.role === 'tool-result'
  const { t } = useLanguage()

  return (
    <div className="my-1 rounded-lg border border-(--border1) bg-(--surface3) overflow-hidden animate-fade-in">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-(--surface4) transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icon */}
        <span className={`size-4 rounded flex items-center justify-center text-[10px] shrink-0 ${isCall ? 'bg-(--accent3)/20 text-(--accent3)' : 'bg-(--accent1)/20 text-(--accent1)'}`}>
          {isCall ? '↓' : '↑'}
        </span>
        <span className="font-mono text-(--neutral4) font-medium">{message.toolName}</span>
        <span className="text-(--neutral2) ml-auto">
          {isCall ? t('tool.call') : t('tool.result')}
        </span>
        <svg
          className={`size-3 text-(--neutral2) transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-(--border1)">
          {isCall && message.toolInput && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wide text-(--neutral2) mb-1">{t('tool.input')}</div>
              <pre className="text-xs font-mono text-(--neutral5) bg-(--surface2) rounded p-2 overflow-x-auto max-h-48">
                {JSON.stringify(message.toolInput, null, 2)}
              </pre>
            </div>
          )}
          {isResult && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wide text-(--neutral2) mb-1">{t('tool.output')}</div>
              <pre className="text-xs font-mono text-(--neutral5) bg-(--surface2) rounded p-2 overflow-x-auto max-h-48 whitespace-pre-wrap">
                {message.content}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
