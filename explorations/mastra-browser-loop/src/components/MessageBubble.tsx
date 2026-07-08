import type { UIMessage } from '../hooks/types'
import { ToolCallCard } from './ToolCallCard'
import { Markdown } from './Markdown'
import { useLanguage } from '../i18n'

interface MessageBubbleProps {
  message: UIMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { role, content } = message
  const { t } = useLanguage()
  const timestamp = formatMessageTime(message.createdAt)

  // Tool calls render as a card
  if (role === 'tool-call' || role === 'tool-result') {
    return <ToolCallCard message={message} />
  }

  // Error messages
  if (role === 'error') {
    return (
      <div className="my-2 px-3 py-2 rounded-lg border border-(--negative1)/30 bg-(--negative1)/10 text-sm text-(--negative1) animate-fade-in">
        {content}
      </div>
    )
  }

  // System messages
  if (role === 'system') {
    return (
      <div className="my-1 text-center text-xs text-(--neutral2) animate-fade-in">
        {content}
      </div>
    )
  }

  // Reasoning blocks
  if (role === 'reasoning') {
    return (
      <details className="my-1">
        <summary className="text-xs text-(--neutral3) cursor-pointer hover:text-(--neutral4) transition-colors">
          {t('msg.thinking')}
        </summary>
        <div className="mt-1 px-3 py-2 rounded border border-(--border1) bg-(--surface3) text-xs text-(--neutral3) italic">
          {content}
        </div>
      </details>
    )
  }

  // User message
  if (role === 'user') {
    return (
      <div className="my-5 flex justify-end animate-fade-in">
        <div className="flex max-w-[80%] flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 px-1 text-xs text-(--neutral2)">
            <span className="font-medium text-(--neutral3)">{t('msg.you')}</span>
            {timestamp && <time dateTime={new Date(message.createdAt ?? 0).toISOString()}>{timestamp}</time>}
          </div>
          <div className="whitespace-pre-wrap wrap-anywhere rounded-2xl rounded-br-md border border-(--accent1)/25 bg-(--accent1)/12 px-4 py-2.5 text-sm leading-relaxed text-(--neutral6)">
          {content}
          </div>
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="my-6 animate-fade-in">
      <div className="mb-2 flex items-center gap-2 text-xs text-(--neutral2)">
        <span className="flex size-6 items-center justify-center rounded-full border border-(--border1) bg-(--surface3) text-(--accent1)">
          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
        </span>
        <span className="font-medium text-(--neutral3)">{t('msg.assistant')}</span>
        {timestamp && <time dateTime={new Date(message.createdAt ?? 0).toISOString()}>{timestamp}</time>}
      </div>
      <div className="max-w-4xl border-l border-(--border2) pl-4 text-sm leading-relaxed text-(--neutral5)">
        <div>
          <Markdown>{content}</Markdown>
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-(--accent1) ml-0.5 align-text-bottom animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}

function formatMessageTime(createdAt?: number): string {
  if (!createdAt) return ''
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(createdAt)
}
