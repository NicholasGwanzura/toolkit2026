
'use client';

import { useOnlineStatus } from './useOnlineStatus';

export function usePWA() {
  const isOnline = useOnlineStatus();
  return { isOnline };
}
