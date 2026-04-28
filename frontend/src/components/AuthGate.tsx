import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoginPage } from './LoginPage';
import { MFAPage } from './MFAPage';

type AuthState = 'loading' | 'signed_out' | 'needs_mfa' | 'authed';

interface Props {
  children: React.ReactNode;
}

const IDLE_MS    = 4 * 60 * 60 * 1000; // 4 hours
const TIMEOUT_MS = 12_000;             // 12 s per Supabase call

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms),
    ),
  ]);
}

export function AuthGate({ children }: Props) {
  const [state, setState] = useState<AuthState>('loading');
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signOutIdle = useCallback(() => {
    supabase.auth.signOut();
    setState('signed_out');
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(signOutIdle, IDLE_MS);
  }, [signOutIdle]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'pointerdown', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  const refresh = useCallback(async () => {
    try {
      const { data: sessionData } = await withTimeout(
        supabase.auth.getSession(),
        TIMEOUT_MS,
      );

      if (!sessionData.session) {
        setState('signed_out');
        return;
      }

      const { data: aalData } = await withTimeout(
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        TIMEOUT_MS,
      );

      if (aalData?.currentLevel === 'aal2') {
        setState('authed');
      } else {
        setState('needs_mfa');
      }
    } catch {
      setState('signed_out');
    }
  }, []);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // TOKEN_REFRESHED fires every hour automatically — no need to re-check MFA level.
      // INITIAL_SESSION is handled by the refresh() call above on mount.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'MFA_CHALLENGE_VERIFIED') {
        refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <div className="text-zinc-600 text-sm">Checking session…</div>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-zinc-800 hover:text-zinc-500 transition-colors underline"
        >
          Taking too long? Click to reload
        </button>
      </div>
    );
  }

  if (state === 'signed_out') return <LoginPage  onSuccess={refresh} />;
  if (state === 'needs_mfa')  return <MFAPage    onSuccess={refresh} />;
  return <>{children}</>;
}
