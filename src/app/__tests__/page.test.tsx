import React from 'react';
import { render, screen } from '@testing-library/react';

// mock next/dynamic to return a noop component
jest.mock('next/dynamic', () => () => () => null);

// mock next/link to render anchor
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children }: any) => <a href={href}>{children}</a> }));

import HomePage from '../page';

describe('app/page.tsx', () => {
  test('renders hero title and CTAs', () => {
    render(<HomePage />);
    expect(screen.getByText(/HOW THE OWL WORKS/i)).toBeInTheDocument();
    expect(screen.getByText(/ANALYZE CONTRACT/i)).toBeInTheDocument();
  });
});


