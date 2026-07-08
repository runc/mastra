import { useRef, useEffect, useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, FileText, Paperclip, Square, Trash2, X } from 'lucide-react'
import type { UIMessage } from '../hooks/types'
import { MessageBubble } from './MessageBubble'
import { useLanguage } from '../i18n'

interface ChatViewProps {
  messages: UIMessage[]
  isStreaming: boolean
  status: string
  model: string
  onSend: (input: string) => void
  onAbort: () => void
  onClear: () => void
}

export function ChatView({ messages, isStreaming, status, model, onSend, onAbort, onClear }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="size-12 rounded-full bg-(--surface3) flex items-center justify-center">
              <svg className="size-6 text-(--neutral3)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <p className="text-sm text-(--neutral3)">{t('chat.emptyTitle')}</p>
            <p className="text-xs text-(--neutral2)">{t('chat.emptySubtitle')}</p>
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      {/* Composer */}
      <PromptInputComposer
        isStreaming={isStreaming}
        status={status}
        model={model}
        onSend={onSend}
        onAbort={onAbort}
        onClear={onClear}
      />
    </div>
  )
}

interface PromptInputComposerProps {
  isStreaming: boolean
  status: string
  model: string
  onSend: (input: string) => void
  onAbort: () => void
  onClear: () => void
}

interface PromptAttachment {
  id: string
  file: File
}

function PromptInputComposer({ isStreaming, status, model, onSend, onAbort, onClear }: PromptInputComposerProps) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<PromptAttachment[]>([])
  const [isReadingFiles, setIsReadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()
  const isBusy = isStreaming || isReadingFiles
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isBusy

  const addFiles = (files: File[]) => {
    if (files.length === 0) return
    setAttachments(prev => [
      ...prev,
      ...files.map(file => ({
        id: crypto.randomUUID(),
        file,
      })),
    ])
  }

  const handleFileChange = () => {
    const files = Array.from(fileInputRef.current?.files ?? [])
    addFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isBusy) return
    addFiles(Array.from(event.dataTransfer.files))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSend) return
    setIsReadingFiles(true)
    try {
      const message = await composeMessageWithAttachments(input.trim(), attachments, t)
      onSend(message)
      setInput('')
      setAttachments([])
    } finally {
      setIsReadingFiles(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div className="shrink-0 border-t border-(--border1) bg-(--surface2) px-3 py-3 sm:px-4">
      <form
        className="mx-auto flex max-w-3xl flex-col overflow-hidden rounded-2xl border border-(--border2) bg-(--surface3) shadow-sm transition-colors focus-within:border-(--accent1)/70 focus-within:ring-2 focus-within:ring-(--accent1)/20"
        onSubmit={handleSubmit}
        onDragOver={event => event.preventDefault()}
        onDrop={handleDrop}
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-(--border1) px-3 py-2">
            {attachments.map(attachment => (
              <div
                key={attachment.id}
                className="flex max-w-full items-center gap-2 rounded-lg border border-(--border1) bg-(--surface4) px-2 py-1.5 text-xs text-(--neutral3)"
              >
                <FileText className="size-3.5 shrink-0 text-(--neutral2)" />
                <span className="min-w-0 truncate">{attachment.file.name}</span>
                <span className="shrink-0 text-(--neutral2)">{formatFileSize(attachment.file.size)}</span>
                <button
                  type="button"
                  className="size-5 shrink-0 rounded-md text-(--neutral2) transition-colors hover:bg-(--surface5) hover:text-(--neutral5)"
                  onClick={() => setAttachments(prev => prev.filter(item => item.id !== attachment.id))}
                  aria-label={t('chat.removeAttachment')}
                  title={t('chat.removeAttachment')}
                  disabled={isBusy}
                >
                  <X className="mx-auto size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 pt-3">
          <textarea
            className="block max-h-56 min-h-18 w-full resize-none bg-transparent text-sm leading-6 text-(--neutral6) placeholder:text-(--neutral2) focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-70 field-sizing-content"
            placeholder={t('chat.placeholder')}
            rows={2}
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-(--border1) px-2.5 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="size-8 shrink-0 rounded-lg border border-(--border1) bg-(--surface4) text-(--neutral3) transition-colors hover:bg-(--surface5) hover:text-(--neutral5) disabled:cursor-not-allowed disabled:opacity-50"
              title={t('chat.attach')}
              aria-label={t('chat.attach')}
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="mx-auto size-4" />
            </button>
            <span
              className="max-w-40 truncate rounded-lg border border-(--border1) bg-(--surface4) px-2.5 py-1.5 text-xs font-medium text-(--neutral3) sm:max-w-56"
              title={model || t('chat.modelUnset')}
            >
              {model || t('chat.modelUnset')}
            </span>
            <span className="hidden text-xs text-(--neutral2) sm:inline">
              {isReadingFiles ? t('chat.readingFiles') : isStreaming ? t('chat.streaming') : status}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="size-8 rounded-lg border border-(--border1) bg-(--surface4) text-(--neutral3) transition-colors hover:bg-(--surface5) hover:text-(--neutral5) disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onClear}
              disabled={isBusy}
              title={t('chat.clear')}
              aria-label={t('chat.clear')}
            >
              <Trash2 className="mx-auto size-4" />
            </button>

            {isStreaming ? (
              <button
                type="button"
                className="size-8 rounded-lg bg-(--negative1)/20 text-(--negative1) transition-colors hover:bg-(--negative1)/30"
                onClick={onAbort}
                title={t('chat.stop')}
                aria-label={t('chat.stop')}
              >
                <Square className="mx-auto size-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                className="size-8 rounded-lg bg-(--accent1) text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canSend}
                title={t('chat.send')}
                aria-label={t('chat.send')}
              >
                <ArrowUp className="mx-auto size-4" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isReadableTextFile(file: File): boolean {
  if (file.type.startsWith('text/')) return true
  return /\.(csv|json|log|md|mdx|txt|xml|yaml|yml)$/i.test(file.name)
}

async function composeMessageWithAttachments(
  input: string,
  attachments: PromptAttachment[],
  t: (key: string) => string,
): Promise<string> {
  if (attachments.length === 0) return input

  const renderedAttachments = await Promise.all(
    attachments.map(async ({ file }) => {
      const header = `${t('chat.attachmentName')}: ${file.name}\n${t('chat.attachmentType')}: ${file.type || 'unknown'}\n${t('chat.attachmentSize')}: ${formatFileSize(file.size)}`

      if (!isReadableTextFile(file)) {
        return `${header}\n${t('chat.attachmentBinary')}`
      }

      try {
        const text = await file.text()
        return `${header}\n\n${text}`
      } catch {
        return `${header}\n${t('chat.attachmentReadFailed')}`
      }
    }),
  )

  return [
    input || t('chat.attachmentsOnlyMessage'),
    `${t('chat.attachmentsHeader')}:\n\n${renderedAttachments.join('\n\n---\n\n')}`,
  ].join('\n\n')
}
