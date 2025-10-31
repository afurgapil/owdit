import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/script', () => ({ __esModule: true, default: ({ children }: any) => <>{children}</> }));
jest.mock('@/shared/components/Layout', () => ({ Layout: ({ children }: any) => <div data-testid="layout">{children}</div> }));
jest.mock('../ClientRoot', () => ({ __esModule: true, default: ({ children }: any) => <div data-testid="client-root">{children}</div> }));
jest.mock('next/font/google', () => ({ Geist: () => ({ variable: 'geist' }), Geist_Mono: () => ({ variable: 'geist_mono' }), Open_Sans: () => ({ variable: 'open' }), Raleway: () => ({ variable: 'raleway' }) }));

import RootLayout from '../layout';

describe('app/layout.tsx', () => {
  test('wraps children with ClientRoot and Layout', () => {
    render(<RootLayout><div>child</div></RootLayout> as any);
    expect(screen.getByTestId('client-root')).toBeInTheDocument();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});


