import { ApiError } from '@/lib/api';
import type { ToastVariant } from '@/components/toast';

export interface ApiErrorToast {
  variant: ToastVariant;
  message: string;
}

const CONNECTION_ERROR_MESSAGE = 'Connection failed – please retry';
const SERVER_ERROR_MESSAGE = 'Server error';

/**
 * Classifies a caught API-call error into the toast variant + message that
 * should be shown to the user (#532):
 *
 *  - Network failures (the request never got a response, e.g. `fetch` itself
 *    rejected) → error toast, "Connection failed – please retry".
 *  - 4xx responses → warning toast with the API's own error message.
 *  - 5xx responses → error toast, generic "Server error".
 */
export function classifyApiError(err: unknown): ApiErrorToast {
  if (err instanceof ApiError) {
    if (err.status >= 500) {
      return { variant: 'error', message: SERVER_ERROR_MESSAGE };
    }
    if (err.status >= 400) {
      return { variant: 'warning', message: err.message || SERVER_ERROR_MESSAGE };
    }
  }
  return { variant: 'error', message: CONNECTION_ERROR_MESSAGE };
}
