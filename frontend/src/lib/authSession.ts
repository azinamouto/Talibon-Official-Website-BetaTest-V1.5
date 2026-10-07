import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';

export type AuthState = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'ERROR';
export interface AuthSnapshot<P> {
  session: Session | null;
  profile: P | null;
  state: AuthState;
  isPasswordRecovery: boolean;
}

/** One subscription owns session state. Profile work runs outside the auth lock. */
export function observeAuthSession<P>(
  auth: SupabaseClient['auth'],
  loadProfile: (user: User) => Promise<P | null>,
  publish: (snapshot: AuthSnapshot<P>) => void,
) {
  let active = true;
  let generation = 0;
  let request = 0;
  let eventCount = 0;
  let timer: ReturnType<typeof setTimeout>;
  let current: AuthSnapshot<P> = {
    session: null, profile: null, state: 'INITIALIZING', isPasswordRecovery: false,
  };
  const emit = (patch: Partial<AuthSnapshot<P>>) => {
    current = { ...current, ...patch };
    if (active) publish(current);
  };
  const refreshProfile = async (user = current.session?.user): Promise<P | null> => {
    if (!active || !user || user.id !== current.session?.user.id) return null;
    const version = generation;
    const ticket = ++request;
    try {
      const profile = await loadProfile(user);
      if (!active || version !== generation || ticket !== request) return null;
      emit({ profile, state: 'AUTHENTICATED' });
      return profile;
    } catch {
      if (active && version === generation && ticket === request) emit({ profile: null, state: 'ERROR' });
      return null;
    }
  };
  const receive = (event: AuthChangeEvent, session: Session | null) => {
    if (!active) return;
    eventCount++;
    if (!session) {
      generation++;
      clearTimeout(timer);
      emit({ session: null, profile: null, state: 'UNAUTHENTICATED', isPasswordRecovery: false });
      return;
    }
    const changedUser = current.session?.user.id !== session.user.id;
    if (changedUser) { generation++; clearTimeout(timer); }
    emit({
      session,
      ...(changedUser ? { profile: null, state: 'INITIALIZING' as const } : {}),
      isPasswordRecovery: event === 'PASSWORD_RECOVERY' || (!changedUser && current.isPasswordRecovery),
    });
    // Token refresh and tab refocus must not reset a profile or flash a redirect.
    if (changedUser || event === 'USER_UPDATED') {
      clearTimeout(timer);
      timer = setTimeout(() => { void refreshProfile(session.user); }, 0);
    }
  };
  const { data: { subscription } } = auth.onAuthStateChange(receive);
  const initialEvents = eventCount;
  void auth.getSession().then(({ data, error }) => {
    if (!active || eventCount !== initialEvents) return;
    if (error) emit({ state: 'ERROR' });
    else receive('INITIAL_SESSION', data.session);
  }).catch(() => {
    if (active && eventCount === initialEvents) emit({ state: 'ERROR' });
  });
  return {
    refreshProfile,
    finishPasswordRecovery: () => emit({ isPasswordRecovery: false }),
    dispose: () => { active = false; generation++; clearTimeout(timer); subscription.unsubscribe(); },
  };
}
