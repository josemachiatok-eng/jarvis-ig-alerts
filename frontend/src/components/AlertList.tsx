import { AlertCard } from './AlertCard';
import type { Alert, Account, Tag } from '../types';

interface Props {
  alerts: Alert[];
  accounts: Map<string, Account>;
  onMarkRead: (id: string) => void;
  onMarkArchived: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenNote: (alert: Alert) => void;
  onTagChange: (username: string, tag: Tag) => void;
}

export function AlertList({
  alerts,
  accounts,
  onMarkRead,
  onMarkArchived,
  onDelete,
  onOpenNote,
  onTagChange,
}: Props) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-24 text-zinc-600">
        <p className="text-3xl mb-3">✓</p>
        <p className="text-sm">No alerts match your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <AlertCard
          key={alert.id}
          alert={alert}
          account={accounts.get(alert.username)}
          onMarkRead={onMarkRead}
          onMarkArchived={onMarkArchived}
          onDelete={onDelete}
          onOpenNote={onOpenNote}
          onTagChange={onTagChange}
        />
      ))}
    </div>
  );
}
