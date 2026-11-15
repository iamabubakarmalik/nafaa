/**
 * Alert settings for the signed-in admin: which categories alert them, toast,
 * sound and desktop alerts, and quiet hours (Pakistan time). Saved on the
 * server per admin, so they follow the admin to any browser. Desktop
 * permission is asked only from the button here.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BellRing, Monitor, Moon, Volume2 } from 'lucide-react';
import { Alert, Button, Drawer, Field, Input, Switch } from '@/design-system/components';
import { adminNotificationsApi, NOTIFY_CATEGORIES, type NotifyPrefs } from '@/api/admin-notifications.api';
import { askDesktopPermission, desktopState, playChime, type DesktopState } from '../lib/alerts';
import { CATEGORY_META } from '../lib/meta';
import { FEED_KEY } from '../hooks/useNotificationFeed';

export const PREFS_KEY = ['admin-notify-prefs'] as const;

const DESKTOP_TEXT: Record<DesktopState, string> = {
  unsupported: 'This browser cannot show desktop alerts.',
  default: 'Allow this browser to show alerts while the admin tab is in the background.',
  granted: 'Allowed in this browser. Alerts show when the admin tab is in the background.',
  denied: 'Blocked in this browser. Allow notifications for this site in the browser settings.',
};

export function AlertSettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const prefs = useQuery({ queryKey: PREFS_KEY, queryFn: adminNotificationsApi.prefs, enabled: open });
  const stats = useQuery({ queryKey: ['admin-notifications-stats'], queryFn: adminNotificationsApi.stats, enabled: open, staleTime: 30_000 });
  const [draft, setDraft] = useState<NotifyPrefs | null>(null);
  const [desktop, setDesktop] = useState<DesktopState>(desktopState);

  useEffect(() => {
    if (open && prefs.data) setDraft(prefs.data);
    if (open) setDesktop(desktopState());
  }, [open, prefs.data]);

  const save = useMutation({
    mutationFn: adminNotificationsApi.savePrefs,
    onSuccess: (data) => {
      qc.setQueryData(PREFS_KEY, data);
      qc.invalidateQueries({ queryKey: FEED_KEY });
      toast.success('Alert settings saved');
      onClose();
    },
    onError: () => toast.error('Could not save the alert settings'),
  });

  const set = (patch: Partial<NotifyPrefs>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const allowed = stats.data?.categories ?? NOTIFY_CATEGORIES;

  const allow = async () => {
    const state = await askDesktopPermission();
    setDesktop(state);
    if (state === 'granted') set({ desktop: true });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Alert settings"
      description="How new notifications reach you. Only you get these settings."
      icon={<BellRing className="h-5 w-5" />}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => draft && save.mutate(draft)} loading={save.isPending} disabled={!draft}>Save</Button>
        </div>
      }
    >
      {!draft ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="text-[0.8125rem] font-semibold text-slate-900">Alert me about</h3>
            <p className="mt-0.5 text-[0.75rem] text-slate-500">Everything still lands in the notification center. These choose what pops up.</p>
            <div className="mt-3 space-y-3">
              {allowed.map((c) => (
                <Switch
                  key={c}
                  label={CATEGORY_META[c].label}
                  description={CATEGORY_META[c].hint}
                  checked={draft.categories[c]}
                  onChange={(e) => set({ categories: { ...draft.categories, [c]: e.target.checked } })}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-5">
            <h3 className="text-[0.8125rem] font-semibold text-slate-900">How</h3>
            <Switch label="Pop-up in the corner" description="A short message with a link, while you use the admin panel." checked={draft.toast} onChange={(e) => set({ toast: e.target.checked })} />
            <div className="flex items-center gap-3">
              <Switch className="flex-1" label="Sound" description="A soft chime; critical alerts sound different." checked={draft.sound} onChange={(e) => set({ sound: e.target.checked })} />
              <Button size="sm" variant="outline" leftIcon={<Volume2 className="h-3.5 w-3.5" />} onClick={() => playChime('info')}>Test</Button>
            </div>
            <Switch label="Desktop alerts" description="When the admin tab is in the background." checked={draft.desktop} onChange={(e) => set({ desktop: e.target.checked })} />
            {draft.desktop && (
              <Alert
                tone={desktop === 'granted' ? 'success' : desktop === 'denied' ? 'warning' : 'info'}
                action={desktop === 'default' ? <Button size="sm" leftIcon={<Monitor className="h-3.5 w-3.5" />} onClick={allow}>Allow desktop alerts</Button> : undefined}
              >
                {DESKTOP_TEXT[desktop]}
              </Alert>
            )}
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-5">
            <Switch
              label={<span className="inline-flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" /> Quiet hours</span>}
              description="No sound or desktop alerts in this time (Pakistan time). Pop-ups and the inbox keep working."
              checked={draft.quietHours.enabled}
              onChange={(e) => set({ quietHours: { ...draft.quietHours, enabled: e.target.checked } })}
            />
            {draft.quietHours.enabled && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="From">{(id) => <Input id={id} type="time" value={draft.quietHours.start} onChange={(e) => set({ quietHours: { ...draft.quietHours, start: e.target.value } })} />}</Field>
                  <Field label="To">{(id) => <Input id={id} type="time" value={draft.quietHours.end} onChange={(e) => set({ quietHours: { ...draft.quietHours, end: e.target.value } })} />}</Field>
                </div>
                <Switch label="Critical alerts still sound" description="Failed jobs, accounts that need reconnecting and similar." checked={draft.criticalInQuiet} onChange={(e) => set({ criticalInQuiet: e.target.checked })} />
              </>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
