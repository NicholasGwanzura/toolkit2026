'use client';

// Saves field records on this device first, then sends them when there is a connection. Kept in
// IndexedDB, which has room for photos, separately for each signed-in person. Each item carries its
// own reference, so a send retried after a dropped connection is stored only once on the server.

import { useCallback, useEffect, useRef, useState } from 'react';
import { isRetryable } from '@/lib/gas-log-queue';

export interface QueuedItem<T> {
  ref: string;
  payload: T;
  /** When the work was saved on the device, which the server keeps as its time. */
  savedAt: string;
}

interface StoredQueue<T> {
  items: QueuedItem<T>[];
  failed: Record<string, string>;
}

const DB_NAME = 'coolpro-offline';
const STORE = 'queues';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readQueue<T>(key: string): Promise<StoredQueue<T>> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    request.onsuccess = () => resolve((request.result as StoredQueue<T> | undefined) ?? { items: [], failed: {} });
    request.onerror = () => reject(request.error);
  });
}

async function writeQueue<T>(key: string, value: StoredQueue<T>): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useOfflineQueue<T>(kind: string, userId: string | undefined, send: (item: QueuedItem<T>) => Promise<unknown>) {
  const key = userId ? `${kind}:${userId}` : null;
  const [items, setItems] = useState<QueuedItem<T>[]>([]);
  const [failed, setFailed] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [storageProblem, setStorageProblem] = useState('');
  const hydratedKey = useRef<string | null>(null);
  const syncingRef = useRef(false);
  const sendRef = useRef(send);
  useEffect(() => { sendRef.current = send; }, [send]);

  const syncAll = useCallback(async (list: QueuedItem<T>[], alreadyFailed: Record<string, string>) => {
    if (syncingRef.current || !navigator.onLine) return;
    const todo = list.filter((item) => !alreadyFailed[item.ref]);
    if (todo.length === 0) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      for (const item of todo) {
        try {
          await sendRef.current(item);
          setItems((prev) => prev.filter((entry) => entry.ref !== item.ref));
        } catch (err) {
          if (isRetryable(err)) break; // offline, signed out or server trouble: keep it and try later
          setFailed((prev) => ({ ...prev, [item.ref]: err instanceof Error ? err.message : 'The server refused this record.' }));
        }
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  // Load what was saved on this device, then send anything waiting.
  useEffect(() => {
    hydratedKey.current = null;
    setIsOnline(navigator.onLine);
    setItems([]);
    setFailed({});
    if (!key) return;
    let cancelled = false;
    readQueue<T>(key)
      .then((stored) => {
        if (cancelled) return;
        setItems(stored.items);
        setFailed(stored.failed);
        hydratedKey.current = key;
        void syncAll(stored.items, stored.failed);
      })
      .catch(() => {
        if (cancelled) return;
        hydratedKey.current = key;
        setStorageProblem('This browser cannot keep records on the device, so they need a connection to save.');
      });
    return () => { cancelled = true; };
  }, [key, syncAll]);

  // Keep the device copy up to date.
  useEffect(() => {
    if (!key || hydratedKey.current !== key || storageProblem) return;
    writeQueue(key, { items, failed }).catch(() => setStorageProblem('Could not save on this device. Free some storage space and try again.'));
  }, [key, items, failed, storageProblem]);

  // Send when the connection comes back.
  useEffect(() => {
    const online = () => { setIsOnline(true); void syncAll(items, failed); };
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [items, failed, syncAll]);

  const submit = useCallback((payload: T) => {
    const item: QueuedItem<T> = { ref: crypto.randomUUID(), payload, savedAt: new Date().toISOString() };
    const next = [...items, item];
    setItems(next);
    void syncAll(next, failed);
    return item.ref;
  }, [items, failed, syncAll]);

  const retry = useCallback(() => { void syncAll(items, failed); }, [items, failed, syncAll]);

  const retryFailed = useCallback((ref: string) => {
    const nextFailed = { ...failed };
    delete nextFailed[ref];
    setFailed(nextFailed);
    void syncAll(items, nextFailed);
  }, [items, failed, syncAll]);

  const discard = useCallback((ref: string) => {
    setItems((prev) => prev.filter((item) => item.ref !== ref));
    setFailed((prev) => {
      const next = { ...prev };
      delete next[ref];
      return next;
    });
  }, []);

  return { items, failed, isOnline, syncing, storageProblem, submit, retry, retryFailed, discard };
}
