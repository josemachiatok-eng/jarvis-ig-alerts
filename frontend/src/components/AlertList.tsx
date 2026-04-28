import { AlertCard } from './AlertCard';
import type { Alert, Account, Tag } from '../types';

interface Props {
  alerts: Alert[];
  accounts: Map<string, Account>;
  selectedId: string | null;
  onSelect: (alert: Alert) => void;
  onMarkArchived: (id: string) => void;
  onDelete: (id: string) => void;
  onTagChange: (username: string, tag: Tag) => void;
}

export function AlertList({ alerts, accounts, selectedId, onSelect, onMarkArchived, onDelete, onTagChange }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
        <p className="text-2xl text-zinc-700 mb-2">✓</p>
        <p className="text-sm text-zinc-600">No alerts match your filters.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {alerts.map(alert => (
        <AlertCard
          key={alert.id}
          alert={alert}
          account={accounts.get(alert.username)}
          isSelected={alert.id === selectedId}
          onSelect={onSelect}
          onMarkArchived={onMarkArchived}
          onDelete={onDelete}
          onTagChange={onTagChange}
        />
      ))}
    </div>
  );
}
