"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import WalletConnect from "@/components/WalletConnect";
import CollateralCard from "@/components/CollateralCard";
import TransactionHistory from "@/components/TransactionHistory";
import SkeletonHealthDashboard from "@/components/SkeletonHealthDashboard";
import SkeletonLoanCard from "@/components/SkeletonLoanCard";
import HelpMenu from "@/components/HelpMenu";
import OnboardingModal from "@/components/OnboardingModal";
import LiquidationWarningModal from "@/components/LiquidationWarningModal";
import { useHealthFactor } from "@/hooks/useHealthFactor";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useLoans } from "@/hooks/useLoans";
import { useLiquidationWarning } from "@/hooks/useLiquidationWarning";

// ── Lazy-loaded heavy components ─────────────────────────────────────────────

const HealthGauge = dynamic(() => import("@/components/HealthGauge"), {
  ssr: false,
  loading: () => <SkeletonHealthDashboard />,
});

const LoanRepaymentCalculator = dynamic(
  () => import("@/components/LoanRepaymentCalculator"),
  {
    ssr: false,
    loading: () => <SkeletonLoanCard />,
  },
);

const RepayPanel = dynamic(() => import("@/components/RepayPanel"), {
  ssr: false,
  loading: () => <SkeletonLoanCard />,
});

// ─────────────────────────────────────────────────────────────────────────────

interface LoanWithHealth {
  id: string;
  health_factor?: number | null;
  status?: string;
}

export default function DashboardClient() {
  const router = useRouter();
  const [wallet, setWallet] = useState<string | null>(null);
  const [loanId, setLoanId] = useState("");
  const { showOnboarding, openOnboarding, closeOnboarding } = useOnboarding();
  const { healthFactor, loading: isHealthLoading, refresh: refreshHealth } = useHealthFactor(loanId);

  // Fetch loans to check for at-risk health factors
  const { loans } = useLoans({ refreshInterval: 60_000 });
  const loansWithHealth = loans as unknown as LoanWithHealth[];

  const { shouldShow: showLiquidationWarning, atRiskLoans, dismiss: dismissWarning } =
    useLiquidationWarning(loansWithHealth);

  function handleProceedToRepay(nextLoanId: string, _nextAmount: string) {
    setLoanId(nextLoanId);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brown">Dashboard</h1>
        <HelpMenu onShowOnboarding={openOnboarding} />
      </div>
      <OnboardingModal isOpen={showOnboarding} onClose={closeOnboarding} />

      {/* Auto-triggered liquidation warning */}
      {showLiquidationWarning && (
        <LiquidationWarningModal
          atRiskLoans={atRiskLoans}
          onDismiss={dismissWarning}
        />
      )}

      <WalletConnect onConnect={setWallet} />
      {wallet && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <CollateralCard walletAddress={wallet} />
            <LoanRepaymentCalculator
              onProceed={handleProceedToRepay}
              onApplyForLoan={() => router.push("/borrow")}
            />
          </div>
          <div className="mt-4">
            <RepayPanel walletAddress={wallet} />
          </div>
          <div className="mt-4">
            <TransactionHistory walletAddress={wallet} />
          </div>
          {isHealthLoading ? (
            <SkeletonHealthDashboard />
          ) : (
            <div className="mt-8 rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-3 text-xl font-semibold text-brown">
                <GlossaryTerm termKey="healthFactor" />
              </h2>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-lg border border-brown/30 px-3 py-2"
                  placeholder="Loan ID"
                  value={loanId}
                  onChange={(e) => setLoanId(e.target.value)}
                />
                <button
                  onClick={refreshHealth}
                  className="rounded-lg bg-gold px-4 py-2 font-semibold text-brown transition hover:bg-gold/80"
                >
                  Check
                </button>
              </div>
              {healthFactor !== null && <HealthGauge value={healthFactor} />}
            </div>
          )}
        </>
      )}
    </main>
  );
}
