"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GlossaryTerm } from "@/components/GlossaryTerm";
import WalletConnect from "@/components/WalletConnect";
import CollateralCard from "@/components/CollateralCard";
import RepayPanel from "@/components/RepayPanel";
import HealthGauge from "@/components/HealthGauge";
import LoanRepaymentCalculator from "@/components/LoanRepaymentCalculator";
import TransactionHistory from "@/components/TransactionHistory";
import SkeletonHealthDashboard from "@/components/SkeletonHealthDashboard";
import HelpMenu from "@/components/HelpMenu";
import OnboardingModal from "@/components/OnboardingModal";
import { useHealthFactor } from "@/hooks/useHealthFactor";
import { useOnboarding } from "@/hooks/useOnboarding";

type TabName = "overview" | "loans" | "collateral" | "transactions";

const TABS: { id: TabName; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "loans", label: "Loans" },
  { id: "collateral", label: "Collateral" },
  { id: "transactions", label: "Transactions" },
];

export default function DashboardClient() {
  const router = useRouter();
  const [wallet, setWallet] = useState<string | null>(null);
  const [loanId, setLoanId] = useState("");
  const [activeTab, setActiveTab] = useState<TabName>("overview");
  const { showOnboarding, openOnboarding, closeOnboarding } = useOnboarding();
  const { healthFactor, loading: isHealthLoading, refresh: refreshHealth } = useHealthFactor(loanId);

  // Read hash from URL on mount and when it changes
  useEffect(() => {
    const hash = window.location.hash.slice(1).toLowerCase() as TabName;
    if (["overview", "loans", "collateral", "transactions"].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  // Update URL hash when active tab changes
  useEffect(() => {
    window.location.hash = `#${activeTab}`;
  }, [activeTab]);

  const handleTabChange = (tabId: TabName) => {
    setActiveTab(tabId);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % TABS.length;
      e.preventDefault();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
      e.preventDefault();
    } else {
      return;
    }
    setActiveTab(TABS[nextIndex].id);
  };

  function handleProceedToRepay(nextLoanId: string, _nextAmount: string) {
    setLoanId(nextLoanId);
    setActiveTab("loans");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brown">Dashboard</h1>
        <HelpMenu onShowOnboarding={openOnboarding} />
      </div>
      <OnboardingModal isOpen={showOnboarding} onClose={closeOnboarding} />
      <WalletConnect onConnect={setWallet} />
      {wallet && (
        <>
          {/* Tab Navigation */}
          <div className="mb-6 border-b border-brown/10">
            <div
              role="tablist"
              className="flex gap-1"
              aria-label="Dashboard sections"
            >
              {TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  id={`${tab.id}-tab`}
                  onClick={() => handleTabChange(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? "border-brown text-brown"
                      : "border-transparent text-brown/60 hover:text-brown"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content - Overview */}
          {activeTab === "overview" && (
            <div
              role="tabpanel"
              id="overview-panel"
              aria-labelledby="overview-tab"
              className="space-y-4"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <CollateralCard walletAddress={wallet} />
                <LoanRepaymentCalculator
                  onProceed={handleProceedToRepay}
                  onApplyForLoan={() => router.push("/borrow")}
                />
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
            </div>
          )}

          {/* Tab Content - Loans */}
          {activeTab === "loans" && (
            <div
              role="tabpanel"
              id="loans-panel"
              aria-labelledby="loans-tab"
              className="space-y-4"
            >
              <div className="mt-4">
                <RepayPanel walletAddress={wallet} />
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
            </div>
          )}

          {/* Tab Content - Collateral */}
          {activeTab === "collateral" && (
            <div
              role="tabpanel"
              id="collateral-panel"
              aria-labelledby="collateral-tab"
            >
              <CollateralCard walletAddress={wallet} />
            </div>
          )}

          {/* Tab Content - Transactions */}
          {activeTab === "transactions" && (
            <div
              role="tabpanel"
              id="transactions-panel"
              aria-labelledby="transactions-tab"
            >
              <div className="mt-4">
                <TransactionHistory walletAddress={wallet} />
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
