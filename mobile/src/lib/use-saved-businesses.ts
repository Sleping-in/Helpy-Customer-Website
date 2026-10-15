import { useEffect, useSyncExternalStore } from 'react'
import { readSavedBusinessIds, writeSavedBusinessIds } from './session'

let savedIds: string[] = []
let loadPromise: Promise<void> | undefined
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function snapshot() {
  return savedIds
}

function publish(ids: string[]) {
  savedIds = ids
  listeners.forEach(listener => listener())
}

function loadSavedBusinesses() {
  loadPromise ??= readSavedBusinessIds().then(publish)
  return loadPromise
}

export function useSavedBusinesses() {
  const ids = useSyncExternalStore(subscribe, snapshot, snapshot)
  useEffect(() => { void loadSavedBusinesses() }, [])

  const toggle = async (id: string) => {
    await loadSavedBusinesses()
    const previous = savedIds
    const next = previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]
    publish(next)
    try { await writeSavedBusinessIds(next) }
    catch (error) {
      if (savedIds === next) publish(previous)
      throw error
    }
  }

  return { ids, toggle }
}
