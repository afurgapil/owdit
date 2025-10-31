import React from 'react';
import { render } from '@testing-library/react';

const captureException = jest.fn();
jest.mock('@sentry/nextjs', () => ({ captureException }));
jest.mock('next/error', () => ({ __esModule: true, default: ({ statusCode }: any) => <div data-testid="next-error">{statusCode}</div> }));

import GlobalError from '../global-error';

describe('app/global-error.tsx', () => {
  test('captures error with Sentry', () => {
    const err = new Error('boom');
    render(<GlobalError error={err as any} />);
    expect(captureException).toHaveBeenCalledWith(err);
  });
});


