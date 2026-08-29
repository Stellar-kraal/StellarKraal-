import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './ui/Button';

/**
 * `Button` is the primary interactive element across the UI.
 *
 * **Variants** — `primary`, `secondary`, `ghost`, `danger`
 * **Sizes** — `sm`, `md` (default), `lg`
 * **States** — `idle` (default), `loading`, `success`, `error`
 *
 * The component is fully accessible: it manages `aria-busy` during loading,
 * respects `disabled`, and includes visible focus rings for keyboard users.
 */
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
      description: 'Visual style of the button.',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Controls padding and font size.',
    },
    state: {
      control: 'select',
      options: ['idle', 'loading', 'success', 'error'],
      description: 'Async feedback state. `loading` also sets `aria-busy`.',
    },
    disabled: {
      control: 'boolean',
      description: 'When true, the button is inert and visually dimmed.',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Stretches the button to fill its container.',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The default primary button — used for the main action on a surface. */
export const Default: Story = {
  args: {
    children: 'Request Loan',
    variant: 'primary',
    size: 'md',
  },
};

/** Disabled state — button is inert, visually dimmed, and has `cursor-not-allowed`. */
export const Disabled: Story = {
  args: {
    children: 'Request Loan',
    variant: 'primary',
    disabled: true,
  },
};

/** Loading state — spinner appears and `aria-busy` is set to `true`. */
export const Loading: Story = {
  args: {
    children: 'Submitting…',
    state: 'loading',
  },
};

/** Success feedback — brief green confirmation after a successful action. */
export const Success: Story = {
  args: {
    children: 'Saved',
    state: 'success',
  },
};

/** Error feedback — brief red indicator when an action fails. */
export const Error: Story = {
  args: {
    children: 'Failed',
    state: 'error',
  },
};

/** Secondary variant — used for alternate / less prominent actions. */
export const Secondary: Story = {
  args: {
    children: 'View Details',
    variant: 'secondary',
  },
};

/** Ghost variant — outlined, low-emphasis. Ideal for cancel or secondary navigation. */
export const Ghost: Story = {
  args: {
    children: 'Cancel',
    variant: 'ghost',
  },
};

/** Danger variant — for destructive actions like liquidation or deletion. */
export const Danger: Story = {
  args: {
    children: 'Liquidate',
    variant: 'danger',
  },
};

/** Small size — for inline or compact contexts like table rows or badges. */
export const Small: Story = {
  args: {
    children: 'Retry',
    size: 'sm',
  },
};

/** Large size — for hero CTAs or prominent page-level actions. */
export const Large: Story = {
  args: {
    children: 'Get Started',
    size: 'lg',
  },
};

/** Full-width — stretches to fill the container; common in mobile or card footers. */
export const FullWidth: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    children: 'Connect Wallet',
    fullWidth: true,
  },
};

/** All variants at a glance for quick visual comparison. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button disabled>Disabled</Button>
      <Button state="loading">Loading</Button>
      <Button state="success">Success</Button>
      <Button state="error">Error</Button>
    </div>
  ),
};
