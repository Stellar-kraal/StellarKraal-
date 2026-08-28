import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StepConfirm from "@/components/wizard/steps/StepConfirm";

jest.mock("@/lib/freighterClient", () => ({
  signTransaction: jest.fn().mockResolvedValue({ signedTxXdr: "signed_xdr" }),
}));

jest.mock("@/lib/stellarUtils", () => ({
  submitSignedXdr: jest.fn().mockResolvedValue("loan-id-123"),
}));

jest.mock("@/lib/api", () => ({
  invalidateLoans: jest.fn(),
}));

const mockContext = {
  animalType: "cattle",
  count: 2,
  collateralId: "col-1",
  loanAmount: "10000000",
  loanTermDays: "30",
  error: null,
  setField: jest.fn(),
  prevStep: jest.fn(),
  reset: jest.fn(),
};

jest.mock("@/context/LoanWizardContext", () => ({
  useWizard: () => mockContext,
}));

describe("StepConfirm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("fetches fee estimate on mount and displays it", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ originationFee: 500000, totalAmount: 10500000, interestRate: 5 }),
    });

    render(<StepConfirm walletAddress="GABC" />);

    await waitFor(() => {
      expect(screen.getByText(/0\.5 XLM|0\.00005 XLM|Network Fee/)).toBeTruthy();
    });
  });

  it("shows error when fee estimation fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<StepConfirm walletAddress="GABC" />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to estimate fee/)).toBeTruthy();
    });
  });

  it("disables submit button when fee estimation errors", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    render(<StepConfirm walletAddress="GABC" />);

    await waitFor(() => {
      const button = screen.getByText(/Submit Loan Request/);
      expect(button.closest('button')).toBeDisabled();
    });
  });

  it("shows warning when fee exceeds 0.1 XLM", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ originationFee: 1500000, totalAmount: 11500000, interestRate: 15 }),
    });

    render(<StepConfirm walletAddress="GABC" />);

    await waitFor(() => {
      expect(screen.getByText(/exceeds 0\.1 XLM/)).toBeTruthy();
    });
  });
});
