'use client';

import { useCallback, useState } from 'react';
import { readCollection, STORAGE_KEYS, writeCollection } from '@/lib/platformStore';
import type { SafetySession } from '@/types/index';

const MAX_SESSIONS = 20;

/** Recent questions and answers, kept on this device only and capped so storage cannot grow without limit. */
export function useVoiceSessions() {
  const [sessions, setSessions] = useState<SafetySession[]>(() => (typeof window === 'undefined' ? [] : readCollection<SafetySession>(STORAGE_KEYS.voiceSessions, [])));

  const add = useCallback((session: SafetySession) => {
    setSessions((previous) => {
      const next = [session, ...previous].slice(0, MAX_SESSIONS);
      writeCollection(STORAGE_KEYS.voiceSessions, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeCollection(STORAGE_KEYS.voiceSessions, []);
    setSessions([]);
  }, []);

  return { sessions, add, clear };
}
