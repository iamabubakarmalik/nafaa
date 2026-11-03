/** Manage expense or income categories: rename, color, icon, delete. Needs internet (shop settings). */

import { Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '@/core/api/errors';
import { useOnlineStatus } from '@/core/net';
import { t } from '@/core/i18n';
import { onlineNeededText } from '@/core/offline';
import { Button, Chip, Icon, IconButton, Input, ListGroup, ListRow, PressableScale, Sheet, Text, confirm, toast, useTheme } from '@/design';
import { expenseCategoriesApi, incomeCategoriesApi } from '../api/expenses';
import { COLORS, FIN, ICONS, categoryEmoji } from '../lib/meta';

interface Cat { id: string; name: string; color: string; icon?: string | null }

export function CategorySheet({ kind, open, onClose, categories }: { kind: 'expense' | 'income'; open: boolean; onClose: () => void; categories: Cat[] }) {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const [edit, setEdit] = useState<Cat | 'new' | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState('');
  const api = kind === 'expense' ? expenseCategoriesApi : incomeCategoriesApi;

  const refresh = () => { void qc.invalidateQueries({ queryKey: [FIN] }); void qc.invalidateQueries({ queryKey: ['offline', 'meta', 'list'] }); };
  const save = useMutation({
    mutationFn: async () => {
      const body = kind === 'expense' ? { name: name.trim(), color, icon: icon || undefined } : { name: name.trim(), color };
      if (edit && edit !== 'new') return (api as typeof expenseCategoriesApi).update(edit.id, body);
      return (api as typeof expenseCategoriesApi).create(body);
    },
    onSuccess: () => { toast.success(t('Category save ho gayi')); setEdit(null); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => { toast.success(t('Category hat gayi')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const start = (c: Cat | 'new') => {
    if (!online) { toast.warning(onlineNeededText('settings')); return; }
    setEdit(c);
    setName(c === 'new' ? '' : c.name);
    setColor(c === 'new' ? COLORS[0] : c.color);
    setIcon(c === 'new' ? '' : c.icon ?? '');
  };

  return (
    <Sheet open={open} onClose={onClose} title={edit ? (edit === 'new' ? t('Nayi category') : t('Category badlein')) : t('Categories')}
      footer={edit
        ? <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => setEdit(null)}>{t('Cancel')}</Button>
          <Button style={{ flex: 1 }} loading={save.isPending} disabled={!name.trim()} onPress={() => save.mutate()}>{t('Save')}</Button>
        </View>
        : <Button fullWidth icon={Plus} onPress={() => start('new')}>{t('New')}</Button>}>
      {edit ? (
        <View style={{ gap: th.space(4) }}>
          <Input label={t('Naam')} value={name} onChangeText={setName} maxLength={40} autoFocus />
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" weight="medium">{t('Rang')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2.5) }}>
              {COLORS.map((c) => (
                <PressableScale key={c} onPress={() => setColor(c)} accessibilityLabel={c} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: th.colors.text }} />
              ))}
            </View>
          </View>
          {kind === 'expense' && (
            <View style={{ gap: th.space(2) }}>
              <Text size="sm" weight="medium">{t('Icon')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
                {ICONS.map((i) => <Chip key={i} label={i} selected={icon === i} onPress={() => setIcon(icon === i ? '' : i)} />)}
              </View>
            </View>
          )}
        </View>
      ) : categories.length === 0 ? (
        <Text tone="muted" align="center">{t('Abhi koi category nahi')}</Text>
      ) : (
        <ListGroup>
          {categories.map((c) => (
            <ListRow key={c.id} title={c.name} leading={<View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.color, alignItems: 'center', justifyContent: 'center' }}>{categoryEmoji(c.icon) ? <Text>{categoryEmoji(c.icon)}</Text> : null}</View>}
              onPress={() => start(c)}
              trailing={<IconButton icon={Trash2} label={t('Delete')} variant="danger" size="sm" onPress={async () => {
                if (!online) { toast.warning(onlineNeededText('settings')); return; }
                if (await confirm({ title: t('"{{name}}" category mita dein?', { name: c.name }), message: t('Purane records waise hi rahenge.'), tone: 'danger', confirmLabel: t('Delete') })) remove.mutate(c.id);
              }} />} />
          ))}
        </ListGroup>
      )}
    </Sheet>
  );
}
