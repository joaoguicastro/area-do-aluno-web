// src/auth/storage.ts
import type { FinanceLock } from './types';

const KEY = 'financeLock';

export function saveFinanceLock(lock: FinanceLock | null) {
  if (!lock) {
    localStorage.removeItem(KEY);
  } else {
    localStorage.setItem(KEY, JSON.stringify(lock));
  }
}

export function loadFinanceLock(): FinanceLock | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FinanceLock) : null;
  } catch {
    return null;
  }
}
