import React from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { NoopLogger, setLogger } from '@cashmgr/core';
import { ErrorBoundary } from '../ErrorBoundary';

function Bomb(): React.ReactElement {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    setLogger(new NoopLogger());
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    const { toJSON } = render(
      <ErrorBoundary>
        <Text>All good</Text>
      </ErrorBoundary>
    );
    expect(JSON.stringify(toJSON())).toContain('All good');
  });

  it('renders a fallback UI when a child throws', () => {
    const { toJSON } = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('Something went wrong');
    expect(tree).toContain('Try again');
  });

  it('clears the error state and renders children again after a retry', () => {
    const ref = React.createRef<ErrorBoundary>();
    const { toJSON, rerender } = render(
      <ErrorBoundary ref={ref}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(JSON.stringify(toJSON())).toContain('Something went wrong');

    // Swap in non-throwing children first — while state.error is still set the
    // fallback keeps rendering regardless of props.children — then retry to
    // clear the error and reveal the already-updated children.
    rerender(
      <ErrorBoundary ref={ref}>
        <Text>Recovered</Text>
      </ErrorBoundary>
    );
    act(() => {
      ref.current!.handleRetry();
    });

    expect(JSON.stringify(toJSON())).toContain('Recovered');
  });
});
