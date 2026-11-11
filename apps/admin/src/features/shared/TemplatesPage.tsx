/**
 * Message templates for one channel (email or SMS): searchable list, create,
 * edit, activate and delete, with "Seed defaults" for a fresh install. Paged
 * on the server.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, FileText, Lightbulb, Mail, MessageSquare, Pencil, Plus, Send, Sprout, Tag, Trash2 } from 'lucide-react';
import {
  Button, Drawer, FilterBar, FilterChip, FilterMenu, Input, PageHero, PageShell, SearchField, Switch, Table, TBody, Td, Textarea, Th, THead, Tr,
  confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminCommunicationsApi, type PageMeta, type SmsTemplate, type TemplateStats } from '@/api/admin-communications.api';
import { adminEmailTemplatesApi, type EmailTemplate } from '@/api/admin-email-templates.api';
import { ListCard, StatusBadge, useListParams } from '@/ui';
import { errMsg, num } from './kit';

type Kind = 'email' | 'sms';
interface TemplatePage { items: Array<EmailTemplate | SmsTemplate>; meta: PageMeta; stats: TemplateStats }
interface Form { slug: string; name: string; subject: string; bodyHtml: string; bodyText: string; message: string; isActive: boolean }
const blank: Form = { slug: '', name: '', subject: '', bodyHtml: '', bodyText: '', message: '', isActive: true };
const ACTIVE = [['ALL', 'Any state'], ['yes', 'Active'], ['no', 'Inactive']];

export function TemplatesPage({ kind }: { kind: Kind }) {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const isEmail = kind === 'email';
  const label = isEmail ? 'Email' : 'SMS';
  const key = `admin-${kind}-templates`;
  const list = useListParams({ active: 'ALL' });
  const active = list.filters.active;
  const [editing, setEditing] = useState<EmailTemplate | SmsTemplate | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(blank);

  const params = { search: list.debouncedSearch || undefined, active: active === 'ALL' ? undefined : active, page: list.page, limit: list.limit };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [key, params],
    queryFn: (): Promise<TemplatePage> => (isEmail ? adminEmailTemplatesApi.paged(params) : adminCommunicationsApi.pagedSmsTemplates(params)),
    placeholderData: (prev) => prev,
  });
  const rows = data?.items ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: [key] });

  const save = useMutation({
    mutationFn: (): Promise<unknown> => {
      if (isEmail) {
        const body = { slug: form.slug, name: form.name, subject: form.subject, bodyHtml: form.bodyHtml, bodyText: form.bodyText || undefined, isActive: form.isActive };
        return editing ? adminEmailTemplatesApi.update(editing.id, body) : adminEmailTemplatesApi.create(body);
      }
      const body = { slug: form.slug, name: form.name, message: form.message, isActive: form.isActive };
      return editing ? adminCommunicationsApi.updateSmsTemplate(editing.id, body) : adminCommunicationsApi.createSmsTemplate(body);
    },
    onSuccess: () => { toast.success(editing ? 'Template updated' : 'Template created'); setOpen(false); setEditing(null); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => (isEmail ? adminEmailTemplatesApi.remove(id) : adminCommunicationsApi.deleteSmsTemplate(id)),
    onSuccess: () => { toast.success('Deleted'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const seed = useMutation({
    mutationFn: () => (isEmail ? adminEmailTemplatesApi.seedDefaults() : adminCommunicationsApi.seedSmsDefaults()),
    onSuccess: () => { toast.success('Default templates added'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const create = () => { setEditing(null); setForm(blank); setOpen(true); };
  const edit = (t: EmailTemplate | SmsTemplate) => {
    setEditing(t);
    setForm({ ...blank, slug: t.slug, name: t.name, isActive: t.isActive, ...('subject' in t ? { subject: t.subject, bodyHtml: t.bodyHtml, bodyText: t.bodyText ?? '' } : { message: t.message }) });
    setOpen(true);
  };
  const valid = !!form.slug.trim() && !!form.name.trim() && (isEmail ? !!form.subject.trim() && !!form.bodyHtml.trim() : !!form.message.trim());
  const st = data?.stats;
  const Icon = isEmail ? Mail : MessageSquare;
  const noneAtAll = !!st && st.total === 0;

  return (
    <PageShell>
      <PageHero
        title={`${label} templates`}
        chip={data ? `${num(data.meta.total)} shown` : undefined}
        busy={isFetching}
        loading={isLoading}
        actions={
          <>
            {noneAtAll && <button type="button" className={heroButton} onClick={() => seed.mutate()} disabled={seed.isPending}><Sprout className="h-4 w-4" /> Add default templates</button>}
            <button type="button" className={heroPrimaryButton} onClick={create}><Plus className="h-4 w-4" /> New template</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={st ? [{ label: 'Templates', value: num(st.total) }, { label: 'Active', value: num(st.active) }, { label: 'Inactive', value: num(st.inactive) }] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder={isEmail ? 'Search name, key or subject' : 'Search name, key or message'} />}
        chips={active !== 'ALL' ? [<FilterChip key="a" onRemove={() => list.setFilter('active', 'ALL')}>{ACTIVE.find(([v]) => v === active)?.[1]}</FilterChip>] : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="State" value={active} active={active !== 'ALL'} onChange={(v) => list.setFilter('active', v)} align="right" options={ACTIVE.map(([value, l]) => ({ value, label: l }))} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<Icon className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load templates' : noneAtAll ? 'No templates yet' : 'No template matches'}
        emptyText={error ? 'Try again in a moment.' : noneAtAll ? 'Add the default templates or create your own.' : 'Try another search or clear the filters.'}
        emptyAction={noneAtAll ? <Button size="sm" variant="secondary" loading={seed.isPending} onClick={() => seed.mutate()}>Add default templates</Button> : undefined}
        page={list.page} limit={list.limit} total={data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="44rem">
          <THead><Tr><Th>Name</Th><Th>{isEmail ? 'Subject' : 'Message'}</Th><Th>State</Th><Th align="right">Actions</Th></Tr></THead>
          <TBody>
            {rows.map((t) => (
              <Tr key={t.id} interactive onClick={() => edit(t)} className="align-top">
                <Td><div className="font-semibold text-slate-900">{t.name}</div><div className="font-mono text-[0.6875rem] text-slate-500">{t.slug}</div></Td>
                <Td className="max-w-[28rem]">
                  {'subject' in t ? <div className="line-clamp-2 text-slate-800">{t.subject}</div> : (
                    <>
                      <div className="line-clamp-2 whitespace-pre-wrap text-slate-800">{t.message}</div>
                      <div className="mt-1 text-[0.6875rem] text-slate-500">{t.message.length} characters, about {Math.ceil(t.message.length / 160)} SMS</div>
                    </>
                  )}
                </Td>
                <Td><StatusBadge value={t.isActive ? 'ACTIVE' : 'INACTIVE'} /></Td>
                <Td align="right" className="whitespace-nowrap">
                  <button type="button" aria-label={`Edit ${t.name}`} onClick={(e) => { e.stopPropagation(); edit(t); }} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                  <button type="button" aria-label={`Delete ${t.name}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                    onClick={async (e) => { e.stopPropagation(); if (await confirmDialog({ title: `Delete "${t.name}"?`, text: 'Messages that use this template will need another one.', yes: 'Delete', danger: true })) remove.mutate(t.id); }}><Trash2 className="h-4 w-4" /></button>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <Drawer open={open} onClose={() => setOpen(false)} size="lg" title={editing ? `Edit ${label} template` : `New ${label} template`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button leftIcon={<Check className="h-4 w-4" />} loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>Save</Button>
          </>
        }>
        <div className="space-y-4 p-4 sm:p-5">
          <Input label="Key" hint="Unique name used in code, for example welcome-email" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="welcome" disabled={!!editing} />
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {isEmail ? (
            <>
              <Input label="Subject" hint="Use {{variable}} for placeholders" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <Textarea label="HTML body" rows={9} className="font-mono text-xs" value={form.bodyHtml} onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })} placeholder="<h1>Hello {{name}}</h1>" />
              <Textarea label="Plain text body (optional)" rows={4} className="font-mono text-xs" value={form.bodyText} onChange={(e) => setForm({ ...form, bodyText: e.target.value })} />
            </>
          ) : (
            <Textarea label="Message" rows={6} className="font-mono text-xs" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
              hint={`${form.message.length} characters. Use {{variable}} for placeholders.`} placeholder="Hi {{name}}, your order of Rs {{amount}} is confirmed." />
          )}
          <Switch label="Active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          <p className="rounded-xl bg-slate-50 p-3 text-[0.75rem] text-slate-600">Common variables: {'{{name}}, {{shopName}}, {{amount}}, {{days}}, {{reason}}, {{productName}}'}{isEmail ? '' : ', {{otp}}'}</p>
        </div>
      </Drawer>

      {guide.isOpen && (
        <PageGuide
          title={`${label} templates`}
          description={`Reusable ${label} messages the platform and bulk sends can use.`}
          flowTitle="How a template is used"
          flow={[
            { label: 'Write', hint: 'With {{variables}}', icon: FileText, color: '#4f46e5' },
            { label: 'Activate', hint: 'Only active ones send', icon: Check, color: '#059669' },
            { label: 'Send', hint: 'System or bulk send', icon: Send, color: '#0284c7' },
          ]}
          steps={[
            { icon: Plus, color: '#4f46e5', title: 'Create', text: 'Give it a unique key, a name and the text. Placeholders like {{name}} are filled in when it is sent.' },
            { icon: Pencil, color: '#0284c7', title: 'Edit', text: 'Click a row to edit. The key cannot be changed after creating.' },
            { icon: Sprout, color: '#059669', title: 'Defaults', text: 'On a fresh install, add the default templates in one click.' },
          ]}
          tips={['An inactive template is never sent.', isEmail ? 'Plain text is used by mail apps that cannot show HTML.' : 'One SMS holds about 160 characters.']}
          shortcuts={[['/', 'Search'], ['↑ ↓', 'Move between rows'], ['Enter', 'Edit template'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
