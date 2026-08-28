import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StepConfirm from '@/components/wizard/steps/StepConfirm';
import { LoanWizardProvider } from '@/context/LoanWizardContext';
import { ToastContainer, ToastProvider } from '@/components/toast';

jest.mock('@/lib/freighterClient', () => ({
  signTransaction: jest.fn().mockResolvedValue({ signedTxXdr: 'signed-xdr' }),
}));
jest.mock('@/lib/stellarUtils', () => ({
  submitSignedXdr: jest.fn().mockResolvedValue('loan-123'),
}));

function renderStep() {
  return render(
    <ToastProvider>
      <LoanWizardProvider>
        <StepConfirm walletAddress="GABC123456789" />
        <ToastContainer />
      </LoanWizardProvider>
    </ToastProvider>
  );
}

describe('StepConfirm', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('disables submit and back buttons while the transaction is in flight', async () => {
    let resolveRequest!: (value: Response) => void;
    const request = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    jest.spyOn(global, 'fetch').mockReturnValue(request);

    renderStep();
    const submitButton = screen.getByRole('button', { name: /submit loan request/i });
    const backButton = screen.getByRole('button', { name: /back/i });

    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(backButton).toBeDisabled();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();

    resolveRequest(new Response(JSON.stringify({ xdr: 'unsigned-xdr' }), { status: 200 }));
    expect(await screen.findByText('Loan Disbursed!')).toBeInTheDocument();
  });
});