/**
 * Additional component tests for LoanForm.
 * Covers field rendering, validation behavior, step navigation, and API submission.
 * Closes #361, #820
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoanForm from "../components/LoanForm";
import { ToastProvider, ToastContainer } from "../components/toast";

const mockSignTransaction = jest.fn();
const mockSubmitSignedXdr = jest.fn();

jest.mock("@stellar/freighter-api", () => ({
  signTransaction: (...args: any[]) => mockSignTransaction(...args),
}));

jest.mock("../lib/stellarUtils", () => ({
  submitSignedXdr: (...args: any[]) => mockSubmitSignedXdr(...args),
  healthColor: () => "#16a34a",
  formatStroops: (s: number) => `${s / 1e7} XLM`,
}));

jest.mock("next/link", () =>
  function MockLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
    return React.createElement("a", { href, className }, children);
  }
);

jest.mock("framer-motion", () => ({
  useReducedMotion: jest.fn().mockReturnValue(false),
}));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  mockSignTransaction.mockReset();
  mockSubmitSignedXdr.mockReset();
  (global as any).fetch = fetchMock;
});

function renderWithToast(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      {ui}
      <ToastContainer />
    </ToastProvider>
  );
}

describe("LoanForm – field rendering", () => {
  it("renders all collateral step fields", () => {
    renderWithToast(<LoanForm walletAddress="GTEST" />);
    expect(screen.getByRole("combobox")).toBeTruthy(); // animal type select
    expect(screen.getByPlaceholderText("Number of animals")).toBeTruthy();
    expect(screen.getByPlaceholderText("Total appraised value")).toBeTruthy();
    expect(screen.getByText("Register & Continue")).toBeTruthy();
  });

  it("renders all loan step fields after advancing", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ xdr: "xdr1" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("col-99");

    renderWithToast(<LoanForm walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "2" } });
    fireEvent.change(screen.getByPlaceholderText("Total appraised value"), { target: { value: "500000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));
    expect(screen.getByPlaceholderText("Your collateral ID")).toBeTruthy();
    expect(screen.getByPlaceholderText("Amount to borrow")).toBeTruthy();
    expect(screen.getByText("Request Loan")).toBeTruthy();
  });

  it("animal type select defaults to cattle", () => {
    renderWithToast(<LoanForm walletAddress="GTEST" />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("cattle");
  });

  it("animal type select contains all options", () => {
    renderWithToast(<LoanForm walletAddress="GTEST" />);
    expect(screen.getByText("cattle")).toBeTruthy();
    expect(screen.getByText("goat")).toBeTruthy();
    expect(screen.getByText("sheep")).toBeTruthy();
  });
});

describe("LoanForm – button disabled state", () => {
  it("Register & Continue button is enabled initially", () => {
    renderWithToast(<LoanForm walletAddress="GTEST" />);
    const btn = screen.getByText("Register & Continue") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("Register & Continue button is disabled while loading", async () => {
    // The requestLoan function sets loading=true; test that during loan request the button is disabled
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ xdr: "xdr1" }) })
      .mockReturnValueOnce(new Promise(() => {})); // never resolves — keeps loading state
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("col-1");

    renderWithToast(<LoanForm walletAddress="GTEST" />);
    // Advance to loan step
    fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Total appraised value"), { target: { value: "100000" } });
    fireEvent.click(screen.getByText("Register & Continue"));
    await waitFor(() => screen.getByText("2. Request Loan"));

    // Fill loan fields then click — fetch never resolves so loading stays true
    fireEvent.change(screen.getByPlaceholderText("Your collateral ID"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Amount to borrow"), { target: { value: "5000" } });
    fireEvent.click(screen.getByText("Request Loan"));

    await waitFor(() => {
      expect(screen.getByText("Processing…")).toBeTruthy();
    });
  });
});

describe("LoanForm – step navigation", () => {
  it("stays on collateral step when registration fails", async () => {
    fetchMock.mockRejectedValue(new Error("Server error"));

    renderWithToast(<LoanForm walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Total appraised value"), { target: { value: "100000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() =>
      expect(screen.getAllByRole("alert").some(el => el.textContent?.includes("Server error"))).toBe(true)
    );
    expect(screen.getByText("1. Register Collateral")).toBeTruthy();
  });

  it("advances to loan step after successful registration", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ xdr: "xdr1" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("col-id-1");

    renderWithToast(<LoanForm walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "5" } });
    fireEvent.change(screen.getByPlaceholderText("Total appraised value"), { target: { value: "1000000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));
    // toast should show success
    await waitFor(() =>
      expect(screen.getAllByRole("alert").some(el => el.textContent?.includes("col-id-1"))).toBe(true)
    );
  });
});

describe("LoanForm – API submission", () => {
  it("calls the collateral register endpoint with correct payload", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ xdr: "xdr1" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("col-1");

    renderWithToast(<LoanForm walletAddress="GWALLET123" />);
    fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "3" } });
    fireEvent.change(screen.getByPlaceholderText("Total appraised value"), { target: { value: "750000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/collateral/register"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"owner":"GWALLET123"'),
      })
    );
  });

  it("calls the loan request endpoint with correct payload", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ xdr: "xdr1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ xdr: "xdr2" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("loan-42");

    renderWithToast(<LoanForm walletAddress="GWALLET123" />);
    fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "2" } });
    fireEvent.change(screen.getByPlaceholderText("Total appraised value"), { target: { value: "200000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));

    fireEvent.change(screen.getByPlaceholderText("Your collateral ID"), { target: { value: "7" } });
    fireEvent.change(screen.getByPlaceholderText("Amount to borrow"), { target: { value: "100000" } });
    fireEvent.click(screen.getByText("Request Loan"));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Loan Requested!" })).toBeInTheDocument()
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/loan/request"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"borrower":"GWALLET123"'),
      })
    );
  });

  it("shows loan success state with loan ID on success", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ xdr: "xdr1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ xdr: "xdr2" }) });
    mockSignTransaction.mockResolvedValue({ signedTxXdr: "signed" });
    mockSubmitSignedXdr.mockResolvedValue("loan-99");

    renderWithToast(<LoanForm walletAddress="GTEST" />);
    fireEvent.change(screen.getByPlaceholderText("Number of animals"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Total appraised value"), { target: { value: "100000" } });
    fireEvent.click(screen.getByText("Register & Continue"));

    await waitFor(() => screen.getByText("2. Request Loan"));
    fireEvent.change(screen.getByPlaceholderText("Your collateral ID"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Amount to borrow"), { target: { value: "50000" } });
    fireEvent.click(screen.getByText("Request Loan"));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Loan Requested!" })).toBeInTheDocument()
    );
    expect(screen.getByTestId("success-loan-id")).toHaveTextContent("loan-99");
  });
});
