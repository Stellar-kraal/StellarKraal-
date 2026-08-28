import { useEffect, useState } from "react";

interface AutoSaveOptions<T> {
  storageKey: string;
  data: T;
  enabled?: boolean;
  interval?: number;
  walletAddress?: string;
  /**
   * Saved data older than this (ms) is treated as if it were never saved:
   * it's discarded from localStorage and neither `hasSavedData` nor
   * `restoreSavedData()` will surface it. Omit for no expiry.
   */
  expiryMs?: number;
}

interface SavedData<T> {
  walletAddress?: string;
  data: T;
  timestamp: string;
}

function isExpired<T>(parsed: SavedData<T>, expiryMs?: number): boolean {
  if (expiryMs == null) return false;
  const savedAt = new Date(parsed.timestamp).getTime();
  if (Number.isNaN(savedAt)) return false;
  return Date.now() - savedAt > expiryMs;
}

export function useFormAutoSave<T extends Record<string, any>>({
  storageKey,
  data,
  enabled = true,
  interval = 5000,
  walletAddress,
  expiryMs,
}: AutoSaveOptions<T>) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasSavedData, setHasSavedData] = useState(false);

  // Check for saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: SavedData<T> = JSON.parse(saved);
        if (isExpired(parsed, expiryMs)) {
          localStorage.removeItem(storageKey);
        } else if (!walletAddress || parsed.walletAddress === walletAddress) {
          setHasSavedData(true);
        }
      } catch (e) {
        // Invalid saved data
      }
    }
  }, [storageKey, walletAddress, expiryMs]);

  // Auto-save
  useEffect(() => {
    if (!enabled) return;

    const hasData = Object.values(data).some((value) => {
      if (typeof value === "string") return value.trim().length > 0;
      if (typeof value === "number") return true;
      return Boolean(value);
    });

    if (!hasData) return;

    const interval_id = setInterval(() => {
      const saveData: SavedData<T> = {
        data,
        timestamp: new Date().toISOString(),
      };
      if (walletAddress) {
        saveData.walletAddress = walletAddress;
      }
      localStorage.setItem(storageKey, JSON.stringify(saveData));
      setLastSaved(new Date());
    }, interval);

    return () => clearInterval(interval_id);
  }, [data, enabled, interval, storageKey, walletAddress]);

  const restoreSavedData = (): T | null => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;

    try {
      const parsed: SavedData<T> = JSON.parse(saved);
      if (isExpired(parsed, expiryMs)) {
        localStorage.removeItem(storageKey);
        setHasSavedData(false);
        return null;
      }
      if (walletAddress && parsed.walletAddress !== walletAddress) {
        return null;
      }
      setHasSavedData(false);
      return parsed.data;
    } catch (e) {
      return null;
    }
  };

  const clearSavedData = () => {
    localStorage.removeItem(storageKey);
    setHasSavedData(false);
    setLastSaved(null);
  };

  return {
    lastSaved,
    hasSavedData,
    restoreSavedData,
    clearSavedData,
  };
}
