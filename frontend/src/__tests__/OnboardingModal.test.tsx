import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingModal from '../components/OnboardingModal';
import { renderHook, waitFor } from '@testing-library/react';
import { useOnboarding } from '../hooks/useOnboarding';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('OnboardingModal', () => {
  beforeEach(() => {
    localStorageMock.setItem.mockClear();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders when open', () => {
    render(<OnboardingModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
  });

  it('highlights the active workflow target', () => {
    const target = document.createElement('button');
    target.dataset.onboardingTarget = 'wallet';
    target.getBoundingClientRect = () => ({
      top: 20,
      right: 180,
      bottom: 60,
      left: 80,
      width: 100,
      height: 40,
      x: 80,
      y: 20,
      toJSON: () => ({}),
    });
    document.body.appendChild(target);

    render(<OnboardingModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByTestId('onboarding-spotlight')).toBeInTheDocument();
    target.remove();
  });

  it('auto-launches on the first visit', async () => {
    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => expect(result.current.showOnboarding).toBe(true));
  });

  it('does not render when closed', () => {
    render(<OnboardingModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText('Connect Your Wallet')).not.toBeInTheDocument();
  });

  it('advances through steps', () => {
    render(<OnboardingModal isOpen={true} onClose={() => {}} />);
    
    // First step
    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    
    // Click next
    fireEvent.click(screen.getByText('Next'));
    
    // Second step
    expect(screen.getByText('Register Collateral')).toBeInTheDocument();
    
    // Click next
    fireEvent.click(screen.getByText('Next'));
    
    // Third step
    expect(screen.getByText('Request a Loan')).toBeInTheDocument();
  });

  it('completes onboarding and sets localStorage', () => {
    const onClose = jest.fn();
    render(<OnboardingModal isOpen={true} onClose={onClose} />);
    
    // Navigate to last step
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    
    // Complete onboarding
    fireEvent.click(screen.getByText('Get Started'));
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('stellarkraal_onboarding_completed', 'true');
    expect(onClose).toHaveBeenCalled();
  });

  it('allows skipping and sets localStorage', () => {
    const onClose = jest.fn();
    render(<OnboardingModal isOpen={true} onClose={onClose} />);
    
    fireEvent.click(screen.getByText('Skip'));
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('stellarkraal_onboarding_completed', 'true');
    expect(onClose).toHaveBeenCalled();
  });
});
