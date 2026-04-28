import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Alert, Account, Filters, Tag } from '../types';

function applyFilters(
  alerts: Alert[],
  accounts: Map<string, Account>,
  filters: Filters,
): Alert[] {
  let result = [...alerts];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(a => a.username.toLowerCase().includes(q));
  }

  if (filters.tags.length > 0) {
    result = result.filter(a => {
      const tag = accounts.get(a.username)?.tag ?? 'other';
      return filters.tags.includes(tag);
    });
  }

  if (!filters.showRead)     result = result.filter(a => !a.is_read);
  if (!filters.showArchived) result = result.filter(a => !a.is_archived);

  result.sort((a, b) => {
    let av: string | number, bv: string | number;
    if (filters.sortField === 'detected_at') { av = a.detected_at; bv = b.detected_at; }
    else if (filters.sortField === 'username') { av = a.username; bv = b.username; }
    else { av = a.story_count; bv = b.story_count; }
    if (av < bv) return filters.sortDir === 'asc' ? -1 : 1;
    if (av > bv) return filters.sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  return result;
}

export function useAlerts(filters: Filters) {
  const [allAlerts, setAllAlerts]   = useState<Alert[]>([]);
  const [accounts,  setAccounts]    = useState<Map<string, Account>>(new Map());
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [alertsRes, accountsRes] = await Promise.all([
        supabase
          .from('alerts')
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(500),
        supabase.from('accounts').select('*'),
      ]);
      if (alertsRes.error)   throw alertsRes.error;
      if (accountsRes.error) throw accountsRes.error;

      setAllAlerts(alertsRes.data ?? []);

      const map = new Map<string, Account>();
      (accountsRes.data ?? []).forEach((a: Account) => map.set(a.username, a));
      setAccounts(map);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        ({ new: row }) => setAllAlerts(prev => [row as Alert, ...prev]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'alerts' },
        ({ new: row }) =>
          setAllAlerts(prev =>
            prev.map(a => (a.id === (row as Alert).id ? (row as Alert) : a)),
          ),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'alerts' },
        ({ old: row }) =>
          setAllAlerts(prev => prev.filter(a => a.id !== (row as { id: string }).id)),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const markRead = useCallback(async (id: string, read = true) => {
    await supabase.from('alerts').update({ is_read: read }).eq('id', id);
    setAllAlerts(prev => prev.map(a => (a.id === id ? { ...a, is_read: read } : a)));
  }, []);

  const markArchived = useCallback(async (id: string) => {
    await supabase
      .from('alerts')
      .update({ is_archived: true, is_read: true })
      .eq('id', id);
    setAllAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, is_archived: true, is_read: true } : a)),
    );
  }, []);

  const deleteAlert = useCallback(async (id: string) => {
    await supabase.from('alerts').delete().eq('id', id);
    setAllAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const updateNote = useCallback(async (id: string, note: string) => {
    await supabase.from('alerts').update({ note }).eq('id', id);
    setAllAlerts(prev => prev.map(a => (a.id === id ? { ...a, note } : a)));
  }, []);

  const updateAccountTag = useCallback(async (username: string, tag: Tag) => {
    await supabase.from('accounts').update({ tag }).eq('username', username);
    setAccounts(prev => {
      const next = new Map(prev);
      const acc  = next.get(username);
      if (acc) next.set(username, { ...acc, tag });
      return next;
    });
  }, []);

  const markAllRead = useCallback(async () => {
    const ids = allAlerts
      .filter(a => !a.is_read && !a.is_archived)
      .map(a => a.id);
    if (ids.length === 0) return;
    await supabase.from('alerts').update({ is_read: true }).in('id', ids);
    setAllAlerts(prev =>
      prev.map(a => (ids.includes(a.id) ? { ...a, is_read: true } : a)),
    );
  }, [allAlerts]);

  const unreadCount = allAlerts.filter(a => !a.is_read && !a.is_archived).length;
  const filtered    = applyFilters(allAlerts, accounts, filters);

  return {
    alerts: filtered,
    allAlerts,
    accounts,
    loading,
    error,
    unreadCount,
    markRead,
    markArchived,
    deleteAlert,
    updateNote,
    updateAccountTag,
    markAllRead,
    refetch: fetchAll,
  };
}
