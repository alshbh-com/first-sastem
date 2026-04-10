import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

async function flushAsyncWork(cycles = 6) {
  for (let index = 0; index < cycles; index += 1) {
    await Promise.resolve();
  }
}

let authListener: ((event: AuthChangeEvent, session: typeof mockSession | null) => void) | null = null;
let getSessionDeferred = deferred<{ data: { session: typeof mockSession | null } }>();
let container: HTMLDivElement;
let root: Root;

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
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session: mockSession,
        user: mockUser,
        roles: ['admin'],
      }),
    }));
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await flushAsyncWork(2);
    });

    container.remove();
    vi.unstubAllGlobals();
  });

  it('keeps the new session when the initial getSession resolves late with null', async () => {
    await act(async () => {
      root.render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      await flushAsyncWork();
    });

    await act(async () => {
      container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushAsyncWork();
    });

    expect(container.querySelector('[data-testid="session-user"]')?.textContent).toBe('user-1');

    await act(async () => {
      getSessionDeferred.resolve({ data: { session: null } });
      await flushAsyncWork();
    });

    expect(container.querySelector('[data-testid="session-user"]')?.textContent).toBe('user-1');
    expect(container.querySelector('[data-testid="loading-state"]')?.textContent).toBe('false');

    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
  });
});