"use client";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useKeyboardShortcuts, Shortcut } from "@/hooks/useKeyboardShortcuts";
import ShortcutsHelpModal from "@/components/ShortcutsHelpModal";
import { useWallet } from "@/hooks/useWallet";

export default function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const { address, connect } = useWallet();

  const toggleHelp = useCallback(() => setHelpOpen((v) => !v), []);

  const shortcuts: Shortcut[] = useMemo(() => [
    { key: "?",      hint: "?",       label: "Show keyboard shortcuts",  action: toggleHelp },
    { key: "h",      hint: "H",       label: "Go to Home",               action: () => router.push("/") },
    { key: "d",      hint: "D",       label: "Go to Dashboard",          action: () => router.push("/dashboard") },
    { key: "b",      hint: "B",       label: "Borrow (get a loan)",      action: () => router.push("/borrow") },
    { key: "r",      hint: "R",       label: "Go to repay (dashboard)",  action: () => router.push("/dashboard") },
    { key: "Escape", hint: "Esc",     label: "Close modal / cancel",     action: () => setHelpOpen(false) },
    {
      key: "C",
      shift: true,
      hint: "Shift+C",
      label: "Connect wallet",
      action: () => { if (!address) connect(); },
    },
  ], [router, toggleHelp, address, connect]);

  useKeyboardShortcuts(shortcuts);

  return (
    <>
      {children}
      {helpOpen && (
        <ShortcutsHelpModal shortcuts={shortcuts} onClose={() => setHelpOpen(false)} />
      )}
    </>
  );
}
