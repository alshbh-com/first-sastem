import { act, render } from '@testing-library/react';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type AuthChangeEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

const mockUser = {
  id: 'user-1',
  email: '0127800@first.ship',
};

const mockSession = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  user: mockUser,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

let authListener: ((event: AuthChangeEvent, session: typeof mockSession | null) => void) | null = null;
let getSessionDeferred = deferred<{ data: { session: typeof mockSession | null } }>();

const mockSignOut = vi.fn(async () => ({ error: null }));
const mockSetSession = vi.fn(async () => {
  authListener?.('SIGNED_IN', mockSession);
  return { data: { session: mockSession, user: mockUser }, error: null };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback: typeof authListener) => {
        authListener = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: vi.fn(() => getSessionDeferred.promise),
      setSession: mockSetSession,
      signOut: mockSignOut,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [{ role: 'admin' }] })),
      })),
    })),
  },
}));

import { AuthProvider, useAuth } from './AuthContext';

function TestConsumer() {
  const { login, session, loading } = useAuth();

  return (
    <div>
      <button onClick={() => void login('0127800')}>login</button>
      <div data-testid="session-user">{session?.user.id ?? 'none'}</div>
      <div data-testid="loading-state">{String(loading)}</div>
    </div>
  );
}

describe('AuthProvider login bootstrap race', () => {
  beforeEach(() => {
    authListener = null;
    getSessionDeferred = deferred();
    mockSignOut.mockClear();
    mockSetSession.mockClear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session: mockSession,
        user: mockUser,
        roles: ['admin'],
      }),
    }));
  });

  it('keeps the new session when the initial getSession resolves late with null', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('login'));

    await waitFor(() => {
      expect(screen.getByTestId('session-user')).toHaveTextContent('user-1');
    });

    await act(async () => {
      getSessionDeferred.resolve({ data: { session: null } });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('session-user')).toHaveTextContent('user-1');
      expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
    });

    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
  });
});