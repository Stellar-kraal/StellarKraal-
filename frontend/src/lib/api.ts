import { mutate } from 'swr';

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Reads the API's own error message out of a non-2xx response body, if any
 * (the backend returns `{ error: string }` or `{ message: string }`). Falls
 * back to a generic "Server error: <status>" when the body isn't usable
 * (#532 — 4xx toasts should show the API's own message).
 */
async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body === 'object') {
      if (typeof body.error === 'string' && body.error) return body.error;
      if (typeof body.message === 'string' && body.message) return body.message;
    }
  } catch {
    // response body wasn't JSON (or was empty) — fall through to the generic message
  }
  return `Server error: ${res.status}`;
}

/** Throws an {@link ApiError} carrying the response status and its own error message when `res` is not ok. */
export async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return;
  throw new ApiError(await extractErrorMessage(res), res.status);
}

/**
 * Shared SWR fetcher. Throws an {@link ApiError} on non-2xx responses so callers
 * can surface a meaningful message and SWR can revalidate on retry.
 */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  await throwIfNotOk(res);
  return res.json() as Promise<T>;
}

/**
 * Drop every cached loan query and revalidate it in the background.
 * Call after any loan mutation (request, repay) so lists reflect the change.
 */
export function invalidateLoans() {
  return mutate((key) => typeof key === 'string' && key.includes('/loan'), undefined, {
    revalidate: true,
  });
}

/**
 * Drop every cached collateral query and revalidate it in the background.
 * Call after registering collateral so owner and public lists stay fresh.
 */
export function invalidateCollateral() {
  return mutate((key) => typeof key === 'string' && key.includes('/collateral'), undefined, {
    revalidate: true,
  });
}
