import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

type AppRole = 'owner' | 'admin' | 'courier';

interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isCourier: boolean;
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
  const skipNextRoleFetch = useRef(false);

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    return (data?.map(r => r.role as AppRole)) || [];
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user) {
        // If login() already set roles, skip this fetch
        if (skipNextRoleFetch.current) {
          skipNextRoleFetch.current = false;
          setLoading(false);
          return;
        }
        const userRoles = await fetchRoles(sess.user.id);
        setRoles(userRoles);
      } else {
        setRoles([]);
      }
      setLoading(false);
    });

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        const userRoles = await fetchRoles(sess.user.id);
        setRoles(userRoles);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (password: string): Promise<{ error?: string }> => {
    try {
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
      if (!res.ok) return { error: data.error || 'خطأ في تسجيل الدخول' };
      
      if (data.session) {
        // Set roles BEFORE setting session to prevent race condition
        const userRoles = (data.roles || []) as AppRole[];
        setRoles(userRoles);
        skipNextRoleFetch.current = true;
        
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      return {};
    } catch {
      return { error: 'خطأ في الاتصال بالخادم' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const isOwner = roles.includes('owner');
  const isAdmin = roles.includes('admin');
  const isCourier = roles.includes('courier');
  const isOwnerOrAdmin = isOwner || isAdmin;

  return (
    <AuthContext.Provider value={{
      session, user, roles, loading,
      isOwner, isAdmin, isCourier, isOwnerOrAdmin,
      login, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
