import { useState, useEffect, useRef, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onSuccess: () => void;
}

type Mode = 'loading' | 'enroll' | 'verify' | 'error';

export function MFAPage({ onSuccess }: Props) {
  const [mode,        setMode]        = useState<Mode>('loading');
  const [qrCode,      setQrCode]      = useState('');   // data URI from Supabase
  const [secret,      setSecret]      = useState('');   // manual entry fallback
  const [factorId,    setFactorId]    = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code,        setCode]        = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showSecret,  setShowSecret]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Create a fresh challenge (called on mount and after failed verify)
  const createChallenge = async (fId: string) => {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId: fId });
    if (error || !data) throw error ?? new Error('Challenge failed');
    setChallengeId(data.id);
    return data.id;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;

        const verified = (factorsData?.totp ?? []).filter(f => f.status === 'verified');

        if (verified.length === 0) {
          // ── First-time: enroll a new TOTP factor ──
          const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
            factorType:   'totp',
            issuer:       'Jarvis IG Alerts',
            friendlyName: 'Authenticator',
          });
          if (enrollError || !enrollData) throw enrollError ?? new Error('Enroll failed');

          setQrCode(enrollData.totp.qr_code);
          setSecret(enrollData.totp.secret);
          setFactorId(enrollData.id);
          await createChallenge(enrollData.id);
          setMode('enroll');
        } else {
          // ── Returning user: just verify ──
          const fId = verified[0].id;
          setFactorId(fId);
          await createChallenge(fId);
          setMode('verify');
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Setup failed');
        setMode('error');
      }
    };

    init();
  }, []);

  // Auto-focus code input when mode is ready
  useEffect(() => {
    if (mode === 'enroll' || mode === 'verify') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mode]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });

    if (error) {
      setError('Incorrect code — try again.');
      setCode('');
      setLoading(false);
      // Get a fresh challenge so the next attempt works
      try { await createChallenge(factorId); } catch { /* ignore */ }
      inputRef.current?.focus();
    } else {
      onSuccess();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSuccess();
  };

  // ── Loading ──
  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 text-sm">Setting up authenticator…</div>
      </div>
    );
  }

  // ── Error ──
  if (mode === 'error') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-rose-400 text-sm mb-4">{error}</p>
          <button onClick={handleSignOut} className="text-xs text-zinc-500 hover:text-zinc-300 underline">
            Sign out and try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl">{mode === 'enroll' ? '🔐' : '🛡️'}</span>
          <h1 className="mt-3 text-xl font-bold text-zinc-100 tracking-tight">
            {mode === 'enroll' ? 'Set up authenticator' : 'Two-factor authentication'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {mode === 'enroll'
              ? 'Scan the QR code with your authenticator app'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">

          {/* QR code (enroll only) */}
          {mode === 'enroll' && qrCode && (
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl">
                  <img src={qrCode} alt="TOTP QR code" className="w-44 h-44" />
                </div>
              </div>

              {/* Manual secret fallback */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowSecret(v => !v)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors"
                >
                  {showSecret ? 'Hide' : "Can't scan? Enter key manually"}
                </button>
                {showSecret && (
                  <div className="mt-2 bg-zinc-800 rounded-lg px-3 py-2 font-mono text-xs
                                  text-zinc-300 break-all select-all border border-zinc-700">
                    {secret}
                  </div>
                )}
              </div>

              <p className="text-xs text-zinc-600 text-center leading-relaxed">
                Use <strong className="text-zinc-400">Google Authenticator</strong>,{' '}
                <strong className="text-zinc-400">Authy</strong>, or any TOTP app.
                After scanning, enter the 6-digit code below.
              </p>
            </div>
          )}

          {/* Code input + verify */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-zinc-400">
                {mode === 'enroll' ? 'Confirm code from app' : '6-digit code'}
              </label>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="one-time-code"
                required
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3
                           text-center text-2xl font-mono tracking-[0.5em] text-zinc-100
                           placeholder-zinc-700 focus:outline-none focus:border-rose-500
                           transition-colors"
                placeholder="000000"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50
                            rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={code.length !== 6 || loading}
              className="w-full bg-rose-600 hover:bg-rose-700
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {loading ? 'Verifying…' : mode === 'enroll' ? 'Activate & Continue' : 'Verify'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={handleSignOut}
            className="text-xs text-zinc-700 hover:text-zinc-400 transition-colors"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
