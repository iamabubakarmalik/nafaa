/**
 * Team tools for one order or many picked orders: assign to a staff
 * member, set a follow-up (when to contact again, with a note) and tags.
 * One order uses the order endpoints, many use the board's bulk tool.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRound, UserX } from 'lucide-react-native';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { Button, ChipGroup, DatePicker, Input, ListGroup, ListRow, Sheet, Text, toast, useTheme } from '@/design';
import { teamApi } from '@/modules/organization/api/organization';
import { apiErrorMessage, ordersApi } from '../../api/online';
import { boardApi, type BulkResult } from '../../api/board';
import { QUICK_TAGS } from '../../lib/labels';
import { refreshOrders } from '../../lib/online';

export function useTeam() {
  return useQuery({ queryKey: ['team'], queryFn: () => teamApi.list().catch(() => []), staleTime: 5 * 60_000 });
}

export type TeamTool = 'assign' | 'follow-up' | 'tag';

/** Shows how a bulk run went; returns the ids that failed. */
export function reportBulk(results: BulkResult[], done: string): string[] {
  const ok = results.filter((r) => r.ok).length;
  if (ok) { haptic('success'); toast.success(t('{{count}} orders · {{done}}', { count: ok, done })); }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) toast.error(t('{{count}} order nahi hue', { count: failed.length }), { message: failed.slice(0, 3).map((f) => f.error ?? '').join('\n'), duration: 8000 });
  return failed.map((f) => f.id);
}

export function TeamToolSheet({ tool, ids, current, onClose, onDone }: {
  tool: TeamTool | null; ids: string[];
  /** Current values when one order is open. */
  current?: { assignedToId?: string | null; followUpAt?: string | null; followUpNote?: string | null; tags?: string[] };
  onClose: () => void; onDone?: (failed: string[]) => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const team = useTeam();
  const single = ids.length === 1;
  const [at, setAt] = useState<Date | null>(null);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  useEffect(() => {
    if (!tool) return;
    const base = current?.followUpAt ? new Date(current.followUpAt) : null;
    setAt(base ?? (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(11, 0, 0, 0); return d; })());
    setNote(current?.followUpNote ?? '');
    setTags(current?.tags ?? []);
    setCustom('');
  }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = useMutation({
    mutationFn: async (body: { userId?: string | null; at?: string | null; note?: string; tags?: string[] }): Promise<BulkResult[]> => {
      if (single) {
        const id = ids[0];
        if (tool === 'assign') await boardApi.assign(id, body.userId ?? null);
        else if (tool === 'follow-up') await boardApi.followUp(id, body.at ?? null, body.note);
        else await ordersApi.setTags(id, body.tags ?? []);
        return [{ id, ok: true }];
      }
      return (await boardApi.bulkTool(tool!, ids, body)).results;
    },
    onSuccess: (results) => {
      refreshOrders(qc, single ? ids[0] : undefined);
      const done = tool === 'assign' ? t('zimme laga diya') : tool === 'follow-up' ? t('follow-up lag gaya') : t('tags lag gaye');
      onDone?.(reportBulk(results, done));
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });

  const title = tool === 'assign' ? t('Kis ke zimme?') : tool === 'follow-up' ? t('Follow-up') : t('Tags');
  const members = (team.data ?? []).filter((m) => m.isActive);
  const tagOptions = [...new Set([...QUICK_TAGS, ...tags])].map((x) => ({ value: x, label: x }));

  return (
    <Sheet open={!!tool} onClose={onClose} title={title} description={single ? undefined : t('{{count}} orders', { count: ids.length })}
      footer={tool === 'assign' ? undefined : (
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          {tool === 'follow-up' && single && current?.followUpAt && (
            <Button variant="secondary" size="lg" disabled={run.isPending} onPress={() => run.mutate({ at: null })}>{t('Hatayein')}</Button>
          )}
          <Button size="lg" style={{ flex: 1 }} loading={run.isPending}
            onPress={() => run.mutate(tool === 'follow-up' ? { at: at?.toISOString() ?? null, note: note.trim() || undefined } : { tags: [...new Set([...tags, ...(custom.trim() ? [custom.trim()] : [])])] })}>
            {t('Save')}
          </Button>
        </View>
      )}>
      {tool === 'assign' && (
        <ListGroup>
          {members.map((m) => (
            <ListRow key={m.id} dense icon={UserRound} iconTone="brand" title={m.fullName} subtitle={m.email}
              selected={current?.assignedToId === m.id} disabled={run.isPending} onPress={() => run.mutate({ userId: m.id })} />
          ))}
          <ListRow dense icon={UserX} title={t('Kisi ke zimme nahi')} disabled={run.isPending} onPress={() => run.mutate({ userId: null })} />
        </ListGroup>
      )}
      {tool === 'follow-up' && (
        <View style={{ gap: th.space(3) }}>
          <DatePicker label={t('Din')} value={at} onChange={(d) => setAt((p) => { const n = new Date(d); if (p) n.setHours(p.getHours(), p.getMinutes()); return n; })} minimumDate={new Date()} />
          <DatePicker label={t('Waqt')} mode="time" value={at} onChange={(d) => setAt((p) => { const n = new Date(p ?? d); n.setHours(d.getHours(), d.getMinutes(), 0, 0); return n; })} />
          <Input label={t('Note (zaroori nahi)')} value={note} onChangeText={setNote} maxLength={200} placeholder={t('Jaise: Shaam ko call karein')} />
        </View>
      )}
      {tool === 'tag' && (
        <View style={{ gap: th.space(3) }}>
          <ChipGroup multiple wrap value={tags} onChange={setTags} options={tagOptions} />
          <Input label={t('Naya tag')} value={custom} onChangeText={setCustom} maxLength={30} />
          {!single && <Text size="xs" tone="muted">{t('Chune hue tags har order par lag jayenge.')}</Text>}
        </View>
      )}
    </Sheet>
  );
}
