import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/shared/components/MatrixRain', () => ({ MatrixRain: () => <div /> }));
jest.mock('@/features/developers/components/MultiFileUpload', () => ({ __esModule: true, default: () => <div /> }));
jest.mock('@/features/developers/components/GitHubImport', () => ({ __esModule: true, default: () => <div /> }));
jest.mock('@/features/developers/components/TestGeneration', () => ({ __esModule: true, default: () => <div /> }));

import DevelopersPage from '../page';

describe('app/developers/page.tsx', () => {
  test('renders developer tools header', () => {
    render(<DevelopersPage />);
    expect(screen.getByText(/Smart Contract Developer Tools/i)).toBeInTheDocument();
  });
});


