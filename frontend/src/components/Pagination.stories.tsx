import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Pagination from './Pagination';
import type { PageSize } from '@/hooks/usePagination';

/**
 * `Pagination` renders a navigation bar for paged lists.
 *
 * It combines two controls:
 * - **Page-size selector** — lets the user choose how many items per page
 *   (values are `10`, `25`, `50` as defined in `usePagination`).
 * - **Prev / Next buttons** — navigate between pages; each is `disabled`
 *   at the respective boundary.
 *
 * **Accessibility**
 * - Wrapped in `<nav aria-label="Pagination">`
 * - The current page indicator carries `aria-current="page"`
 * - Prev / Next buttons have descriptive `aria-label` attributes
 * - The page-size `<select>` has a visually-hidden `<label>` via `sr-only`
 */
const meta: Meta<typeof Pagination> = {
  title: 'Components/Pagination',
  component: Pagination,
  parameters: { layout: 'padded' },
  argTypes: {
    page: {
      control: { type: 'number', min: 1 },
      description: 'Current page number (1-indexed).',
    },
    totalPages: {
      control: { type: 'number', min: 1 },
      description: 'Total number of pages.',
    },
    limit: {
      control: 'select',
      options: [10, 25, 50],
      description: 'Items per page.',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Default state — mid-way through a list; both Prev and Next are enabled. */
export const Default: Story = {
  render: (args) => {
    const [page, setPage] = useState(args.page ?? 3);
    const [limit, setLimit] = useState<PageSize>(args.limit ?? 10);
    return (
      <Pagination
        {...args}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    );
  },
  args: {
    page: 3,
    totalPages: 10,
    limit: 10,
  },
};

/** First page — the Prev button is disabled. */
export const FirstPage: Story = {
  render: (args) => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState<PageSize>(10);
    return (
      <Pagination
        {...args}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    );
  },
  args: {
    page: 1,
    totalPages: 5,
    limit: 10,
  },
};

/** Last page — the Next button is disabled. */
export const LastPage: Story = {
  render: (args) => {
    const [page, setPage] = useState(5);
    const [limit, setLimit] = useState<PageSize>(10);
    return (
      <Pagination
        {...args}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    );
  },
  args: {
    page: 5,
    totalPages: 5,
    limit: 10,
  },
};

/** Single page — both Prev and Next are disabled. */
export const SinglePage: Story = {
  render: () => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState<PageSize>(25);
    return (
      <Pagination
        page={page}
        totalPages={1}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    );
  },
};

/** Large page count — verifies the page indicator handles double-digit values. */
export const ManyPages: Story = {
  render: () => {
    const [page, setPage] = useState(42);
    const [limit, setLimit] = useState<PageSize>(10);
    return (
      <Pagination
        page={page}
        totalPages={100}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />
    );
  },
};

/**
 * Dark mode — pagination in dark context.
 */
export const DarkMode: Story = {
  render: () => {
    const [page, setPage] = useState(2);
    const [limit, setLimit] = useState<PageSize>(25);
    return (
      <div className="dark bg-brown-900 p-6 rounded-2xl">
        <Pagination
          page={page}
          totalPages={8}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>
    );
  },
};
