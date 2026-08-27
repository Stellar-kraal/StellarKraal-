"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useKeyboardShortcuts, Shortcut } from "@/hooks/useKeyboardShortcuts";
import ShortcutsHelpModal from "@/components/ShortcutsHelpModal";

interface ShortcutsHelpContextValue {
  /** Opens the keyboard-shortcuts cheat sheet modal — used by the Navbar trigger button (#531). */
  openShortcutsHelp: () => void;
}

export const ShortcutsHelpContext = createContext<ShortcutsHelpContextValue | null>(null);

/**
 * Access the shortcuts-help modal trigger from anywhere inside
 * KeyboardShortcutsProvider (e.g. the Navbar's keyboard icon button — #531).
 * Returns null when rendered outside the provider so callers can degrade
 * gracefully (mirrors the ToastContext pattern in ToastPositionSelector).
 */
export function useShortcutsHelp(): ShortcutsHelpContextValue | null {
  return useContext(ShortcutsHelpContext);
}

export default function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const toggleHelp = useCallback(() => setHelpOpen((v) => !v), []);

  const shortcuts: Shortcut[] = useMemo(() => [
    { key: "h",      hint: "H",   label: "Go to Home",               action: () => router.push("/") },
    { key: "d",      hint: "D",   label: "Go to Dashboard",          action: () => router.push("/dashboard") },
    { key: "b",      hint: "B",   label: "Borrow (get a loan)",      action: () => router.push("/borrow") },
    { key: "r",      hint: "R",   label: "Go to repay (dashboard)",  action: () => router.push("/dashboard") },
    { key: "?",      hint: "?",   label: "Show keyboard shortcuts",  action: toggleHelp },
    { key: "Escape", hint: "Esc", label: "Close modal / cancel",     action: closeHelp },
  ], [router, toggleHelp, closeHelp]);

  useKeyboardShortcuts(shortcuts);

  const contextValue = useMemo(() => ({ openShortcutsHelp: openHelp }), [openHelp]);

  return (
    <ShortcutsHelpContext.Provider value={contextValue}>
      {children}
      {helpOpen && (
        <ShortcutsHelpModal shortcuts={shortcuts} onClose={closeHelp} />
      )}
    </ShortcutsHelpContext.Provider>
  );
}
