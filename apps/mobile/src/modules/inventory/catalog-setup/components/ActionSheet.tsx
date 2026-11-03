/** A sheet of actions for one row (the web's "…" menu), tap-friendly. */

import type { LucideIcon } from 'lucide-react-native';
import { ListRow, Sheet } from '@/design';

export interface SheetAction { icon: LucideIcon; label: string; onPress: () => void; destructive?: boolean; hidden?: boolean }

export function ActionSheet({ open, onClose, title, actions }: { open: boolean; onClose: () => void; title?: string; actions: SheetAction[] }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {actions.filter((a) => !a.hidden).map((a) => (
        <ListRow key={a.label} icon={a.icon} title={a.label} destructive={a.destructive} dense
          onPress={() => { onClose(); setTimeout(a.onPress, 250); }} />
      ))}
    </Sheet>
  );
}
