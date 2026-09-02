/**
 * SWRErrorToastConfig tests — #532
 *
 * Verifies that a failed useSWR request (routed through the shared `fetcher`)
 * surfaces the classified toast via the global SWRConfig onError handler.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import useSWR from "swr";
import { ToastProvider, ToastContainer } from "@/components/toast";
import SWRErrorToastConfig from "@/components/SWRErrorToastConfig";
import { fetcher } from "@/lib/api";

function FailingFetcher({ url }: { url: string }) {
  useSWR(url, fetcher);
  return <div>content</div>;
}

function renderWithProviders(url: string) {
  return render(
    <ToastProvider>
      <SWRErrorToastConfig>
        <FailingFetcher url={url} />
        <ToastContainer />
      </SWRErrorToastConfig>
    </ToastProvider>
  );
}

describe("SWRErrorToastConfig", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a warning toast with the API's message on a 4xx SWR failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Loan not found" }),
    });

    renderWithProviders("/api/loan/missing");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Loan not found");
    });
  });

  it("shows a generic 'Server error' toast on a 5xx SWR failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "internal boom" }),
    });

    renderWithProviders("/api/loans/broken");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Server error");
    });
  });

  it("shows a connection-failed toast on a network-level SWR failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    renderWithProviders("/api/loans/offline");

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Connection failed");
    });
  });
});
