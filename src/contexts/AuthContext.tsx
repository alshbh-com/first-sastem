import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

type AppRole = 'owner' | 'admin' | 'courier' | 'office' | 'branch';

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
  const sessionSetRef = useRef(false);

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      return (data?.map(r => r.role as AppRole)) || [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    let initialDone = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (!mountedRef.current) return;

      console.log('[Auth] Event:', event, 'session:', !!sess, 'loginInProgress:', loginInProgressRef.current);

      if (event === 'SIGNED_OUT') {
        // Don't process SIGNED_OUT if login is in progress
        if (loginInProgressRef.current) return;
        setSession(null);
        setUser(null);
        setRoles([]);
        sessionSetRef.current = false;
        setLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION') {
        initialDone = true;
        if (sess?.user) {
          setSession(sess);
          setUser(sess.user);
          sessionSetRef.current = true;
          // Fetch roles for existing session
          const userRoles = await fetchRoles(sess.user.id);
          if (mountedRef.current) {
            setRoles(userRoles);
            setLoading(false);
          }
        } else {
          setSession(null);
          setUser(null);
          setRoles([]);
          setLoading(false);
        }
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!sess?.user) return;
        
        setSession(sess);
        setUser(sess.user);
        sessionSetRef.current = true;

        // If login just happened, roles are already set by login()
        if (loginInProgressRef.current) {
          loginInProgressRef.current = false;
          setLoading(false);
          return;
        }

        // For TOKEN_REFRESHED, don't re-fetch roles if we already have them
        if (event === 'TOKEN_REFRESHED' && roles.length > 0) {
          return;
        }

        // Fetch roles
        const userRoles = await fetchRoles(sess.user.id);
        if (mountedRef.current) {
          setRoles(userRoles);
          setLoading(false);
        }
      }
    });

    // Safety timeout
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
  }, []);

  const login = useCallback(async (password: string): Promise<{ error?: string }> => {
    try {
      loginInProgressRef.current = true;
      
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
        return { error: data.error || 'خطأ في تسجيل الدخول' };
      }
      
      if (data.session) {
        const userRoles = (data.roles || []) as AppRole[];
        setRoles(userRoles);
        
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        
        // If onAuthStateChange didn't fire yet, ensure state is set
        if (mountedRef.current && data.session) {
          sessionSetRef.current = true;
          setLoading(false);
        }
      }
      return {};
    } catch {
      loginInProgressRef.current = false;
      return { error: 'خطأ في الاتصال بالخادم' };
    }
  }, []);

  const logout = useCallback(async () => {
    loginInProgressRef.current = false;
    sessionSetRef.current = false;
    setRoles([]);
    setSession(null);
    setUser(null);
    await supabase.auth.signOut();
  }, []);

  const isOwner = roles.includes('owner');
  const isAdmin = roles.includes('admin');
  const isCourier = roles.includes('courier');
  const isOffice = roles.includes('office');
  const isBranch = roles.includes('branch');
  const isOwnerOrAdmin = isOwner || isAdmin;

  return (
    <AuthContext.Provider value={{
      session, user, roles, loading,
      isOwner, isAdmin, isCourier, isOffice, isBranch, isOwnerOrAdmin,
      login, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
