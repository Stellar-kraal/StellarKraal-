/**
 * classifyApiError tests — #532
 *
 * Verifies the toast variant + message picked for each class of API failure:
 *   - network failure (no response at all)      → error, "Connection failed – please retry"
 *   - 4xx ApiError                                → warning, the API's own message
 *   - 5xx ApiError                                → error, generic "Server error"
 */
import { classifyApiError } from "@/lib/apiErrorToast";
import { ApiError } from "@/lib/api";

describe("classifyApiError", () => {
  it("classifies a network failure as a connection-failed error toast", () => {
    const result = classifyApiError(new TypeError("Failed to fetch"));
    expect(result).toEqual({ variant: "error", message: "Connection failed – please retry" });
  });

  it("classifies a non-Error throw as a connection-failed error toast", () => {
    const result = classifyApiError("some string throw");
    expect(result).toEqual({ variant: "error", message: "Connection failed – please retry" });
  });

  it("classifies a 4xx ApiError as a warning toast with the API's own message", () => {
    const result = classifyApiError(new ApiError("amount exceeds outstanding balance", 400));
    expect(result).toEqual({ variant: "warning", message: "amount exceeds outstanding balance" });
  });

  it("classifies a 404 ApiError as a warning toast", () => {
    const result = classifyApiError(new ApiError("Loan not found", 404));
    expect(result).toEqual({ variant: "warning", message: "Loan not found" });
  });

  it("classifies a 5xx ApiError as a generic 'Server error' error toast", () => {
    const result = classifyApiError(new ApiError("internal boom", 500));
    expect(result).toEqual({ variant: "error", message: "Server error" });
  });

  it("classifies a 503 ApiError as a generic 'Server error' error toast", () => {
    const result = classifyApiError(new ApiError("Service unavailable", 503));
    expect(result).toEqual({ variant: "error", message: "Server error" });
  });
});
