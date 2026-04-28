import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoginPage } from './LoginPage';
import { MFAPage } from './MFAPage';

// Auth state machine:
//   loading      → checking session on mount
//   signed_out   → no session → show email/password form
//   needs_mfa    → aal1 session (password done, MFA pending) → show TOTP
//   authed       → aal2 session (password + TOTP verified) → show dashboard
type AuthState = 'loading' | 'signed_out' | 'needs_mfa' | 'authed';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const [state, setState] = useState<AuthState>('loading');

  const refresh = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setState('signed_out');
      return;
    }
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel === 'aal2') {
      setState('authed');
    } else {
      // aal1: password verified but MFA not yet completed (or not enrolled)
      setState('needs_mfa');
    }
  };

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => refresh());
    return () => subscription.unsubscribe();
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 text-sm">Checking session…</div>
      </div>
    );
  }

  if (state === 'signed_out')  return <LoginPage  onSuccess={refresh} />;
  if (state === 'needs_mfa')   return <MFAPage    onSuccess={refresh} />;
  return <>{children}</>;
}
