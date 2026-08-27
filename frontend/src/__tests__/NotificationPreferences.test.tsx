import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import NotificationPreferences from "../components/NotificationPreferences";

const mockSuccess = jest.fn();
const mockError = jest.fn();

jest.mock("../components/toast", () => ({
  useToast: () => ({ success: mockSuccess, error: mockError }),
}));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  mockSuccess.mockReset();
  mockError.mockReset();
  (global as any).fetch = fetchMock;
});

const defaultSettings = {
  healthFactorAlerts: true,
  repaymentReminders: true,
  liquidationWarnings: true,
};

describe("NotificationPreferences", () => {
  it("renders all three toggles after loading", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => defaultSettings });
    await act(async () => {
      render(<NotificationPreferences wallet="GTEST" />);
    });
    expect(screen.getByLabelText("Health factor alerts")).toBeTruthy();
    expect(screen.getByLabelText("Repayment reminders")).toBeTruthy();
    expect(screen.getByLabelText("Liquidation warnings")).toBeTruthy();
  });

  it("shows checked state for enabled toggles", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => defaultSettings });
    await act(async () => {
      render(<NotificationPreferences wallet="GTEST" />);
    });
    const toggle = screen.getByLabelText("Health factor alerts");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("calls PATCH and shows success toast on toggle", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => defaultSettings })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...defaultSettings, healthFactorAlerts: false }),
      });

    await act(async () => {
      render(<NotificationPreferences wallet="GTEST" />);
    });

    const toggle = screen.getByLabelText("Health factor alerts");
    await act(async () => {
      fireEvent.click(toggle);
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, url, opts] = fetchMock.mock.calls[1];
    expect(fetchMock.mock.calls[1][0]).toContain("/profile/settings");
    expect(mockSuccess).toHaveBeenCalledWith("Notification preference saved.");
  });

  it("shows a 'Server error' toast and reverts on a 5xx PATCH failure (#532)", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => defaultSettings })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    await act(async () => {
      render(<NotificationPreferences wallet="GTEST" />);
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Health factor alerts"));
    });

    await waitFor(() => expect(mockError).toHaveBeenCalled());
    expect(mockError).toHaveBeenCalledWith("Server error");
    // Reverted: toggle should be back to true
    expect(screen.getByLabelText("Health factor alerts").getAttribute("aria-checked")).toBe("true");
  });

  it("shows the API's own message in the toast on a 4xx PATCH failure (#532)", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => defaultSettings })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "wallet is required" }),
      });

    await act(async () => {
      render(<NotificationPreferences wallet="GTEST" />);
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Health factor alerts"));
    });

    await waitFor(() => expect(mockError).toHaveBeenCalled());
    expect(mockError).toHaveBeenCalledWith("wallet is required");
  });

  it("shows a connection-failed toast on a network error (#532)", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => defaultSettings })
      .mockRejectedValueOnce(new Error("network down"));

    await act(async () => {
      render(<NotificationPreferences wallet="GTEST" />);
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Health factor alerts"));
    });

    await waitFor(() => expect(mockError).toHaveBeenCalled());
    expect(mockError).toHaveBeenCalledWith("Connection failed – please retry");
  });
});
