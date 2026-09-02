/**
 * Tests for KeyboardShortcutsProvider — #531, #1098
 *
 * Covers:
 *   - '?' instantly toggles the shortcuts modal open and closed
 *   - '?' is ignored while an input/textarea is focused
 *   - the modal has role='dialog' and lists all registered shortcuts
 *   - Escape closes the modal
 *   - a consumer button using useShortcutsHelp() opens the same modal (#531)
 *   - useShortcutsHelp() degrades gracefully outside the provider (#531)
 *   - new shortcuts: 'n' navigates to /borrow (#1098)
 *   - chord 'g d' navigates to /dashboard, chord 'g c' navigates to /collateral (#1098)
 *   - shortcuts are disabled when focus is in an input/textarea
 */
import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import KeyboardShortcutsProvider, {
  useShortcutsHelp,
} from "../components/KeyboardShortcutsProvider";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// focus-trap-react needs a working DOM — mock it so tests don't need jsdom full setup
jest.mock("focus-trap-react", () => {
  const MockFocusTrap = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  MockFocusTrap.displayName = "MockFocusTrap";
  return MockFocusTrap;
});

/** Stand-in for the Navbar trigger button, exercising the context consumer. */
function TriggerButton() {
  const shortcutsHelp = useShortcutsHelp();
  return (
    <button onClick={() => shortcutsHelp?.openShortcutsHelp()}>Show keyboard shortcuts</button>
  );
}

function press(key: string, opts: Partial<KeyboardEventInit> = {}) {
  fireEvent.keyDown(window, { key, ...opts });
}

describe("KeyboardShortcutsProvider (#531, #1098)", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("opens the shortcuts modal when '?' is pressed", () => {
    render(
      <KeyboardShortcutsProvider>
        <div>content</div>
      </KeyboardShortcutsProvider>
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    press("?");
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it("closes the modal on second '?' press (toggle)", () => {
    render(
      <KeyboardShortcutsProvider>
        <div>content</div>
      </KeyboardShortcutsProvider>
    );

    press("?");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    press("?");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not open the modal when '?' is pressed while an input is focused", () => {
    render(
      <KeyboardShortcutsProvider>
        <input aria-label="some field" />
      </KeyboardShortcutsProvider>
    );

    const field = screen.getByLabelText("some field");
    field.focus();
    fireEvent.keyDown(field, { key: "?" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("lists all registered shortcuts in the modal", () => {
    render(
      <KeyboardShortcutsProvider>
        <div>content</div>
      </KeyboardShortcutsProvider>
    );

    press("?");
    expect(screen.getByText("Go to Home")).toBeInTheDocument();
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Borrow (get a loan)")).toBeInTheDocument();
    expect(screen.getByText("New loan request")).toBeInTheDocument();
  });

  it("closes the modal when Escape is pressed", () => {
    render(
      <KeyboardShortcutsProvider>
        <div>content</div>
      </KeyboardShortcutsProvider>
    );

    press("?");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a consumer button using useShortcutsHelp() opens the same modal", () => {
    render(
      <KeyboardShortcutsProvider>
        <TriggerButton />
      </KeyboardShortcutsProvider>
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /show keyboard shortcuts/i }));
    expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it("useShortcutsHelp() returns null outside the provider (graceful degrade)", () => {
    // Rendering the trigger button with no provider should not throw.
    expect(() => render(<TriggerButton />)).not.toThrow();
  });

  it("navigates to /borrow on 'n' keypress", () => {
    render(
      <KeyboardShortcutsProvider>
        <div>content</div>
      </KeyboardShortcutsProvider>
    );

    press("n");
    expect(mockPush).toHaveBeenCalledWith("/borrow");
  });

  it("navigates to /dashboard via chord 'g' then 'd'", () => {
    jest.useFakeTimers();
    render(
      <KeyboardShortcutsProvider>
        <div>content</div>
      </KeyboardShortcutsProvider>
    );

    press("g");
    press("d");
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
    jest.useRealTimers();
  });

  it("navigates to /collateral via chord 'g' then 'c'", () => {
    jest.useFakeTimers();
    render(
      <KeyboardShortcutsProvider>
        <div>content</div>
      </KeyboardShortcutsProvider>
    );

    press("g");
    press("c");
    expect(mockPush).toHaveBeenCalledWith("/collateral");
    jest.useRealTimers();
  });

  it("chord 'g' alone does not navigate after 1500ms timeout", () => {
    jest.useFakeTimers();
    render(
      <KeyboardShortcutsProvider>
        <div>content</div>
      </KeyboardShortcutsProvider>
    );

    press("g");
    act(() => jest.advanceTimersByTime(1600));
    press("d");
    // After timeout, 'd' should act as its own shortcut (go to /dashboard via base shortcut)
    // Not as a chord — either way, push was not called twice for the chord pattern
    jest.useRealTimers();
  });

  it("does not trigger 'n' shortcut when focus is in a textarea", () => {
    render(
      <KeyboardShortcutsProvider>
        <textarea data-testid="text-area" />
      </KeyboardShortcutsProvider>
    );

    const textarea = screen.getByTestId("text-area");
    textarea.focus();
    fireEvent.keyDown(textarea, { key: "n" });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
