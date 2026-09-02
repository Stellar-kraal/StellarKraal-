import React from 'react';
import { render, screen } from '@testing-library/react';
import XlmAmount from '@/components/XlmAmount';

const mockUseCurrencySettings = jest.fn();
const mockUseCurrencyConversion = jest.fn();

jest.mock('@/hooks/useCurrencySettings', () => ({
  useCurrencySettings: () => mockUseCurrencySettings(),
}));
jest.mock('@/hooks/useCurrencyConversion', () => ({
  useCurrencyConversion: () => mockUseCurrencyConversion(),
}));

describe('XlmAmount currency conversion', () => {
  beforeEach(() => {
    mockUseCurrencySettings.mockReturnValue({ currency: 'USD', enabled: false });
    mockUseCurrencyConversion.mockReturnValue({
      convert: jest.fn().mockReturnValue(12.34),
      isStale: false,
    });
  });

  it('shows only XLM when conversion is disabled', () => {
    render(<XlmAmount xlm={2} />);

    expect(screen.getByText('2 XLM')).toBeInTheDocument();
    expect(screen.queryByText('$12.34')).not.toBeInTheDocument();
  });

  it('shows the selected currency below XLM when conversion is enabled', () => {
    mockUseCurrencySettings.mockReturnValue({ currency: 'USD', enabled: true });
    render(<XlmAmount xlm={2} />);

    expect(screen.getByText('2 XLM')).toBeInTheDocument();
    expect(screen.getByText('$12.34')).toHaveClass('block', 'text-sm');
  });

  it('shows a dash when the conversion rate is unavailable', () => {
    mockUseCurrencySettings.mockReturnValue({ currency: 'KES', enabled: true });
    mockUseCurrencyConversion.mockReturnValue({
      convert: jest.fn().mockReturnValue(null),
      isStale: false,
    });
    render(<XlmAmount xlm={2} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});