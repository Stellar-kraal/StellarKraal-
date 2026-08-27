'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Skeleton from '@/components/Skeleton';
import { Button } from '@/components/ui';
import WalletConnect from '@/components/WalletConnect';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface LoanDetail {
  id: string;
  borrower: string;
  collateral_id: string;
  amount: number;
  interest_rate?: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  dueDate?: string;
}

interface CollateralInfo {
  id: string;
  animal_type: string;
  count: number;
  appraised_value: number;
}

function LoanDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading loan details">
      <Skeleton className="h-8 w-48" />
      <Card>
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </Card>
      <Card>
        <Skeleton className="h-6 w-40 mb-3" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </Card>
    </div>
  );
}

/**
 * Generates a print-friendly HTML document for the loan and opens the browser
 * print dialog. No external dependencies — uses window.print() / a hidden iframe.
 */
function printLoanPdf(loan: LoanDetail, collateral: CollateralInfo | null) {
  const xlmAmount = (loan.amount / 1e7).toFixed(4);
  const collateralValue = collateral ? (collateral.appraised_value / 1e7).toFixed(4) : 'N/A';
  const interestRate = loan.interest_rate != null ? `${loan.interest_rate}%` : 'N/A';
  const issued = new Date(loan.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const due = loan.dueDate
    ? new Date(loan.dueDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not specified';
  const updated = loan.updatedAt
    ? new Date(loan.updatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : issued;

  const collateralRows = collateral
    ? `<tr>
        <td>${collateral.id}</td>
        <td>${collateral.animal_type.charAt(0).toUpperCase() + collateral.animal_type.slice(1)}</td>
        <td>${collateral.count}</td>
        <td>${collateralValue} XLM</td>
      </tr>`
    : `<tr><td colspan="4">No collateral information available</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Loan Agreement — #${loan.id}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 13px;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
      max-width: 760px;
      margin: 0 auto;
    }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin: 24px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    .subtitle { color: #555; font-size: 12px; margin-bottom: 24px; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #e8f5e9;
      color: #2e7d32;
    }
    .badge.repaid { background: #e3f2fd; color: #1565c0; }
    .badge.liquidated { background: #fce4ec; color: #c62828; }
    .badge.pending { background: #fff8e1; color: #f57f17; }
    dl {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 8px 16px;
      margin: 8px 0;
    }
    dt { font-weight: bold; color: #444; }
    dd { color: #1a1a1a; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { text-align: left; padding: 8px 12px; border: 1px solid #ddd; font-size: 12px; }
    th { background: #f5f5f5; font-weight: bold; }
    tr:nth-child(even) td { background: #fafafa; }
    footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #ccc;
      font-size: 11px;
      color: #888;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <h1>🐄 StellarKraal — Loan Agreement</h1>
  <p class="subtitle">Generated on ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>

  <h2>Loan Summary</h2>
  <dl>
    <dt>Loan ID</dt>      <dd>#${loan.id}</dd>
    <dt>Status</dt>       <dd><span class="badge ${loan.status}">${loan.status}</span></dd>
    <dt>Borrower</dt>     <dd style="font-family: monospace; font-size: 11px;">${loan.borrower}</dd>
    <dt>Amount</dt>       <dd><strong>${xlmAmount} XLM</strong></dd>
    <dt>Interest Rate</dt><dd>${interestRate}</dd>
    <dt>Issued</dt>       <dd>${issued}</dd>
    <dt>Last Updated</dt> <dd>${updated}</dd>
    <dt>Due Date</dt>     <dd>${due}</dd>
  </dl>

  <h2>Collateral</h2>
  <table>
    <thead>
      <tr>
        <th>Collateral ID</th>
        <th>Animal Type</th>
        <th>Count</th>
        <th>Appraised Value</th>
      </tr>
    </thead>
    <tbody>
      ${collateralRows}
    </tbody>
  </table>

  <footer>
    This document is generated for informational purposes only. It does not constitute
    a legally binding contract. All on-chain transactions are final once confirmed on
    the Stellar network.
  </footer>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.left = '-9999px';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    // Fallback: open in a new tab
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Give the browser time to render before printing
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Clean up after the print dialog is closed
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 300);
}

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.id as string;

  const [wallet, setWallet] = useState<string | null>(null);
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [collateral, setCollateral] = useState<CollateralInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feature-detect window.print support
  const printSupported = typeof window !== 'undefined' && typeof window.print === 'function';

  const fetchLoan = useCallback(async () => {
    if (!loanId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/loans/${loanId}`);
      if (!res.ok) throw new Error('Failed to fetch loan details');
      const data = await res.json();
      const loanData: LoanDetail = data.loan ?? data;
      setLoan(loanData);

      // Fetch collateral info if we have a collateral_id
      if (loanData.collateral_id) {
        try {
          const cRes = await fetch(`${API}/api/collateral/${loanData.collateral_id}`);
          if (cRes.ok) {
            const cData = await cRes.json();
            setCollateral(cData.collateral ?? cData);
          }
        } catch {
          // Collateral info is supplementary — don't fail the whole page
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    fetchLoan();
  }, [fetchLoan]);

  if (!wallet) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-brown-700 mb-6">Loan Details</h1>
        <WalletConnect onConnect={setWallet} />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <LoanDetailSkeleton />
      </main>
    );
  }

  if (error || !loan) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <button
          onClick={() => router.back()}
          className="text-brown-600 hover:text-brown-700 mb-6 font-semibold"
        >
          ← Back
        </button>
        <Card variant="warning">
          <p className="text-error-dark">{error || 'Loan not found'}</p>
        </Card>
      </main>
    );
  }

  const xlmAmount = (loan.amount / 1e7).toFixed(4);
  const issued = new Date(loan.createdAt).toLocaleDateString();
  const due = loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '—';
  const interestRate = loan.interest_rate != null ? `${loan.interest_rate}%` : '—';

  const statusColors: Record<string, string> = {
    active: 'bg-success-light text-success-dark',
    repaid: 'bg-blue-100 text-blue-800',
    liquidated: 'bg-error-light text-error-dark',
    pending: 'bg-brown-100 text-brown-700',
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Back navigation */}
      <button
        onClick={() => router.back()}
        className="text-brown-600 hover:text-brown-700 mb-6 font-semibold"
      >
        ← Back to Loans
      </button>

      {/* Page heading + PDF button */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-brown-700">Loan #{loan.id}</h1>

        {printSupported ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => printLoanPdf(loan, collateral)}
            aria-label="Download loan agreement as PDF"
          >
            📄 Download PDF
          </Button>
        ) : (
          <span title="Your browser does not support printing">
            <Button variant="secondary" size="sm" disabled aria-disabled="true">
              📄 Download PDF
            </Button>
          </span>
        )}
      </div>

      {/* Status badge */}
      <div className="mb-4">
        <span
          className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${
            statusColors[loan.status] ?? 'bg-brown-100 text-brown-700'
          }`}
        >
          {loan.status}
        </span>
      </div>

      {/* Loan details card */}
      <Card className="mb-4">
        <h2 className="text-lg font-semibold text-brown-700 mb-4">Loan Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-brown-500 mb-0.5">Loan Amount</dt>
            <dd className="font-bold text-2xl text-brown-700">{xlmAmount} XLM</dd>
          </div>
          <div>
            <dt className="text-brown-500 mb-0.5">Interest Rate</dt>
            <dd className="font-semibold text-brown-700">{interestRate}</dd>
          </div>
          <div>
            <dt className="text-brown-500 mb-0.5">Issued</dt>
            <dd className="font-semibold text-brown-700">{issued}</dd>
          </div>
          <div>
            <dt className="text-brown-500 mb-0.5">Due Date</dt>
            <dd className="font-semibold text-brown-700">{due}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-brown-500 mb-0.5">Borrower</dt>
            <dd className="font-mono text-xs text-brown-600 break-all">{loan.borrower}</dd>
          </div>
        </dl>
      </Card>

      {/* Collateral card */}
      <Card header={<h2 className="text-lg font-semibold text-brown-700">Collateral</h2>}>
        {collateral ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-brown-500 mb-0.5">Animal Type</dt>
              <dd className="font-semibold text-brown-700 capitalize">{collateral.animal_type}</dd>
            </div>
            <div>
              <dt className="text-brown-500 mb-0.5">Count</dt>
              <dd className="font-semibold text-brown-700">{collateral.count}</dd>
            </div>
            <div>
              <dt className="text-brown-500 mb-0.5">Appraised Value</dt>
              <dd className="font-semibold text-brown-700">
                {(collateral.appraised_value / 1e7).toFixed(4)} XLM
              </dd>
            </div>
            <div>
              <dt className="text-brown-500 mb-0.5">Collateral ID</dt>
              <dd className="font-mono text-xs text-brown-600 break-all">{collateral.id}</dd>
            </div>
          </dl>
        ) : loan.collateral_id ? (
          <p className="text-brown-500 text-sm">
            Collateral ID: <span className="font-mono text-xs">{loan.collateral_id}</span>
          </p>
        ) : (
          <p className="text-brown-500 text-sm">No collateral information available.</p>
        )}
      </Card>
    </main>
  );
}
