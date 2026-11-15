/**
 * Support settings: working hours, the welcome and away texts (English, Urdu,
 * Roman Urdu), Nafaa AI first responder, auto-assign, offline email, sounds,
 * proactive messages (templates, agent, quiet hours, preview and results)
 * and saved replies.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, Lightbulb, MessageSquarePlus, Pencil, Play, Plus, Save, Trash2 } from 'lucide-react';
import {
  Button, Card, Input, Modal, PageHero, PageShell, Segmented, Select, Switch, Table, TBody, Td, Th, THead, Textarea, Tr, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminSupportApi } from '@/api/admin-support.api';
import { apiError } from '@/lib/errors';
import { formatRelative, num } from '@/lib/format';
import { SUPPORT_KEYS } from '../components/SupportLive';
import { SUPPORT_PROACTIVE_KEYS, type SupportCannedReply, type SupportLang, type SupportLocalized, type SupportProactiveKey, type SupportSettings } from '../lib/support.types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LANGS: Array<{ value: SupportLang; label: string }> = [{ value: 'roman', label: 'Roman Urdu' }, { value: 'en', label: 'English' }, { value: 'ur', label: 'Urdu' }];
const PROACTIVE_LABEL: Record<SupportProactiveKey, { title: string; when: string }> = {
  welcome: { title: 'Welcome', when: 'First visit to the app, or 2 minutes after sign-up' },
  day1_no_products: { title: 'No products after a day', when: 'A day after sign-up with no product yet' },
  first_sale: { title: 'First sale', when: 'The shop made its first sale (last 3 days)' },
  inactive_3d: { title: 'Not seen for 3 days', when: 'On trial and not active for 3 days' },
  trial_ending: { title: 'Trial ends in 2 days', when: 'Trial ends within 2 days, not paid' },
  trial_ended: { title: 'Trial ended', when: 'Trial ended in the last 14 days, not paid' },
};
const VARS = '{{owner}} {{agent}} {{shop}} {{products}} {{bills}} {{customers}} {{trialEnd}} {{days}} {{planLink}}';

function LocalizedField({ label, value, onChange, rows = 3, hint }: { label: string; value: SupportLocalized; onChange: (v: SupportLocalized) => void; rows?: number; hint?: string }) {
  const [lang, setLang] = useState<SupportLang>('roman');
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[0.8125rem] font-medium text-slate-700">{label}</span>
        <Segmented value={lang} onChange={setLang} label="Language" items={LANGS} />
      </div>
      <Textarea rows={rows} dir={lang === 'ur' ? 'rtl' : 'ltr'} value={value[lang]} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} hint={hint} aria-label={`${label} (${lang})`} />
    </div>
  );
}

export default function SupportSettingsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const q = useQuery({ queryKey: SUPPORT_KEYS.settings, queryFn: adminSupportApi.settings });
  const agents = useQuery({ queryKey: ['support', 'agents'], queryFn: adminSupportApi.agents, staleTime: 60_000 });
  const stats = useQuery({ queryKey: ['support', 'proactive-stats'], queryFn: adminSupportApi.proactiveStats });
  const [s, setS] = useState<SupportSettings | null>(null);
  useEffect(() => { if (q.data) setS(q.data); }, [q.data]);

  const save = useMutation({
    mutationFn: () => adminSupportApi.saveSettings(s!),
    onSuccess: (r) => { qc.setQueryData(SUPPORT_KEYS.settings, r); setS(r); toast.success('Support settings saved'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const run = useMutation({
    mutationFn: adminSupportApi.proactiveRun,
    onSuccess: (r) => { toast.success(r.sent ? `${r.sent} message(s) sent` : 'Nothing due right now'); void stats.refetch(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const [preview, setPreview] = useState<{ key: SupportProactiveKey; lang: SupportLang } | null>(null);

  if (!s) return <PageShell><PageHero title="Support settings" back="/support" backLabel="Support" loading /></PageShell>;
  const patch = (p: Partial<SupportSettings>) => setS({ ...s, ...p });
  const pro = s.proactive;
  const setPro = (p: Partial<SupportSettings['proactive']>) => patch({ proactive: { ...pro, ...p } });
  const totalSent = (stats.data ?? []).reduce((a, x) => a + x.sent, 0);
  const totalConverted = (stats.data ?? []).reduce((a, x) => a + x.converted, 0);
  const dirty = JSON.stringify(s) !== JSON.stringify(q.data);

  return (
    <PageShell>
      <PageHero
        title="Support settings"
        back="/support"
        backLabel="Support"
        busy={q.isFetching}
        actions={
          <>
            <button type="button" className={heroPrimaryButton} disabled={!dirty || save.isPending} onClick={() => save.mutate()}><Save className="h-4 w-4" /> Save</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={[
          { label: 'Nafaa AI first', value: s.aiFirstResponder ? 'On' : 'Off' },
          { label: 'Auto-assign', value: s.autoAssign === 'round_robin' ? 'Round robin' : 'Off' },
          { label: 'Proactive sent', value: num(totalSent), hint: `${num(totalConverted)} became paid within 14 days` },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Working hours (Pakistan time)" description="Outside these hours shops see the away message and the expected reply time.">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => {
                const on = s.workingHours.days.includes(i);
                return <button key={d} type="button" onClick={() => patch({ workingHours: { ...s.workingHours, days: on ? s.workingHours.days.filter((x) => x !== i) : [...s.workingHours.days, i].sort() } })}
                  className={on ? 'rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-brand-fg' : 'rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600'}>{d}</button>;
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="time" label="From" value={s.workingHours.start} onChange={(e) => patch({ workingHours: { ...s.workingHours, start: e.target.value } })} />
              <Input type="time" label="To" value={s.workingHours.end} onChange={(e) => patch({ workingHours: { ...s.workingHours, end: e.target.value } })} />
            </div>
            <Input type="number" label="Usual first reply (minutes)" min={1} value={s.expectedReplyMinutes} onChange={(e) => patch({ expectedReplyMinutes: Number(e.target.value) || 1 })} />
          </div>
        </Card>

        <Card title="How chats are handled">
          <div className="space-y-4">
            <Switch label="Nafaa AI answers first" description="Answers common questions from the help content. Shops can tap “Talk to our team” any time." checked={s.aiFirstResponder} onChange={(e) => patch({ aiFirstResponder: e.target.checked })} />
            <Select label="Auto-assign" value={s.autoAssign} onChange={(e) => patch({ autoAssign: e.target.value as SupportSettings['autoAssign'] })}
              options={[{ value: 'round_robin', label: 'Round robin among agents who are online' }, { value: 'none', label: 'Off — agents pick chats themselves' }]} />
            <Switch label="Email the shop when we reply and they are not in the app" checked={s.offlineEmail} onChange={(e) => patch({ offlineEmail: e.target.checked })} />
            <Switch label="Record calls" description="Records the audio of every support call so any issue can be checked later. Both sides see a notice when the call starts. A shared screen is recorded only when the agent presses Record." checked={s.recordCalls !== false} onChange={(e) => patch({ recordCalls: e.target.checked })} />
            <Switch label="Sound for a chat waiting for the team" checked={s.sounds.newConversation} onChange={(e) => patch({ sounds: { ...s.sounds, newConversation: e.target.checked } })} />
            <Switch label="Sound for new shop messages" checked={s.sounds.newMessage} onChange={(e) => patch({ sounds: { ...s.sounds, newMessage: e.target.checked } })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Support phone (shown to shops)" value={s.supportPhone} onChange={(e) => patch({ supportPhone: e.target.value })} hint="Empty = hidden" />
              <Input label="WhatsApp number" value={s.supportWhatsapp} onChange={(e) => patch({ supportWhatsapp: e.target.value })} hint="Digits with country code, e.g. 923001234567" />
            </div>
            <Input type="number" label="Set me Away after idle (minutes)" min={1} value={s.autoAwayMinutes} onChange={(e) => patch({ autoAwayMinutes: Number(e.target.value) || 10 })} />
          </div>
        </Card>

        <Card title="Chat texts" description="Shown to shops in their own language." className="xl:col-span-2">
          <div className="grid gap-4 lg:grid-cols-2">
            <LocalizedField label="Welcome message" value={s.welcomeMessage} onChange={(v) => patch({ welcomeMessage: v })} />
            <LocalizedField label="Away message" value={s.awayMessage} onChange={(v) => patch({ awayMessage: v })} />
          </div>
        </Card>
      </div>

      <Card title="Proactive messages" description="Messages the team sends first, so new shops feel looked after. Each goes once per shop, at most one a day, never during quiet hours, never to suspended or paused shops. Shops can turn check-ins off."
        actions={<Button size="sm" variant="secondary" leftIcon={<Play className="h-4 w-4" />} loading={run.isPending} onClick={() => run.mutate()}>Run now</Button>}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Switch label="Send proactive messages" checked={pro.enabled} onChange={(e) => setPro({ enabled: e.target.checked })} />
            <Select label="Sent as" value={pro.agentUserId ?? ''} onChange={(e) => setPro({ agentUserId: e.target.value || null })}
              options={[{ value: '', label: 'First super admin' }, ...(agents.data ?? []).map((a) => ({ value: a.id, label: a.name }))]} />
            <Input label="Name shown" placeholder="Their first name" value={pro.agentName ?? ''} onChange={(e) => setPro({ agentName: e.target.value || null })} hint="Used for {{agent}}" />
            <Input type="number" label="Welcome shops up to (days old)" min={0} value={pro.welcomeMaxAgeDays} onChange={(e) => setPro({ welcomeMaxAgeDays: Number(e.target.value) || 0 })} />
            <Input type="time" label="Quiet from" value={pro.quietHours.start} onChange={(e) => setPro({ quietHours: { ...pro.quietHours, start: e.target.value } })} />
            <Input type="time" label="Quiet until" value={pro.quietHours.end} onChange={(e) => setPro({ quietHours: { ...pro.quietHours, end: e.target.value } })} />
          </div>
          <p className="text-[0.75rem] text-slate-500">Variables: <code>{VARS}</code>. Numbers come from the shop's own data.</p>

          <Table minWidth="40rem">
            <THead><Tr><Th>Message</Th><Th align="right">Sent</Th><Th align="right">Replied</Th><Th align="right">Paid in 14 days</Th><Th>Last sent</Th></Tr></THead>
            <TBody>
              {SUPPORT_PROACTIVE_KEYS.map((k) => {
                const st = stats.data?.find((x) => x.key === k);
                return (
                  <Tr key={k}>
                    <Td>{PROACTIVE_LABEL[k].title}</Td>
                    <Td align="right">{num(st?.sent)}</Td>
                    <Td align="right">{num(st?.replied)}{st?.sent ? <span className="text-slate-400"> · {Math.round(((st.replied) / st.sent) * 100)}%</span> : null}</Td>
                    <Td align="right">{num(st?.converted)}</Td>
                    <Td>{st?.lastSentAt ? formatRelative(st.lastSentAt) : '—'}</Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>

          <div className="grid gap-4 xl:grid-cols-2">
            {SUPPORT_PROACTIVE_KEYS.map((k) => {
              const m = pro.messages[k];
              const setMsg = (p: Partial<typeof m>) => setPro({ messages: { ...pro.messages, [k]: { ...m, ...p } } });
              return (
                <div key={k} className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{PROACTIVE_LABEL[k].title}</p>
                      <p className="text-[0.75rem] text-slate-500">{PROACTIVE_LABEL[k].when}</p>
                    </div>
                    <Button size="xs" variant="ghost" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => setPreview({ key: k, lang: 'roman' })}>Preview</Button>
                    <Switch aria-label={`Send ${PROACTIVE_LABEL[k].title}`} checked={m.enabled} onChange={(e) => setMsg({ enabled: e.target.checked })} />
                  </div>
                  <LocalizedField label="Message" rows={5} value={m.template} onChange={(v) => setMsg({ template: v })} />
                  <div className="mt-3 space-y-2">
                    <p className="text-[0.8125rem] font-medium text-slate-700">Quick reply chips</p>
                    {m.chips.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input aria-label="Chip (Roman Urdu)" placeholder="Roman Urdu" value={c.roman} onChange={(e) => setMsg({ chips: m.chips.map((x, j) => (j === i ? { ...x, roman: e.target.value } : x)) })} />
                        <Input aria-label="Chip (English)" placeholder="English" value={c.en} onChange={(e) => setMsg({ chips: m.chips.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)) })} />
                        <Input aria-label="Chip (Urdu)" placeholder="Urdu" dir="rtl" value={c.ur} onChange={(e) => setMsg({ chips: m.chips.map((x, j) => (j === i ? { ...x, ur: e.target.value } : x)) })} />
                        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Remove chip" onClick={() => setMsg({ chips: m.chips.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    {m.chips.length < 6 && <Button size="xs" variant="ghost" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setMsg({ chips: [...m.chips, { en: '', ur: '', roman: '' }] })}>Add chip</Button>}
                  </div>
                </div>
              );
            })}
          </div>
          {dirty && <p className="text-[0.8125rem] text-amber-700">Save to use your changes (preview shows the saved version).</p>}
        </div>
      </Card>

      <CannedReplies />

      <PreviewModal value={preview} onClose={() => setPreview(null)} onLang={(lang) => setPreview((p) => (p ? { ...p, lang } : p))} />

      {guide.isOpen && (
        <PageGuide
          title="Support settings"
          steps={[
            { icon: Save, color: '#16a34a', title: 'Hours and texts', text: 'Set the working hours and what shops see when the team is away. Each text has English, Urdu and Roman Urdu.' },
            { icon: MessageSquarePlus, color: '#7c3aed', title: 'Proactive messages', text: 'Turn each message on or off, edit it per language, preview it and watch how many shops reply or start a plan.' },
            { icon: Pencil, color: '#0ea5e9', title: 'Saved replies', text: 'Agents insert them in a chat by typing /.' },
          ]}
          tips={['Keep messages short and in everyday words.', 'Use only the variables listed; numbers come from the shop’s own data.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function PreviewModal({ value, onClose, onLang }: { value: { key: SupportProactiveKey; lang: SupportLang } | null; onClose: () => void; onLang: (l: SupportLang) => void }) {
  const q = useQuery({ queryKey: ['support', 'proactive-preview', value], queryFn: () => adminSupportApi.proactivePreview(value!), enabled: !!value });
  return (
    <Modal open={!!value} onClose={onClose} title={value ? `Preview: ${PROACTIVE_LABEL[value.key].title}` : 'Preview'} description="With sample values for a shop.">
      {value && <Segmented value={value.lang} onChange={onLang} label="Language" items={LANGS} />}
      <div className="mt-3 rounded-2xl bg-slate-50 p-4">
        {q.data ? (
          <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2 text-[0.875rem] shadow-sm" dir={value?.lang === 'ur' ? 'rtl' : 'ltr'}>
            <p className="mb-0.5 text-[0.6875rem] font-semibold text-slate-500">{q.data.agentName} · Nafaa team</p>
            <p className="whitespace-pre-wrap">{q.data.text}</p>
          </div>
        ) : <p className="text-sm text-slate-500">Loading…</p>}
        {!!q.data?.chips.length && <div className="mt-2 flex flex-wrap gap-1.5">{q.data.chips.map((c) => <span key={c} className="rounded-full border border-brand-300 bg-white px-3 py-1 text-[0.8125rem] text-brand-700">{c}</span>)}</div>}
      </div>
    </Modal>
  );
}

function CannedReplies() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['support', 'canned'], queryFn: () => adminSupportApi.canned() });
  const [edit, setEdit] = useState<Partial<SupportCannedReply> | null>(null);
  const saveM = useMutation({
    mutationFn: (r: Partial<SupportCannedReply>) => (r.id ? adminSupportApi.updateCanned(r.id, r) : adminSupportApi.createCanned(r)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support', 'canned'] }); setEdit(null); toast.success('Saved reply saved'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const del = useMutation({
    mutationFn: adminSupportApi.deleteCanned,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support', 'canned'] }),
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <Card title="Saved replies" description="Type / in a chat to insert one." actions={<Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ language: 'roman', tags: [] })}>New reply</Button>} flush>
      <Table minWidth="40rem">
        <THead><Tr><Th>Title</Th><Th>Text</Th><Th>Language</Th><Th>Tags</Th><Th align="right"> </Th></Tr></THead>
        <TBody>
          {(list.data ?? []).map((r) => (
            <Tr key={r.id}>
              <Td className="font-medium">{r.title}</Td>
              <Td><span className="line-clamp-2 text-slate-600">{r.text}</span></Td>
              <Td>{LANGS.find((l) => l.value === r.language)?.label}</Td>
              <Td>{r.tags.map((t) => `#${t}`).join(' ')}</Td>
              <Td align="right" className="whitespace-nowrap">
                <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Edit" onClick={() => setEdit(r)}><Pencil className="h-4 w-4" /></button>
                <button type="button" className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Delete" onClick={async () => {
                  if (await confirmDialog({ title: `Delete “${r.title}”?`, yes: 'Delete', danger: true })) del.mutate(r.id);
                }}><Trash2 className="h-4 w-4" /></button>
              </Td>
            </Tr>
          ))}
          {list.data && !list.data.length && <Tr><Td colSpan={5} className="py-6 text-center text-slate-500">No saved replies yet.</Td></Tr>}
        </TBody>
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit saved reply' : 'New saved reply'}
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button loading={saveM.isPending} disabled={!edit?.title?.trim() || !edit?.text?.trim()} onClick={() => edit && saveM.mutate(edit)}>Save</Button></>}>
        {edit && (
          <div className="space-y-3">
            <Input label="Title" value={edit.title ?? ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            <Textarea label="Text" rows={5} dir={edit.language === 'ur' ? 'rtl' : 'ltr'} value={edit.text ?? ''} onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
            <Select label="Language" value={edit.language ?? 'roman'} onChange={(e) => setEdit({ ...edit, language: e.target.value as SupportLang })} options={LANGS} />
            <Input label="Tags" hint="Comma-separated" value={(edit.tags ?? []).join(', ')} onChange={(e) => setEdit({ ...edit, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
          </div>
        )}
      </Modal>
    </Card>
  );
}
