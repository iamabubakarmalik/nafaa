/**
 * "Online store" sheet: every online screen this person may open, in the
 * web commerce workspace groups, so the whole online business is one tap
 * away from any online screen.
 */

import { router } from 'expo-router';
import { ExternalLink, LayoutGrid } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { usePermission } from '@/core/permissions';
import { IconButton, ListGroup, ListRow, Sheet, Text, useTheme } from '@/design';
import { COMMERCE_GROUPS, type OnlineLink } from '../lib/nav';
import { getExtraLinks } from '../lib/extensions';
import { openOnWeb } from '../lib/device';

export function OnlineMenuButton({ current }: { current?: string }) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  const can = usePermission();
  const extras = getExtraLinks();
  const allowed = (l: OnlineLink) => l.href !== current && can(l.permission) && (!l.alsoNeeds || can(l.alsoNeeds));
  const go = (l: OnlineLink) => {
    setOpen(false);
    setTimeout(() => (l.web ? openOnWeb(l.web) : router.push(l.href as never)), 200);
  };
  return (
    <>
      <IconButton icon={LayoutGrid} label={t('Online store')} onPress={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title={t('Online store')}>
        <View style={{ gap: th.space(3) }}>
          {COMMERCE_GROUPS.map((g) => {
            const links = [...g.links, ...extras.filter((x) => x.group === g.id)].filter(allowed);
            if (!links.length) return null;
            return (
              <View key={g.id} style={{ gap: th.space(1.5) }}>
                <Text size="xs" weight="semibold" tone="muted" style={{ paddingHorizontal: th.space(1) }}>{t(g.label)}</Text>
                <ListGroup>
                  {links.map((l) => (
                    <ListRow key={l.href} icon={l.icon} iconTone="brand" title={t(l.label)} subtitle={l.hint ? t(l.hint) : undefined} dense
                      chevron={!l.web} trailing={l.web ? <ExternalLink size={16} color={th.colors.textMuted} /> : undefined} onPress={() => go(l)} />
                  ))}
                </ListGroup>
              </View>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}
