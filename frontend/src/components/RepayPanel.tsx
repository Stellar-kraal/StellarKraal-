'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { signTransaction } from '@/lib/freighterClient';
import { submitSignedXdr, formatStroops } from '@/lib/stellarUtils';
import { colors } from '@/lib/design-tokens';
import Card from '@/components/Card';
import Skeleton from '@/components/Skeleton';
import Spinner from '@/components/Spinner';
import { useToast } from '@/components/toast';

interface Props {
  walletAddress: string;
  /** Pre-fill the loan ID field (e.g. from the calculator panel) */
  initialLoanId?: string;
  /** Pre-fill the amount field (stroops) */
  initialAmount?: string;
}

interface OutstandingBalance {
  outstanding: number; // stroops
  principal: number; // stroops
}

interface RepaymentPreview {
  remaining_balance: number;
  breakdown: {
    principal: number;
    interest: number;
    fees: number;
    remaining_balance: number;
  };
  fully_repaid: boolean;
  projected_health_factor_bps: number | null;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Format stroops as "X.XX XLM" without the trailing " XLM" from formatStroops */
function fmtXlm(stroops: number): string {
  return formatStroops(stroops);
}

export default function RepayPanel({
  walletAddress,
  initialLoanId = '',
  initialAmount = '',
}: Props) {
  const [loanId, setLoanId] = useState(initialLoanId);
  const [amount, setAmount] = useState(initialAmount);
  const [loading, setLoading] = useState(false);
  const [optimisticMsg, setOptimisticMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Outstanding balance state
  const [balance, setBalance] = useState<OutstandingBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Repayment preview state
  const [preview, setPreview] = useState<RepaymentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const toast = useToast();
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch outstanding balance ─────────────────────────────────────────────

  const fetchBalance = useCallback(async (id: string) => {
    if (!id) {
      setBalance(null);
      return;
    }
    setBalanceLoading(true);
    try {
      // Use repayment-preview with a nominal amount=1 to get outstanding balance.
      // This avoids an XDR decode of the raw contract result from GET /api/loan/:id.
      const res = await fetch(`${API}/api/loan/repayment-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan_id: parseInt(id, 10), amount: 1 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch outstanding balance');
      }
      const data = await res.json();
      const outstanding: number = data.breakdown?.remaining_balance ?? 0;
      const principal: number = data.breakdown?.principal ?? 0;
      // remaining_balance is outstanding — 1 stroop repaid; add back
      setBalance({
        outstanding: outstanding + 1,
        principal: principal,
      });
      // Default amount to full outstanding balance
      setAmount(String(outstanding + 1));
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loanId) {
      fetchBalance(loanId);
    } else {
      setBalance(null);
      setPreview(null);
      setAmount('');
    }
  }, [loanId, fetchBalance]);

  // ── Repayment preview (debounced) ─────────────────────────────────────────

  useEffect(() => {
    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }
    const parsedLoanId = parseInt(loanId, 10);
    const parsedAmount = parseInt(amount, 10);
    if (!loanId || !amount || isNaN(parsedLoanId) || isNaN(parsedAmount) || parsedAmount <= 0) {
      setPreview(null);
      return;
    }
    previewDebounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(`${API}/api/loan/repayment-preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loan_id: parsedLoanId, amount: parsedAmount }),
        });
        if (!res.ok) throw new Error('Preview failed');
        const data = await res.json();
        setPreview(data);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 400);

    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [loanId, amount]);

  // ── Submit repayment ──────────────────────────────────────────────────────

  async function repay() {
    setLoading(true);
    setStatusMsg(null);
    setOptimisticMsg('⏳ Repayment recorded — awaiting confirmation…');
    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const res = await fetch(`${API}/api/loan/repay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          borrower: walletAddress,
          loan_id: parseInt(loanId, 10),
          amount: parseInt(amount, 10),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Repayment failed');
      }
      const { xdr } = await res.json();
      const { signedTxXdr } = await signTransaction(xdr, {
        network: process.env.NEXT_PUBLIC_NETWORK || 'TESTNET',
      });
      await submitSignedXdr(signedTxXdr);

      setOptimisticMsg(null);
      setStatusMsg('✅ Repayment submitted!');
      toast.success('Repayment submitted successfully!');
      // Refresh the balance after a successful repayment
      await fetchBalance(loanId);
      setAmount('');
      setPreview(null);
    } catch (e: unknown) {
      setOptimisticMsg(null);
      const message = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setStatusMsg(`❌ ${message}`);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card
      className="mb-4"
      header={<h2 className={`text-xl font-semibold ${colors.text.primary}`}>Repay Loan</h2>}
    >
      <div className="space-y-4">
        {/* Loan ID input */}
        <input
          className={`w-full ${colors.form.input} rounded-lg px-3 py-2 ${colors.text.primary} ${colors.form.placeholder}`}
          placeholder="Loan ID"
          value={loanId}
          onChange={(e) => setLoanId(e.target.value)}
          type="number"
          aria-label="Loan ID"
        />

        {/* Outstanding balance */}
        {loanId && (
          <div
            className="rounded-xl border border-gold-400 bg-gold-50 px-4 py-3"
            aria-live="polite"
          >
            <p className="text-xs font-medium text-brown-500 uppercase tracking-wide mb-1">
              Outstanding Balance
            </p>
            {balanceLoading ? (
              <Skeleton className="h-7 w-40" />
            ) : balance ? (
              <p className="text-2xl font-bold text-brown-700" data-testid="outstanding-balance">
                {fmtXlm(balance.outstanding)}
              </p>
            ) : (
              <p className="text-sm text-brown-400">Enter a valid loan ID to see balance</p>
            )}
          </div>
        )}

        {/* Repayment amount input */}
        <div>
          <label
            className={`block text-sm font-medium ${colors.text.secondary} mb-1`}
            htmlFor="repay-amount"
          >
            Repayment Amount (stroops)
          </label>
          <input
            id="repay-amount"
            className={`w-full ${colors.form.input} rounded-lg px-3 py-2 ${colors.text.primary} ${colors.form.placeholder}`}
            placeholder="Amount (stroops)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            aria-label="Repayment amount in stroops"
          />
          {balance && (
            <button
              type="button"
              onClick={() => setAmount(String(balance.outstanding))}
              className="mt-1 text-xs text-gold-700 hover:text-gold-800 underline"
            >
              Use full outstanding balance
            </button>
          )}
        </div>

        {/* Repayment preview */}
        {(previewLoading || preview) && (
          <div
            className="rounded-xl border border-brown-200 bg-cream-200 px-4 py-3 space-y-1 text-sm"
            aria-label="Repayment preview"
            aria-live="polite"
          >
            <p className="font-semibold text-brown-700 text-xs uppercase tracking-wide mb-2">
              Repayment Preview
            </p>
            {previewLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : preview ? (
              <>
                <div className="flex justify-between text-brown-600">
                  <span>Principal paid</span>
                  <span>{fmtXlm(preview.breakdown.principal)}</span>
                </div>
                <div className="flex justify-between text-brown-600">
                  <span>Interest paid</span>
                  <span>{fmtXlm(preview.breakdown.interest)}</span>
                </div>
                {preview.breakdown.fees > 0 && (
                  <div className="flex justify-between text-brown-600">
                    <span>Fees</span>
                    <span>{fmtXlm(preview.breakdown.fees)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-brown-700 border-t border-brown-200 pt-1 mt-1">
                  <span>Remaining balance</span>
                  <span data-testid="remaining-balance">
                    {fmtXlm(preview.breakdown.remaining_balance)}
                  </span>
                </div>
                {preview.fully_repaid && (
                  <p className="text-success-dark text-xs font-medium mt-1">
                    ✅ This will fully repay your loan.
                  </p>
                )}
                {preview.projected_health_factor_bps !== null && (
                  <p className="text-xs text-brown-500 mt-1">
                    Projected health factor:{' '}
                    <span className="font-medium text-brown-700">
                      {(preview.projected_health_factor_bps / 10000).toFixed(2)}
                    </span>
                  </p>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Optimistic feedback */}
        {optimisticMsg && (
          <p className={`text-sm ${colors.text.muted}`} role="status" aria-live="polite">
            {optimisticMsg}
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={repay}
          disabled={loading || !loanId || !amount}
          className={`w-full ${colors.secondary.bg} ${colors.secondary.text} py-2.5 rounded-xl font-semibold ${colors.secondary.hover} transition ${colors.interactive.disabled} ${colors.interactive.focus} flex items-center justify-center gap-2`}
        >
          {loading ? (
            <>
              <Spinner />
              Processing…
            </>
          ) : (
            'Repay'
          )}
        </button>
      </div>

      {/* Final status message */}
      {statusMsg && (
        <p
          className={`text-sm mt-3 ${statusMsg.includes('❌') ? colors.status.error.text : colors.status.success.text}`}
          role="status"
          aria-live="polite"
        >
          {statusMsg}
        </p>
      )}
    </Card>
  );
}
