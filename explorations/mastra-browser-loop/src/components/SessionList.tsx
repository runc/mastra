import { useState, useCallback } from 'react'
import type { SessionMeta } from '../db'
import { useLanguage } from '../i18n'

interface SessionListProps {
  sessions: SessionMeta[]
  activeId: string | null
  collapsed: boolean
  onToggleCollapse: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => void
  onSettings: () => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function SessionList({
  sessions,
  activeId,
  collapsed,
  onToggleCollapse,
  onSelect,
  onDelete,
  onNew,
  onRename,
  onSettings,
}: SessionListProps) {
  const { t } = useLanguage()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const handleDoubleClick = useCallback((s: SessionMeta) => {
    setEditingId(s.id)
    setEditTitle(s.title)
  }, [])

  const handleRenameSubmit = useCallback(() => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim())
    }
    setEditingId(null)
  }, [editingId, editTitle, onRename])

  if (collapsed) {
    return (
      <div className="shrink-0 border-r border-(--border1) bg-(--surface2) flex flex-col items-center py-3 gap-3">
        {/* Expand button */}
        <button
          className="size-8 flex items-center justify-center rounded-md text-(--neutral3) hover:text-(--neutral5) hover:bg-(--surface4) transition-colors cursor-pointer"
          onClick={onToggleCollapse}
          title={t('session.expand')}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
        {/* New session */}
        <button
          className="size-8 flex items-center justify-center rounded-md text-(--neutral3) hover:text-(--neutral5) hover:bg-(--surface4) transition-colors cursor-pointer"
          onClick={onNew}
          title={t('session.new')}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>

        {/* Spacer pushes settings to bottom */}
        <div className="flex-1" />

        {/* Settings */}
        <button
          className="size-8 flex items-center justify-center rounded-md text-(--neutral3) hover:text-(--neutral5) hover:bg-(--surface4) transition-colors cursor-pointer"
          onClick={onSettings}
          title={t('settings.title')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1.5v1.5M8 13v1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M1.5 8H3M13 8h1.5M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="w-60 shrink-0 border-r border-(--border1) bg-(--surface2) flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-(--border1)">
        <button
          className="size-7 flex items-center justify-center rounded-md text-(--neutral3) hover:text-(--neutral5) hover:bg-(--surface4) transition-colors cursor-pointer shrink-0"
          onClick={onToggleCollapse}
          title={t('session.collapse')}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-(--neutral4) truncate flex-1">
          {t('session.title')}
        </span>
        <button
          className="size-7 flex items-center justify-center rounded-md text-(--neutral3) hover:text-(--neutral5) hover:bg-(--surface4) transition-colors cursor-pointer shrink-0"
          onClick={onNew}
          title={t('session.new')}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-(--neutral2)">
            {t('session.empty')}
          </p>
        ) : (
          sessions.map(s => {
            const isActive = s.id === activeId
            const isEditing = s.id === editingId
            return (
              <div
                key={s.id}
                className={`group relative mx-1.5 my-0.5 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-(--surface4)'
                    : 'hover:bg-(--surface3)'
                }`}
                onClick={() => onSelect(s.id)}
                onDoubleClick={() => handleDoubleClick(s)}
              >
                <div className="flex items-center gap-2 px-3 py-2.5 min-w-0">
                  {/* Icon */}
                  <svg
                    className="size-3.5 shrink-0 text-(--neutral2)"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                    />
                  </svg>

                  {/* Title or edit input */}
                  {isEditing ? (
                    <input
                      className="flex-1 min-w-0 text-xs bg-(--surface2) border border-(--border1) rounded px-1.5 py-0.5 text-(--neutral6) outline-hidden focus:ring-1 focus:ring-(--accent1)"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={handleRenameSubmit}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameSubmit()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="flex-1 text-xs text-(--neutral5) truncate">
                        {s.title || t('session.untitled')}
                      </span>
                      <span className="text-[10px] text-(--neutral1) shrink-0">
                        {formatDate(s.updatedAt)}
                      </span>
                    </>
                  )}

                  {/* Delete button */}
                  {!isEditing && (
                    <button
                      className="size-5 hidden group-hover:flex items-center justify-center rounded text-(--neutral2) hover:text-(--negative1) hover:bg-(--negative1)/10 transition-colors cursor-pointer shrink-0"
                      onClick={e => {
                        e.stopPropagation()
                        onDelete(s.id)
                      }}
                      title={t('session.delete')}
                    >
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer — settings at bottom-left */}
      <div className="shrink-0 border-t border-(--border1) px-2 py-2">
        <button
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-(--neutral3) hover:text-(--neutral5) hover:bg-(--surface4) transition-colors cursor-pointer"
          onClick={onSettings}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1.5v1.5M8 13v1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M1.5 8H3M13 8h1.5M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
          </svg>
          {t('settings.title')}
        </button>
      </div>
    </div>
  )
}
