import React from 'react';
import { render, screen } from '@testing-library/react';
import { Web3Provider, config } from '../Web3Provider';

describe('components/contexts/Web3Provider shim', () => {
  test('renders children within shim container', () => {
    render(
      <Web3Provider>
        <div data-testid="child">child</div>
      </Web3Provider>
    );
    expect(screen.getByTestId('web3-provider')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  test('exports a config placeholder', () => {
    expect(config).toBeDefined();
  });
});


