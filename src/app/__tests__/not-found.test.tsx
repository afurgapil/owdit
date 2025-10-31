import React from 'react';
import { render, screen } from '@testing-library/react';
import NotFound from '../not-found';

describe('app/not-found.tsx', () => {
  test('renders 404 message', () => {
    render(<NotFound />);
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
  });
});


