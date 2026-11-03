/**
 * "Online store" sheet: every online screen this person may open, so the
 * whole online business is one tap away from the order desk.
 */

import { router } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';
import { useState } from 'react';
import { t } from '@/core/i18n';
import { usePermission } from '@/core/permissions';
import { IconButton, ListGroup, ListRow, Sheet } from '@/design';
import { ONLINE_LINKS } from '../lib/nav';

export function OnlineMenuButton({ current }: { current?: string }) {
  const [open, setOpen] = useState(false);
  const can = usePermission();
  const links = ONLINE_LINKS.filter((l) => l.href !== current && can(l.permission));
  return (
    <>
      <IconButton icon={LayoutGrid} label={t('Online store')} onPress={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title={t('Online store')}>
        <ListGroup>
          {links.map((l) => (
            <ListRow key={l.href} icon={l.icon} iconTone="brand" title={t(l.label)} subtitle={l.hint ? t(l.hint) : undefined} chevron dense
              onPress={() => { setOpen(false); setTimeout(() => router.push(l.href as never), 200); }} />
          ))}
        </ListGroup>
      </Sheet>
    </>
  );
}
