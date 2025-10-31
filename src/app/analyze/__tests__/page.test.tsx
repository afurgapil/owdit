import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/dynamic', () => () => () => null);
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('') }));
jest.mock('@/features/contractSearch/components/AddressInput', () => ({ AddressInput: () => <div data-testid="address-input" /> }));
jest.mock('@/features/community/components/CommentsSection', () => ({ CommentsSection: () => <div data-testid="comments" /> }));
jest.mock('@/features/analysisResult/components/DeployerAnalysisCard', () => ({ DeployerAnalysisCard: () => <div /> }));
jest.mock('@/features/analysisResult/components/InteractionAnalysisCard', () => ({ InteractionAnalysisCard: () => <div /> }));
jest.mock('@/shared/contexts/NetworkContext', () => ({ useNetwork: () => ({ selectedChain: { name: 'Mainnet' } }) }));
jest.mock('@/features/contractSearch/hooks/useContractSearch', () => ({
  useContractSearch: () => ({ address: '', setAddress: jest.fn(), isLoading: false, error: null, result: null, searchContract: jest.fn(), clearError: jest.fn() })
}));

import AnalyzePage from '../page';

describe('app/analyze/page.tsx', () => {
  test('renders demo contracts heading and address input', () => {
    render(<AnalyzePage />);
    expect(screen.getByText(/Try with Example Contracts/i)).toBeInTheDocument();
    expect(screen.getByTestId('address-input')).toBeInTheDocument();
  });
});


