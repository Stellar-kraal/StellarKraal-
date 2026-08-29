import type { Meta, StoryObj } from '@storybook/react';
import StatusBadge from './StatusBadge';

/**
 * `StatusBadge` renders a colour-coded pill that communicates the status of a
 * loan or collateral item to the user.
 *
 * **Loan statuses** — `active`, `repaid`, `defaulted`, `liquidated`
 * **Collateral statuses** — `available`, `pledged`
 *
 * All built-in statuses meet WCAG AA 4.5:1 contrast ratio in both light and
 * dark mode. Unknown status strings fall back to a neutral grey pill.
 *
 * Accessibility: each badge renders `role="status"` with a descriptive
 * `aria-label` so screen readers announce the full status rather than just
 * the icon character.
 */
const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  parameters: { layout: 'centered' },
  argTypes: {
    status: {
      control: 'select',
      options: ['active', 'repaid', 'defaulted', 'liquidated', 'available', 'pledged', 'unknown'],
      description: 'The status string. Unknown values render a neutral grey badge.',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Active loan — green with a filled circle icon. */
export const Active: Story = {
  args: { status: 'active' },
};

/** Repaid loan — blue with a checkmark icon. */
export const Repaid: Story = {
  args: { status: 'repaid' },
};

/** Defaulted loan — amber warning. */
export const Defaulted: Story = {
  args: { status: 'defaulted' },
};

/** Liquidated loan — red alert. */
export const Liquidated: Story = {
  args: { status: 'liquidated' },
};

/** Available collateral — emerald, ready to be pledged. */
export const Available: Story = {
  args: { status: 'available' },
};

/** Pledged collateral — purple, currently securing a loan. */
export const Pledged: Story = {
  args: { status: 'pledged' },
};

/**
 * Unknown status — when the status string does not match any known value,
 * the badge renders a neutral grey pill with the raw string.
 */
export const Unknown: Story = {
  args: { status: 'pending_review' },
};

/** All statuses side by side for quick visual comparison. */
export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      <StatusBadge status="active" />
      <StatusBadge status="repaid" />
      <StatusBadge status="defaulted" />
      <StatusBadge status="liquidated" />
      <StatusBadge status="available" />
      <StatusBadge status="pledged" />
      <StatusBadge status="unknown_status" />
    </div>
  ),
};

/**
 * Dark mode — all badges in their dark-mode variant.
 * Tailwind activates dark styles via the `dark` class on a parent element.
 */
export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-brown-900 p-6 rounded-2xl">
      <div className="flex flex-wrap gap-3 items-center">
        <StatusBadge status="active" />
        <StatusBadge status="repaid" />
        <StatusBadge status="defaulted" />
        <StatusBadge status="liquidated" />
        <StatusBadge status="available" />
        <StatusBadge status="pledged" />
      </div>
    </div>
  ),
};
