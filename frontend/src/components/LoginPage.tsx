import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: Props) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // AuthGate's onAuthStateChange will fire and move to needs_mfa or authed
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl">📸</span>
          <h1 className="mt-3 text-xl font-bold text-zinc-100 tracking-tight">Story Alerts</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to your dashboard</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4"
        >
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5
                         text-sm text-zinc-100 placeholder-zinc-600
                         focus:outline-none focus:border-rose-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-400">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5
                         text-sm text-zinc-100 placeholder-zinc-600
                         focus:outline-none focus:border-rose-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50
                          rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed
                       text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-700">
          MFA required on next step
        </p>
      </div>
    </div>
  );
}
