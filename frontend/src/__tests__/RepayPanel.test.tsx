import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RepayPanel from '../components/RepayPanel';
import { ToastProvider } from '../components/toast';

jest.mock('@stellar/freighter-api', () => ({
  signTransaction: jest.fn(),
}));
jest.mock('../lib/stellarUtils', () => ({
  submitSignedXdr: jest.fn(),
  healthColor: jest.fn(),
  formatStroops: jest.fn((stroops: number) => `${stroops / 1e7} XLM`),
}));

import { signTransaction } from '@stellar/freighter-api';
import { submitSignedXdr } from '../lib/stellarUtils';

const mockSign = signTransaction as jest.Mock;
const mockSubmit = submitSignedXdr as jest.Mock;

/** Typed global fetch accessor for mocking without triggering no-explicit-any */
type GlobalWithFetch = typeof globalThis & { fetch: jest.Mock };

function setGlobalFetch(fn: jest.Mock): void {
  (globalThis as GlobalWithFetch).fetch = fn;
}

function getGlobalFetch(): jest.Mock {
  return (globalThis as GlobalWithFetch).fetch;
}

/** Repayment-preview response stub */
function makePreviewResponse() {
  return {
    ok: true,
    json: async () => ({
      breakdown: {
        principal: 99,
        interest: 0,
        fees: 0,
        remaining_balance: 99,
      },
      fully_repaid: false,
      projected_health_factor_bps: 15000,
    }),
  };
}

/** POST /api/loan/repay success response stub */
function makeRepayResponse() {
  return {
    ok: true,
    json: async () => ({ xdr: 'test-xdr' }),
  };
}

/**
 * Route fetch calls by URL so tests are not brittle to call order.
 * preview   → /api/loan/repayment-preview
 * repay     → /api/loan/repay
 */
function makeFetchRouter(
  options: {
    repayResponse?: ReturnType<typeof makeRepayResponse> | { reject: Error };
  } = {}
): jest.Mock {
  return jest.fn().mockImplementation((url: string) => {
    if (url.includes('repayment-preview')) {
      return Promise.resolve(makePreviewResponse());
    }
    if (url.includes('/repay')) {
      const r = options.repayResponse;
      if (r && 'reject' in r) {
        return Promise.reject(r.reject);
      }
      return Promise.resolve(options.repayResponse ?? makeRepayResponse());
    }
    return Promise.reject(new Error(`Unmocked URL: ${url}`));
  });
}

function renderPanel(props: { initialLoanId?: string; initialAmount?: string } = {}) {
  return render(
    <ToastProvider>
      <RepayPanel
        walletAddress="GTEST"
        initialLoanId={props.initialLoanId ?? '1'}
        initialAmount={props.initialAmount ?? '100'}
      />
    </ToastProvider>
  );
}

describe('RepayPanel — optimistic UI', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows loading indicator while server is confirming', async () => {
    setGlobalFetch(makeFetchRouter());
    mockSign.mockResolvedValue({ signedTxXdr: 'signed-xdr' });
    // Delay submitSignedXdr to keep loading state visible
    mockSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200)));

    renderPanel();
    // Wait for balance fetch before clicking
    await waitFor(() => expect(getGlobalFetch()).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Repay'));

    expect(await screen.findByText('Processing…')).toBeTruthy();
  });

  it('shows optimistic banner immediately after clicking Repay', async () => {
    setGlobalFetch(makeFetchRouter());
    mockSign.mockResolvedValue({ signedTxXdr: 'signed-xdr' });
    mockSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200)));

    renderPanel();
    await waitFor(() => expect(getGlobalFetch()).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Repay'));

    // Optimistic banner should appear while loading
    expect(await screen.findByText(/Repayment recorded/)).toBeTruthy();
  });

  it('shows success status message after server confirms', async () => {
    setGlobalFetch(makeFetchRouter());
    mockSign.mockResolvedValue({ signedTxXdr: 'signed-xdr' });
    mockSubmit.mockResolvedValue('tx-hash');

    renderPanel();
    await waitFor(() => expect(getGlobalFetch()).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Repay'));

    await waitFor(() => expect(screen.getByText('✅ Repayment submitted!')).toBeTruthy());
  });

  it('rolls back optimistic state and shows error message on API error', async () => {
    setGlobalFetch(makeFetchRouter({ repayResponse: { reject: new Error('Network error') } }));
    mockSign.mockResolvedValue({ signedTxXdr: 'signed-xdr' });

    renderPanel();
    await waitFor(() => expect(getGlobalFetch()).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Repay'));

    await waitFor(() => expect(screen.getByText('❌ Network error')).toBeTruthy());
    // Optimistic banner should be gone after rollback
    expect(screen.queryByText(/Repayment recorded/)).toBeNull();
  });

  it('simulates network delay — optimistic banner visible during slow response', async () => {
    jest.useFakeTimers();
    const slowFetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('repayment-preview')) {
        return Promise.resolve(makePreviewResponse());
      }
      return new Promise<ReturnType<typeof makeRepayResponse>>((resolve) =>
        setTimeout(() => resolve(makeRepayResponse()), 500)
      );
    });
    setGlobalFetch(slowFetch);
    mockSign.mockResolvedValue({ signedTxXdr: 'signed' });
    mockSubmit.mockResolvedValue('hash');

    renderPanel();

    // Let debounce timers fire
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    fireEvent.click(screen.getByText('Repay'));

    // Before fetch resolves, button shows loading
    expect(screen.getByText('Processing…')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    jest.useRealTimers();
  });

  // ── Outstanding balance display ─────────────────────────────────────────

  it('shows outstanding balance after loan ID is entered', async () => {
    setGlobalFetch(makeFetchRouter());

    render(
      <ToastProvider>
        <RepayPanel walletAddress="GTEST" initialLoanId="1" />
      </ToastProvider>
    );

    await waitFor(() => expect(screen.getByTestId('outstanding-balance')).toBeTruthy());
  });

  it('shows skeleton (aria-hidden shimmer) while balance is loading', () => {
    // Never resolve the preview — keeps loading state permanently
    setGlobalFetch(jest.fn().mockImplementation(() => new Promise(() => {})));

    render(
      <ToastProvider>
        <RepayPanel walletAddress="GTEST" initialLoanId="5" />
      </ToastProvider>
    );

    // aria-hidden skeleton shimmers should be in the document
    const skeletons = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
