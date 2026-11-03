/**
 * Branch switcher (web ShopSelector) and workspace switcher.
 * Owners pick any branch or "All shops"; staff see their own branch only.
 * Switching clears cached data so no screen shows the old branch's numbers.
 */

import { Check, Globe, Layers, Lock, MapPin, Store, Warehouse } from 'lucide-react-native';
import { router } from 'expo-router';
import { Linking, View } from 'react-native';
import { t } from '@/core/i18n';
import { useAuthStore, isOwnerRole } from '@/core/auth/store';
import { ALL_SHOPS } from '@/core/auth/shopScope';
import { useShops } from '@/core/auth/useShops';
import { APP_URL } from '@/core/api/client';
import { Badge, Icon, ListGroup, ListRow, SkeletonRows, Sheet, Text, toast, useTheme } from '@/design';
import { useShellUi } from '../hooks/useShellUi';
import { WORKSPACES, type WorkspaceId } from '../navigation/nav-config';
import { BrandMark } from './BrandMark';

export function ShopSheet() {
  const th = useTheme();
  const sheet = useShellUi((s) => s.sheet);
  const close = useShellUi((s) => s.close);
  const open = useShellUi((s) => s.open);
  const workspace = useShellUi((s) => s.workspace);
  const user = useAuthStore((s) => s.user);
  const current = useAuthStore((s) => s.currentShopId);
  const setShop = useAuthStore((s) => s.setCurrentShop);
  const { data: shops, isLoading } = useShops();
  const owner = isOwnerRole(user?.role);
  const list = (shops ?? []).filter((s) => s.isActive !== false && (owner || s.id === user?.shopId));

  const pick = (id: string, name: string) => {
    close();
    if (id === current) return;
    setShop(id);
    toast.success(t('{{name}} khul gayi', { name }), { message: id === ALL_SHOPS ? t('Reports and lists now combine every branch.') : t('POS, cash register and reports now use this branch.') });
    router.replace('/');
  };

  return (
    <Sheet open={sheet === 'shop'} onClose={close} title={t('Branches')} description={owner ? t('Kis branch ka kaam dekhna hai?') : t('Aap apni branch par kaam karte hain')}>
      <View style={{ gap: th.space(3) }}>
        <ListGroup>
          <ListRow
            leading={<BrandMark size={38} />}
            title={t(WORKSPACES[workspace].label)}
            subtitle={t('Workspace badlein')}
            chevron
            onPress={() => { close(); setTimeout(() => open('workspace'), 250); }}
          />
        </ListGroup>
        {isLoading ? <SkeletonRows count={3} /> : (
          <ListGroup>
            {owner && list.length > 1 && (
              <ListRow
                icon={Layers}
                iconTone="accent"
                title={t('All shops')}
                subtitle={t('Har branch ka hisaab ek saath')}
                selected={current === ALL_SHOPS}
                trailing={current === ALL_SHOPS ? <Icon icon={Check} size={20} tone="brand" /> : undefined}
                onPress={() => pick(ALL_SHOPS, t('All shops'))}
              />
            )}
            {list.map((s) => {
              const on = s.id === current;
              return (
                <ListRow
                  key={s.id}
                  icon={s.type === 'WAREHOUSE' || s.type === 'GODOWN' ? Warehouse : s.isMain ? Store : MapPin}
                  iconTone={on ? 'brand' : 'neutral'}
                  title={s.name}
                  subtitle={s.address || undefined}
                  selected={on}
                  trailing={on ? <Icon icon={Check} size={20} tone="brand" /> : s.isMain ? <Badge tone="brand">{t('Main')}</Badge> : !owner ? <Icon icon={Lock} size={16} tone="subtle" /> : undefined}
                  onPress={owner ? () => pick(s.id, s.name) : undefined}
                />
              );
            })}
          </ListGroup>
        )}
      </View>
    </Sheet>
  );
}

export function WorkspaceSheet() {
  const th = useTheme();
  const sheet = useShellUi((s) => s.sheet);
  const close = useShellUi((s) => s.close);
  const workspace = useShellUi((s) => s.workspace);
  const setWorkspace = useShellUi((s) => s.setWorkspace);
  return (
    <Sheet open={sheet === 'workspace'} onClose={close} title={t('Workspaces')} description={t('Same data, different tools')}>
      <View style={{ gap: th.space(3) }}>
        <ListGroup>
          {(Object.keys(WORKSPACES) as WorkspaceId[]).map((id) => {
            const ws = WORKSPACES[id];
            const on = id === workspace;
            const onWebOnly = id === 'marketplace';
            return (
              <ListRow
                key={id}
                icon={ws.icon === Globe ? Globe : Store}
                iconTone={on ? 'brand' : 'neutral'}
                title={t(ws.label)}
                subtitle={onWebOnly ? t('Abhi web par — {{url}}', { url: APP_URL.replace(/^https?:\/\//, '') }) : t(ws.description)}
                selected={on}
                trailing={on ? <Icon icon={Check} size={20} tone="brand" /> : undefined}
                onPress={() => {
                  close();
                  if (onWebOnly) {
                    void Linking.openURL(`${APP_URL}/marketplace/dashboard`);
                    return;
                  }
                  setWorkspace(id);
                }}
              />
            );
          })}
        </ListGroup>
        <Text size="xs" tone="muted">{t('Products, sales and customers stay in sync across workspaces.')}</Text>
      </View>
    </Sheet>
  );
}
