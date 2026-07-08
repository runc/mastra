import type { UIMessage } from './hooks/types'

export interface SessionRecord {
  id: string
  title: string
  messages: UIMessage[]
  createdAt: number
  updatedAt: number
}

export interface SessionMeta {
  id: string
  title: string
  messageCount: number
  createdAt: number
  updatedAt: number
}

const DB_NAME = 'mastra-browser-loop'
const DB_VERSION = 1
const STORE = 'sessions'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllSessions(): Promise<SessionMeta[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const index = store.index('updatedAt')
    const req = index.openCursor(null, 'prev')
    const results: SessionMeta[] = []
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        const record = cursor.value as SessionRecord
        results.push({
          id: record.id,
          title: record.title,
          messageCount: record.messages.length,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        })
        cursor.continue()
      } else {
        db.close()
        resolve(results)
      }
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

export async function getSession(id: string): Promise<SessionRecord | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => {
      db.close()
      resolve(req.result ?? null)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

export async function saveSession(record: SessionRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
