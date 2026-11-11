/**
 * Roles & permissions: built-in and custom admin roles. Pick a role on the
 * left, switch its permissions on the right. Built-in roles can be edited
 * but not deleted; a role in use cannot be deleted.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, Lightbulb, Lock, Plus, Save, ShieldCheck, Trash2, Users } from 'lucide-react';
import { Button, Card, Input, PageHero, PageShell, Skeleton, Textarea, confirmDialog, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminStaffApi, type AdminRole } from '@/api/admin-staff.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { PermissionPicker } from '../components/PermissionPicker';

const apiError = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong. Try again.';
const NEW = '__new__';

export default function RolesPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('staff.manage');
  const roles = useQuery({ queryKey: ['admin', 'staff', 'roles'], queryFn: adminStaffApi.roles });
  const catalog = useQuery({ queryKey: ['admin', 'staff', 'catalog'], queryFn: adminStaffApi.catalog, staleTime: Infinity });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; description: string; permissions: string[] } | null>(null);

  const list = roles.data ?? [];
  const selected: AdminRole | undefined = list.find((r) => r.id === selectedId);
  const total = catalog.data?.areas.reduce((n, a) => n + a.permissions.length, 0) ?? 0;

  useEffect(() => { if (!selectedId && list.length) setSelectedId(list[0].id); }, [list, selectedId]);
  useEffect(() => {
    if (selectedId === NEW) setDraft({ name: '', description: '', permissions: [] });
    else if (selected) setDraft({ name: selected.name, description: selected.description ?? '', permissions: selected.permissions });
  }, [selectedId, selected]);

  const dirty = useMemo(() => {
    if (!draft) return false;
    if (selectedId === NEW) return !!draft.name.trim();
    if (!selected) return false;
    return draft.name !== selected.name || draft.description !== (selected.description ?? '') || [...draft.permissions].sort().join() !== [...selected.permissions].sort().join();
  }, [draft, selected, selectedId]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'staff'] });
  const save = useMutation({
    mutationFn: () => selectedId === NEW
      ? adminStaffApi.createRole({ name: draft!.name, description: draft!.description, permissions: draft!.permissions })
      : adminStaffApi.updateRole(selectedId!, draft!),
    onSuccess: (r) => { toast.success('Role saved. It applies to everyone with this role right away.'); refresh(); setSelectedId(r.id); },
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: () => adminStaffApi.deleteRole(selectedId!),
    onSuccess: () => { toast.success('Role deleted'); setSelectedId(null); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <PageShell>
      <PageHero
        title="Roles & permissions"
        chip={roles.data ? `${list.length} roles` : undefined}
        busy={roles.isFetching}
        loading={roles.isLoading}
        actions={
          <>
            {canManage && <button type="button" className={heroPrimaryButton} onClick={() => setSelectedId(NEW)}><Plus className="h-4 w-4" /> New role</button>}
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={roles.data ? [
          { label: 'Built-in roles', value: list.filter((r) => r.isSystem).length },
          { label: 'Custom roles', value: list.filter((r) => !r.isSystem).length },
          { label: 'People with a role', value: list.reduce((n, r) => n + r.memberCount, 0) },
          { label: 'Permission switches', value: total },
        ] : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card title="Roles" flush className="h-fit">
          <ul className="space-y-1 p-2">
            {roles.isLoading && Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            {list.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setSelectedId(r.id)} className={cn('flex w-full items-center gap-3 rounded-xl p-2.5 text-start transition', r.id === selectedId ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : 'hover:bg-slate-50')}>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', r.isSystem ? 'bg-slate-100 text-slate-600' : 'bg-brand-100 text-brand-700')}>
                    {r.key === 'owner' ? <ShieldCheck className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{r.name}</span>
                    <span className="block text-[0.75rem] text-slate-500">{r.permissions.length} permissions · {r.memberCount} {r.memberCount === 1 ? 'person' : 'people'}</span>
                  </span>
                </button>
              </li>
            ))}
            {selectedId === NEW && <li className="rounded-xl bg-brand-50 p-2.5 text-[0.875rem] font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">New role</li>}
          </ul>
        </Card>

        {draft && catalog.data ? (
          <Card
            title={selectedId === NEW ? 'New role' : selected?.name}
            description={selected?.isSystem ? 'Built-in role. You can change its permissions; it cannot be deleted.' : 'Changes apply to everyone with this role as soon as you save.'}
            actions={canManage ? (
              <div className="flex gap-2">
                {selected && !selected.isSystem && (
                  <Button variant="ghost" size="sm" className="text-rose-600" leftIcon={<Trash2 className="h-4 w-4" />} disabled={selected.memberCount > 0} title={selected.memberCount ? 'Move its people to another role first' : undefined}
                    onClick={async () => { if (await confirmDialog({ title: `Delete “${selected.name}”?`, yes: 'Delete', danger: true })) remove.mutate(); }}>Delete</Button>
                )}
                <Button size="sm" leftIcon={<Save className="h-4 w-4" />} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
              </div>
            ) : <span className="inline-flex items-center gap-1 text-[0.75rem] text-slate-500"><Lock className="h-3.5 w-3.5" /> View only</span>}
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Name" value={draft.name} disabled={!canManage} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
                <div className="flex items-end gap-2 text-[0.8125rem] text-slate-500">
                  <Users className="mb-2.5 h-4 w-4" />
                  <span className="mb-2">{draft.permissions.length} of {total} permissions on</span>
                </div>
              </div>
              <Textarea label="What this role is for" rows={2} value={draft.description} disabled={!canManage} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              <PermissionPicker areas={catalog.data.areas} value={draft.permissions} onChange={(permissions) => setDraft({ ...draft, permissions })} disabled={!canManage} />
            </div>
          </Card>
        ) : <Skeleton className="h-96 rounded-3xl" />}
      </div>

      {guide.isOpen && (
        <PageGuide
          title="Roles & permissions"
          description="A role is a list of switches. Each switch allows exactly what it says, nothing more."
          flowTitle="How a request is checked"
          flow={[
            { label: 'Person', hint: 'Signs in', icon: Users, color: '#4f46e5' },
            { label: 'Role + extras', hint: 'Their switches', icon: KeyRound, color: '#0284c7' },
            { label: 'Page or action', hint: 'Needs one switch', icon: Lock, color: '#e11d48' },
          ]}
          steps={[
            { icon: KeyRound, color: '#4f46e5', title: 'See vs change', text: '“See” opens pages. “Change” saves edits. Change does not include See, so turn on both when someone edits.' },
            { icon: ShieldCheck, color: '#e11d48', title: 'Sensitive switches', text: 'Red switches (sign in as a shop, delete shops, approve payments) are never turned on by “Turn on see + change”.' },
            { icon: Plus, color: '#059669', title: 'Custom roles', text: 'Make a role for a job, then pick it when you invite someone.' },
          ]}
          tips={['Super admins skip these checks and always have everything.', 'Pages a person cannot see are hidden from their menu and search.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
