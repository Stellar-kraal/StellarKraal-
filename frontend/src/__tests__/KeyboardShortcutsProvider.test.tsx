/**
 * KeyboardShortcutsProvider tests — #531
 *
 * Covers:
 *   - pressing '?' opens the ShortcutsHelpModal
 *   - '?' is ignored while an input is focused
 *   - a consumer button using useShortcutsHelp() opens the same modal
 *   - the modal lists all registered shortcuts
 *   - Escape closes the modal
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import KeyboardShortcutsProvider, {
  useShortcutsHelp,
} from "../components/KeyboardShortcutsProvider";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// focus-trap-react needs a working DOM — mock it so tests don't need jsdom full setup
jest.mock("focus-trap-react", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/** Stand-in for the Navbar trigger button, exercising the context consumer. */
function TriggerButton() {
  const shortcutsHelp = useShortcutsHelp();
  return (
    <button onClick={() => shortcutsHelp?.openShortcutsHelp()}>Show keyboard shortcuts</button>
  );
}

function press(key: string) {
  fireEvent.keyDown(window, { key });
}

beforeEach(() => {
  mockPush.mockClear();
});

describe("KeyboardShortcutsProvider — '?' key handler (#531)", () => {
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
    expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument();
  });

  it("does not open the modal when '?' is pressed while an input is focused", () => {
    render(
      <KeyboardShortcutsProvider>
        <input aria-label="some field" />
      </KeyboardShortcutsProvider>
    );

    screen.getByLabelText("some field").focus();
    press("?");
    expect(screen.queryByRole("dialog")).toBeNull();
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
});
