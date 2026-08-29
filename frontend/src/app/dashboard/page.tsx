'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GlossaryTerm } from '@/components/GlossaryTerm';
import WalletConnect from '@/components/WalletConnect';
import CollateralCard from '@/components/CollateralCard';
import RepayPanel from '@/components/RepayPanel';
import HealthGauge from '@/components/HealthGauge';
import LoanRepaymentCalculator from '@/components/LoanRepaymentCalculator';
import TransactionHistory from '@/components/TransactionHistory';
import SkeletonHealthDashboard from '@/components/SkeletonHealthDashboard';
import ErrorState from '@/components/ErrorState';
import HelpMenu from '@/components/HelpMenu';
import OnboardingModal from '@/components/OnboardingModal';
import Card from '@/components/Card';
import { useHealthFactor } from '@/hooks/useHealthFactor';
import { useOnboarding } from '@/hooks/useOnboarding';

/** Threshold below which the health factor is considered low-risk worthy of announcement. */
const ANNOUNCEMENT_THRESHOLD = 15000; // 1.5x in basis-point units (10 000 = 1.0x)

export default function Dashboard() {
  const router = useRouter();
  const [wallet, setWallet] = useState<string | null>(null);
  const [loanId, setLoanId] = useState('');
  const [activeLoanId, setActiveLoanId] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const prevHealthFactor = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('mockWallet=true')) {
      setWallet('GBXXXXXXMOCKWALLETADDRESSXXXXXX');
    }
  }, []);

  const { showOnboarding, openOnboarding, closeOnboarding } = useOnboarding();
  const {
    healthFactor,
    loading: isHealthLoading,
    error: healthError,
    refresh: refreshHealth,
  } = useHealthFactor(activeLoanId);

  // Announce significant health factor changes to screen readers
  useEffect(() => {
    if (healthFactor === null) return;

    // Convert basis-point units to human-readable ratio (10 000 bp = 1.0x)
    const ratio = (healthFactor / 10_000).toFixed(2);

    if (healthFactor < ANNOUNCEMENT_THRESHOLD) {
      setAnnouncement(`Health factor dropped to ${ratio}`);
    } else if (
      prevHealthFactor.current !== null &&
      prevHealthFactor.current < ANNOUNCEMENT_THRESHOLD &&
      healthFactor >= ANNOUNCEMENT_THRESHOLD
    ) {
      // Recovered above threshold — also worth announcing
      setAnnouncement(`Health factor recovered to ${ratio}`);
    }

    prevHealthFactor.current = healthFactor;
  }, [healthFactor]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleProceedToRepay(nextLoanId: string, _amount: string) {
    setLoanId(nextLoanId);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* Visually-hidden aria-live region announces health factor changes to screen readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="health-factor-announcement"
      >
        {announcement}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-brown">Dashboard</h1>
        <HelpMenu onShowOnboarding={openOnboarding} />
      </div>

      <OnboardingModal isOpen={showOnboarding} onClose={closeOnboarding} />

      <WalletConnect onConnect={setWallet} />

      {wallet && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <CollateralCard walletAddress={wallet} />
            <LoanRepaymentCalculator
              onProceed={handleProceedToRepay}
              onApplyForLoan={() => router.push('/borrow')}
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
            <Card
              className="mt-8"
              header={
                <h2 className="text-xl font-semibold text-brown-700">
                  <GlossaryTerm termKey="healthFactor" />
                </h2>
              }
            >
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-lg border border-brown-300 px-3 py-2"
                  placeholder="Loan ID"
                  value={loanId}
                  onChange={(e) => setLoanId(e.target.value)}
                />
                <button
                  onClick={() => {
                    setActiveLoanId(loanId);
                    refreshHealth();
                  }}
                  className="rounded-lg bg-gold-500 px-4 py-2 font-semibold text-cream-50 transition hover:bg-gold-600 flex items-center gap-2"
                >
                  Check
                </button>
              </div>
              {healthError && (
                <div className="mt-4">
                  <ErrorState message={healthError} onRetry={refreshHealth} />
                </div>
              )}
              {healthFactor !== null && !healthError && <HealthGauge value={healthFactor} />}
            </Card>
          )}
        </>
      )}
    </main>
  );
}
