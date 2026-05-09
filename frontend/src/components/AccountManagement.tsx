import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { MonitoredAccount, Account } from '../types';
import { tagColors } from '../lib/tagColors';

interface Props {
  accounts:      Map<string, Account>;
  onUpdateAccount: (username: string, updates: Partial<Account>) => void;
}

export function AccountManagement({ accounts, onUpdateAccount }: Props) {
  const [monitored, setMonitored] = useState<MonitoredAccount[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [newUser,   setNewUser]   = useState('');
  const [adding,    setAdding]    = useState(false);
  const [search,    setSearch]    = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('monitored_accounts')
      .select('*')
      .order('username');
    setMonitored((data ?? []) as MonitoredAccount[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addAccount = async () => {
    const u = newUser.trim().toLowerCase().replace(/^@/, '');
    if (!u) return;
    setAdding(true);
    await supabase.from('monitored_accounts')
      .upsert({ username: u, is_active: true }, { onConflict: 'username' });
    // Also ensure account row exists
    await supabase.from('accounts')
      .insert({ username: u })
      .select()
      .maybeSingle();
    setNewUser('');
    await load();
    setAdding(false);
  };

  const toggleActive = async (username: string, is_active: boolean) => {
    await supabase.from('monitored_accounts').update({ is_active }).eq('username', username);
    setMonitored(prev => prev.map(m => m.username === username ? { ...m, is_active } : m));
    // Also update paused state on account
    onUpdateAccount(username, { is_paused: !is_active });
  };

  const removeAccount = async (username: string) => {
    if (!confirm(`Remove @${username} from monitoring?`)) return;
    await supabase.from('monitored_accounts').delete().eq('username', username);
    setMonitored(prev => prev.filter(m => m.username !== username));
  };

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return monitored.filter(m => m.username.toLowerCase().includes(q));
  }, [monitored, search]);

  const active   = visible.filter(m => m.is_active).length;
  const inactive = visible.filter(m => !m.is_active).length;

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <span className="text-[15px] font-medium text-zinc-100 flex-1">⚙ Account Management</span>
        <span className="text-xs text-zinc-500">{active} active · {inactive} paused</span>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-40 px-3 py-[5px] rounded-lg border border-zinc-700 bg-zinc-800
                     text-xs text-zinc-100 placeholder-zinc-500
                     focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>

      {/* Add account bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900/60 border-b border-zinc-800 flex-shrink-0">
        <input
          type="text"
          placeholder="@username to add…"
          value={newUser}
          onChange={e => setNewUser(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addAccount()}
          className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800
                     text-xs text-zinc-100 placeholder-zinc-500
                     focus:outline-none focus:border-zinc-500 transition-colors"
        />
        <button
          onClick={addAccount}
          disabled={adding || !newUser.trim()}
          className="px-4 py-1.5 rounded-lg border border-zinc-600 bg-zinc-800 text-xs text-zinc-300
                     hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-40
                     disabled:cursor-not-allowed transition-colors"
        >
          {adding ? 'Adding…' : '+ Add'}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-sm text-zinc-600">No accounts found.</p>
          </div>
        ) : visible.map(m => {
          const acc    = accounts.get(m.username);
          const tag    = acc?.tag ?? 'other';
          const colors = tagColors(tag);
          return (
            <div
              key={m.username}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/60
                         hover:bg-zinc-800/30 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center
                               text-xs font-bold uppercase flex-none
                               ${m.is_active ? colors.avatar : 'bg-zinc-800 text-zinc-600'}`}>
                {m.username[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-medium truncate ${m.is_active ? 'text-zinc-200' : 'text-zinc-500'}`}>
                    @{m.username}
                  </span>
                  {!m.is_active && (
                    <span className="text-[10px] text-zinc-600 border border-zinc-700 px-1 rounded">paused</span>
                  )}
                </div>
                {acc?.display_name && (
                  <div className="text-[11px] text-zinc-600 truncate">{acc.display_name}</div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-none">
                {/* Pause / Resume toggle */}
                <button
                  onClick={() => toggleActive(m.username, !m.is_active)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                    m.is_active
                      ? 'border-zinc-700 text-zinc-500 hover:border-amber-700/50 hover:text-amber-400'
                      : 'border-emerald-800/50 text-emerald-500 hover:bg-emerald-950/30'
                  }`}
                >
                  {m.is_active ? '⏸ Pause' : '▶ Resume'}
                </button>
                {/* Remove */}
                <button
                  onClick={() => removeAccount(m.username)}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-950/30
                             transition-colors text-xs"
                  title="Remove from monitoring"
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
