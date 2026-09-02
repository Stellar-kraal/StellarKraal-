"use client";

import { SWRConfig } from "swr";
import { useToast } from "@/components/toast";
import { classifyApiError } from "@/lib/apiErrorToast";

/**
 * SWRErrorToastConfig — #532
 *
 * Wraps `children` in an SWRConfig whose global `onError` surfaces a toast
 * for every failed `useSWR` request (network / 4xx / 5xx, classified via
 * {@link classifyApiError}), so any hook built on the shared `fetcher`
 * (useLoans, useCollateral, useAtRiskLoans, …) gets user-facing error
 * feedback without each call site wiring its own toast.
 *
 * Must render inside ToastProvider.
 */
export default function SWRErrorToastConfig({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  return (
    <SWRConfig
      value={{
        onError: (error) => {
          const { variant, message } = classifyApiError(error);
          toast[variant](message);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
