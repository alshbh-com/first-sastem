import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

type AppRole = 'owner' | 'admin' | 'courier' | 'office' | 'branch' | 'moderator';

interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isCourier: boolean;
  isOffice: boolean;
  isBranch: boolean;
  isModerator: boolean;
  isOwnerOrAdmin: boolean;
  login: (password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const loginInProgressRef = useRef(false);
  const rolesRef = useRef<AppRole[]>([]);
  const loadingRef = useRef(true);
  const bootstrappedRef = useRef(false);

  const fetchRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      return (data?.map(r => r.role as AppRole)) || [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    rolesRef.current = roles;
  }, [roles]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const applySignedOutState = useCallback(() => {
    if (!mountedRef.current) return;

    setSession(null);
    setUser(null);
    setRoles([]);
    setLoading(false);
  }, []);

  const applySignedInState = useCallback(async (nextSession: Session, presetRoles?: AppRole[]) => {
    if (!mountedRef.current) return;

    setSession(nextSession);
    setUser(nextSession.user);

    const resolvedRoles = presetRoles ?? await fetchRoles(nextSession.user.id);
    if (!mountedRef.current) return;

    setRoles(resolvedRoles);
    setLoading(false);
  }, [fetchRoles]);

  useEffect(() => {
    mountedRef.current = true;
    bootstrappedRef.current = false;

    const syncAuthState = async (nextSession: Session | null, presetRoles?: AppRole[]) => {
      if (!nextSession?.user) {
        applySignedOutState();
        return;
      }

      await applySignedInState(nextSession, presetRoles);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!mountedRef.current) return;

      console.log('[Auth] Event:', event, 'session:', !!sess, 'loginInProgress:', loginInProgressRef.current);

      if (event === 'SIGNED_OUT') {
        if (loginInProgressRef.current) return;
        void syncAuthState(null);
        return;
      }

      if (event === 'INITIAL_SESSION') {
        if (bootstrappedRef.current) return;
        bootstrappedRef.current = true;
        void syncAuthState(sess);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!sess?.user) return;

        if (loginInProgressRef.current) {
          loginInProgressRef.current = false;
        }

        const presetRoles = event === 'TOKEN_REFRESHED' && rolesRef.current.length > 0
          ? rolesRef.current
          : undefined;

        void syncAuthState(sess, presetRoles);
      }
    });

    void supabase.auth.getSession()
      .then(({ data: { session: currentSession } }) => {
        if (!mountedRef.current || bootstrappedRef.current) return;

        bootstrappedRef.current = true;
        void syncAuthState(currentSession);
      })
      .catch(() => {
        if (!mountedRef.current || bootstrappedRef.current) return;

        bootstrappedRef.current = true;
        applySignedOutState();
      });

    const timeout = setTimeout(() => {
      if (mountedRef.current && loading) {
        setLoading(false);
      }
    }, 5000);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [applySignedInState, applySignedOutState]);

  const login = useCallback(async (password: string): Promise<{ error?: string }> => {
    try {
      bootstrappedRef.current = true;
      loginInProgressRef.current = true;
      setLoading(true);
      
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/auth-login`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ password }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        loginInProgressRef.current = false;
        setLoading(false);
        return { error: data.error || 'خطأ في تسجيل الدخول' };
      }
      
      if (!data.session) {
        loginInProgressRef.current = false;
        setLoading(false);
        return { error: 'تعذر إنشاء جلسة الدخول' };
      }

      const userRoles = (data.roles || []) as AppRole[];

      await supabase.auth.signOut({ scope: 'local' });

      const { data: persistedAuth, error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      loginInProgressRef.current = false;

      if (sessionError) {
        applySignedOutState();
        return { error: 'حصلت مشكلة في فتح الجلسة، جرّب تاني' };
      }

      if (mountedRef.current) {
        const activeSession = (persistedAuth.session ?? data.session) as Session;
        setSession(activeSession);
        setUser((persistedAuth.user ?? data.user ?? activeSession.user) as User);
        setRoles(userRoles);
        setLoading(false);
      }

      return {};
    } catch {
      loginInProgressRef.current = false;
      setLoading(false);
      return { error: 'خطأ في الاتصال بالخادم' };
    }
  }, [applySignedOutState]);

  const logout = useCallback(async () => {
    loginInProgressRef.current = false;
    applySignedOutState();
    await supabase.auth.signOut();
  }, [applySignedOutState]);

  const isOwner = roles.includes('owner');
  const isAdmin = roles.includes('admin');
  const isCourier = roles.includes('courier');
  const isOffice = roles.includes('office');
  const isBranch = roles.includes('branch');
  const isModerator = roles.includes('moderator');
  const isOwnerOrAdmin = isOwner || isAdmin;

  return (
    <AuthContext.Provider value={{
      session, user, roles, loading,
      isOwner, isAdmin, isCourier, isOffice, isBranch, isModerator, isOwnerOrAdmin,
      login, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
