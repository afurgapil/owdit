import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/shared/components/Analytics', () => ({ Analytics: () => <div data-testid="analytics" /> }));

import ClientRoot from '../ClientRoot';

describe('app/ClientRoot.tsx', () => {
  test('renders Analytics and children', () => {
    render(<ClientRoot><div>child</div></ClientRoot>);
    expect(screen.getByTestId('analytics')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});


