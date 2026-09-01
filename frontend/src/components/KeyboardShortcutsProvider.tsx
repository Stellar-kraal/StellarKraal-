"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * KeyboardShortcutsProvider — #531, #1098
 *
 * Registers global keyboard shortcuts and renders the help modal.
 *
 * Toggle behaviour (changed from hold-500ms to instant toggle):
 *   Press '?' once → modal opens.
 *   Press '?' again → modal closes.
 *   Press Escape  → modal closes.
 *   Shortcuts are suppressed when focus is in any input/textarea/select.
 *
 * Shortcuts registered:
 *   h        → Go to Home
 *   d        → Go to Dashboard
 *   b        → Borrow (get a loan)
 *   r        → Go to repay (dashboard)
 *   n        → New loan request (/borrow)          ← #1098
 *   g then d → Go to Dashboard (chord)             ← #1098
 *   g then c → Go to Collateral (chord)            ← #1098
 *   Escape   → Close modal / cancel
 */
export default function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const toggleHelp = useCallback(() => setHelpOpen((v) => !v), []);

  // Chord state: tracks whether the first key of a multi-key sequence was pressed
  const chordRef = useRef<string | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shortcuts: Shortcut[] = useMemo(() => [
    { key: "h",      hint: "H",         label: "Go to Home",                action: () => router.push("/") },
    { key: "d",      hint: "D",         label: "Go to Dashboard",           action: () => router.push("/dashboard") },
    { key: "b",      hint: "B",         label: "Borrow (get a loan)",       action: () => router.push("/borrow") },
    { key: "r",      hint: "R",         label: "Go to repay (dashboard)",   action: () => router.push("/dashboard") },
    { key: "n",      hint: "N",         label: "New loan request",          action: () => router.push("/borrow") },
    { key: "g d",    hint: "G then D",  label: "Go to Dashboard (chord)",   action: () => router.push("/dashboard") },
    { key: "g c",    hint: "G then C",  label: "Go to Collateral (chord)",  action: () => router.push("/collateral") },
    { key: "Escape", hint: "Esc",       label: "Close modal / cancel",      action: closeHelp },
  ], [router, closeHelp]);

  // Base shortcuts exclude chord shortcuts — chords are handled separately below
  const baseShortcuts = useMemo(
    () => shortcuts.filter((s) => !s.key.includes(" ")),
    [shortcuts]
  );

  useKeyboardShortcuts(baseShortcuts);

  // '?' instant toggle — distinct from base shortcuts to avoid isInputFocused() guard
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Close modal on Escape (this fires even when dialog is open since
      // useKeyboardShortcuts suppresses keys when a dialog is present)
      if (e.key === "Escape") {
        setHelpOpen(false);
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;

        e.preventDefault();
        toggleHelp();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleHelp]);

  // Chord shortcuts: g+d and g+c
  useEffect(() => {
    function handleChord(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      // Suppress chords when modal (dialog) is open
      if (document.querySelector('[role="dialog"]')) return;

      if (chordRef.current === "g") {
        // Cancel the chord timer
        if (chordTimerRef.current) {
          clearTimeout(chordTimerRef.current);
          chordTimerRef.current = null;
        }
        chordRef.current = null;

        if (e.key === "d") {
          e.preventDefault();
          router.push("/dashboard");
        } else if (e.key === "c") {
          e.preventDefault();
          router.push("/collateral");
        }
        return;
      }

      if (e.key === "g") {
        chordRef.current = "g";
        // Auto-cancel chord after 1500 ms so 'g' alone doesn't stay pending forever
        chordTimerRef.current = setTimeout(() => {
          chordRef.current = null;
        }, 1500);
      }
    }

    window.addEventListener("keydown", handleChord);
    return () => {
      window.removeEventListener("keydown", handleChord);
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    };
  }, [router]);

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
