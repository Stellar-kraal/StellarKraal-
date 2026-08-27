import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RepayPanel from "../components/RepayPanel";
import { ToastProvider, ToastContainer } from "../components/toast";

jest.mock("@stellar/freighter-api", () => ({
  signTransaction: jest.fn(),
}));
jest.mock("../lib/stellarUtils", () => ({
  submitSignedXdr: jest.fn(),
  healthColor: jest.fn(),
  formatStroops: jest.fn(),
}));

import { signTransaction } from "@stellar/freighter-api";
import { submitSignedXdr } from "../lib/stellarUtils";

const mockSign = signTransaction as jest.Mock;
const mockSubmit = submitSignedXdr as jest.Mock;

function renderPanel() {
  return render(
    <ToastProvider>
      <RepayPanel walletAddress="GTEST" />
      <ToastContainer />
    </ToastProvider>
  );
}

describe("RepayPanel", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders loan ID and amount inputs and repay button", () => {
    renderPanel();
    expect(screen.getByPlaceholderText("Loan ID")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Amount (stroops)")).toBeInTheDocument();
    expect(screen.getByText("Repay")).toBeInTheDocument();
  });

  it("shows loading indicator while server is confirming", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ xdr: "test-xdr" }),
    });
    mockSign.mockResolvedValue({ signedTxXdr: "signed-xdr" });
    mockSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 200))
    );

    renderPanel();
    fireEvent.change(screen.getByPlaceholderText("Loan ID"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Amount (stroops)"), { target: { value: "100" } });
    fireEvent.click(screen.getByText("Repay"));

    expect(await screen.findByText("Processing…")).toBeTruthy();
  });

  it("shows success toast after server confirms", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ xdr: "test-xdr" }),
    });
    mockSign.mockResolvedValue({ signedTxXdr: "signed-xdr" });
    mockSubmit.mockResolvedValue("tx-hash");

    renderPanel();
    fireEvent.change(screen.getByPlaceholderText("Loan ID"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Amount (stroops)"), { target: { value: "100" } });
    fireEvent.click(screen.getByText("Repay"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Repayment submitted successfully!")
    );
  });

  it("shows a connection-failed toast on network error (#532)", async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    renderPanel();
    fireEvent.change(screen.getByPlaceholderText("Loan ID"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Amount (stroops)"), { target: { value: "100" } });
    fireEvent.click(screen.getByText("Repay"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Connection failed")
    );
  });

  it("shows the API's own message in a warning toast on a 4xx response (#532)", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "amount exceeds outstanding balance" }),
    });

    renderPanel();
    fireEvent.change(screen.getByPlaceholderText("Loan ID"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Amount (stroops)"), { target: { value: "100" } });
    fireEvent.click(screen.getByText("Repay"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("amount exceeds outstanding balance")
    );
  });

  it("shows a generic 'Server error' toast on a 5xx response (#532)", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "internal boom" }),
    });

    renderPanel();
    fireEvent.change(screen.getByPlaceholderText("Loan ID"), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText("Amount (stroops)"), { target: { value: "100" } });
    fireEvent.click(screen.getByText("Repay"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Server error")
    );
  });

  it("clears inputs after successful repayment", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ xdr: "test-xdr" }),
    });
    mockSign.mockResolvedValue({ signedTxXdr: "signed-xdr" });
    mockSubmit.mockResolvedValue("tx-hash");

    renderPanel();
    const loanIdInput = screen.getByPlaceholderText("Loan ID") as HTMLInputElement;
    const amountInput = screen.getByPlaceholderText("Amount (stroops)") as HTMLInputElement;
    fireEvent.change(loanIdInput, { target: { value: "1" } });
    fireEvent.change(amountInput, { target: { value: "100" } });
    fireEvent.click(screen.getByText("Repay"));

    await waitFor(() => expect(loanIdInput.value).toBe(""));
    expect(amountInput.value).toBe("");
  });
});
