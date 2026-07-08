import { useState, useEffect, useCallback } from 'react'
import type { UIMessage } from './types'
import {
  getAllSessions,
  getSession,
  saveSession,
  deleteSession as dbDeleteSession,
  generateId,
  type SessionMeta,
  type SessionRecord,
} from '../db'

interface UseSessionsReturn {
  sessions: SessionMeta[]
  activeId: string | null
  ready: boolean
  createSession: () => Promise<string>
  switchSession: (id: string) => Promise<UIMessage[]>
  deleteSession: (id: string) => Promise<void>
  persistMessages: (id: string, messages: UIMessage[], title?: string) => Promise<void>
  renameSession: (id: string, title: string) => Promise<void>
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // Load session list on mount
  useEffect(() => {
    getAllSessions().then(list => {
      setSessions(list)
      if (list.length > 0) {
        setActiveId(list[0].id)
      }
      setReady(true)
    })
  }, [])

  const createSession = useCallback(async (): Promise<string> => {
    const id = generateId()
    const now = Date.now()
    const record: SessionRecord = {
      id,
      title: '',
      messages: [],
      createdAt: now,
      updatedAt: now,
    }
    await saveSession(record)
    const meta: SessionMeta = { id, title: '', messageCount: 0, createdAt: now, updatedAt: now }
    setSessions(prev => [meta, ...prev])
    setActiveId(id)
    return id
  }, [])

  const switchSession = useCallback(async (id: string): Promise<UIMessage[]> => {
    setActiveId(id)
    const record = await getSession(id)
    return record?.messages ?? []
  }, [])

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    await dbDeleteSession(id)
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      if (activeId === id) {
        const newActive = next[0] ?? null
        setActiveId(newActive?.id ?? null)
      }
      return next
    })
  }, [activeId])

  const persistMessages = useCallback(async (id: string, messages: UIMessage[], title?: string): Promise<void> => {
    const record = await getSession(id)
    if (!record) return

    const newTitle = title ?? record.title
    const updated: SessionRecord = {
      ...record,
      title: newTitle,
      messages,
      updatedAt: Date.now(),
    }
    await saveSession(updated)
    setSessions(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, title: newTitle, messageCount: messages.length, updatedAt: updated.updatedAt }
          : s,
      ),
    )
  }, [])

  const renameSession = useCallback(async (id: string, title: string): Promise<void> => {
    const record = await getSession(id)
    if (!record) return
    record.title = title
    record.updatedAt = Date.now()
    await saveSession(record)
    setSessions(prev =>
      prev.map(s => (s.id === id ? { ...s, title, updatedAt: record.updatedAt } : s)),
    )
  }, [])

  return { sessions, activeId, ready, createSession, switchSession, deleteSession, persistMessages, renameSession }
}
