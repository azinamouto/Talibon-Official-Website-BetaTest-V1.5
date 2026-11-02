import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AuthResponse, AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { observeAuthSession, type AuthSnapshot, type AuthState } from '../lib/authSession';
import { useUI } from './UIContext';

export type { AuthState } from '../lib/authSession';
export type OfficialRole = 'super_admin' | 'admin' | 'editor' | 'municipal_admin' | 'department_admin' | 'barangay_admin' | 'citizen';
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: OfficialRole;
  barangay_id?: string | null;
  department_id?: string | null;
  is_verified: boolean;
  is_active?: boolean;
  created_at?: string;
}
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  state: AuthState;
  isPasswordRecovery: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthResponse>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error }>;
  signOut: () => Promise<void>;
  refreshProfile: (user?: User) => Promise<UserProfile | null>;
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { notify } = useUI();
  const [snapshot, setSnapshot] = useState<AuthSnapshot<UserProfile>>({
    session: null, profile: null, state: 'INITIALIZING', isPasswordRecovery: false,
  });
  const observer = useRef<ReturnType<typeof observeAuthSession<UserProfile>> | null>(null);
  useEffect(() => {
    const subscription = observeAuthSession(supabase.auth, async (user) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id)
        .abortSignal(AbortSignal.timeout(15000)).maybeSingle();
      if (error) throw error;
      return data as UserProfile | null;
    }, setSnapshot);
    observer.current = subscription;
    return () => { subscription.dispose(); observer.current = null; };
  }, []);

  const refreshProfile = useCallback((user?: User) => observer.current?.refreshProfile(user) ?? Promise.resolve(null), []);
  const signInWithEmail = useCallback((email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }), []);
  const signUpWithEmail = useCallback(async (_email: string, _password: string) => ({ error: new Error('Online registration is not available.') }), []);
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      notify('You have signed out.', 'success');
    } catch {
      // SDK versions may clear local storage even when server revocation fails.
      // Report the actual local state instead of claiming a still-active session.
      try {
        const { data, error } = await supabase.auth.getSession();
        notify(!error && !data.session
          ? 'Signed out on this browser, but server sign-out could not be confirmed.'
          : 'Could not sign out. Check your connection and try again.', 'error');
      } catch {
        notify('Could not confirm sign-out. Check your connection and try again.', 'error');
      }
    }
  }, [notify]);
  const resetPasswordForEmail = useCallback((email: string) => supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login?type=recovery`,
  }), []);
  const updatePassword = useCallback(async (password: string) => {
    const result = await supabase.auth.updateUser({ password });
    if (!result.error) observer.current?.finishPasswordRecovery();
    return result;
  }, []);
  const value = useMemo<AuthContextType>(() => ({
    ...snapshot, user: snapshot.session?.user ?? null, loading: snapshot.state === 'INITIALIZING',
    signInWithEmail, signUpWithEmail, signOut, refreshProfile, resetPasswordForEmail, updatePassword,
  }), [snapshot, signInWithEmail, signUpWithEmail, signOut, refreshProfile, resetPasswordForEmail, updatePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
