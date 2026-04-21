import { useCallback, useState } from 'react';

/**
 * Tracks which puzzle symbols the player has already seen a coach-mark for.
 * Persisted in localStorage as two independent one-shot flags so we can
 * explain each symbol exactly once, ever — no re-teaching on return visits.
 *
 * The flags are written synchronously when `markSeen` is called; the hook's
 * local state is also updated so callers re-render without an extra trip to
 * storage.
 */

export type CoachSymbol = 'fill' | 'clear';

const STORAGE_KEYS: Record<CoachSymbol, string> = {
  fill: 'blockit-coach-seen-fill',
  clear: 'blockit-coach-seen-clear',
};

function readFlag(symbol: CoachSymbol): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS[symbol]) === '1';
  } catch {
    // localStorage unavailable (private mode, etc.) — treat as "already seen"
    // so we don't pester the player with a tooltip we can't remember.
    return true;
  }
}

function writeFlag(symbol: CoachSymbol) {
  try {
    localStorage.setItem(STORAGE_KEYS[symbol], '1');
  } catch { /* noop */ }
}

export function useCoachMarks() {
  const [seen, setSeen] = useState<Record<CoachSymbol, boolean>>(() => ({
    fill: readFlag('fill'),
    clear: readFlag('clear'),
  }));

  const markSeen = useCallback((symbol: CoachSymbol) => {
    setSeen((prev) => {
      if (prev[symbol]) return prev;
      writeFlag(symbol);
      return { ...prev, [symbol]: true };
    });
  }, []);

  return { seen, markSeen };
}
