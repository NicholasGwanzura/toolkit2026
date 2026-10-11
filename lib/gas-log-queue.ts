'use client';

// Offline-first queue for refrigerant logs. A log is saved on the device first, then synced one at
// a time. A log the server refuses (bad data) is marked failed with the reason instead of retrying
// forever; a log that only failed because the network is down stays queued.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, createGasLogs } from '@/lib/api';
import { STORAGE_KEYS } from '@/lib/platformStore';
import type { RefrigerantLog } from '@/types/index';

interface StoredQueue {
  logs?: RefrigerantLog[];
  failed?: Record<string, string>;
  // Older versions stored pending ids separately; they are all still queued logs.
  ids?: string[];
}

/** Worth trying again later: no connection, an expired session, rate limiting or a server fault. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof TypeError) return true; // fetch could not reach the server
  if (err instanceof ApiError) return err.status === 401 || err.status === 408 || err.status === 429 || err.status >= 500;
  return false;
}

export function useGasLogQueue(userId: string | undefined) {
  const storageKey = userId ? `${STORAGE_KEYS.fieldToolkitPendingSync}:${userId}` : null;
  const [queue, setQueue] = useState<RefrigerantLog[]>([]);
  const [failed, setFailed] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const hydratedKey = useRef<string | null>(null);
  const syncingRef = useRef(false);

  // Load the saved queue for this user.
  useEffect(() => {
    hydratedKey.current = null;
    setIsOnline(navigator.onLine);
    if (!storageKey) {
      setQueue([]);
      setFailed({});
      return;
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as StoredQueue;
      const ids = new Set(stored.ids ?? (stored.logs ?? []).map(log => log.id));
      setQueue((stored.logs ?? []).filter(log => ids.has(log.id)));
      setFailed(stored.failed ?? {});
    } catch {
      setQueue([]);
      setFailed({});
    }
    hydratedKey.current = storageKey;
  }, [storageKey]);

  // Save it whenever it changes.
  useEffect(() => {
    if (!storageKey || hydratedKey.current !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ ids: queue.map(log => log.id), logs: queue, failed }));
    } catch (err) {
      console.error('Could not save the offline log queue:', err);
    }
  }, [storageKey, queue, failed]);

  const syncAll = useCallback(async (logs: RefrigerantLog[], alreadyFailed: Record<string, string>) => {
    if (syncingRef.current) return;
    const todo = logs.filter(log => !alreadyFailed[log.id]);
    if (todo.length === 0) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      for (const log of todo) {
        try {
          await createGasLogs([log]);
          setQueue(prev => prev.filter(item => item.id !== log.id));
        } catch (err) {
          if (isRetryable(err)) break; // offline, signed out or server trouble: keep everything queued and stop
          setFailed(prev => ({ ...prev, [log.id]: err instanceof Error ? err.message : 'The server refused this log.' }));
        }
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  // Sync when the connection comes back.
  useEffect(() => {
    const online = () => { setIsOnline(true); void syncAll(queue, failed); };
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [queue, failed, syncAll]);

  const submit = useCallback((log: RefrigerantLog) => {
    const next = [log, ...queue];
    setQueue(next);
    if (navigator.onLine) void syncAll(next, failed);
  }, [queue, failed, syncAll]);

  const retry = useCallback(() => { void syncAll(queue, failed); }, [queue, failed, syncAll]);

  /** Give a failed log another go, for example after the person has been told what was wrong. */
  const retryFailed = useCallback((id: string) => {
    const nextFailed = { ...failed };
    delete nextFailed[id];
    setFailed(nextFailed);
    void syncAll(queue, nextFailed);
  }, [queue, failed, syncAll]);

  const discard = useCallback((id: string) => {
    setQueue(prev => prev.filter(log => log.id !== id));
    setFailed(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return { queue, failed, isOnline, syncing, submit, retry, retryFailed, discard };
}
