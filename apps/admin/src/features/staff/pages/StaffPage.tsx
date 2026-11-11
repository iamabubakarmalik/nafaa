/**
 * Admin staff: the super admins and every team member with admin access,
 * their role, two-step sign-in and last activity. Invite people, change
 * their role or extra permissions, end their sessions or turn access off.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Copy, KeyRound, Laptop, Lightbulb, LogOut, Mail, ShieldCheck, ShieldOff, UserCog, UserPlus, Users,
} from 'lucide-react';
import {
  Alert, Badge, Button, Drawer, Input, PageHero, PageShell, Select, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminStaffApi, type StaffMember } from '@/api/admin-staff.api';
import { useAuthStore } from '@/store/auth.store';
import { useCan } from '@/lib/access';
import { formatRelative } from '@/lib/format';
import { deviceLabel } from '@/lib/device';
import { ListCard, StatusBadge, DetailList } from '@/ui';
import { PermissionPicker } from '../components/PermissionPicker';

const apiError = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong. Try again.';

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(() => toast.success('Link copied'), () => toast.error('Copy failed. Select the link and copy it.'));
}

function InviteLink({ url, expiresAt }: { url: string; expiresAt: string }) {
  return (
    <Alert tone="success" title="Invite link ready">
      <p className="mb-2 text-[0.8125rem]">Send this link to them (WhatsApp or email). It works once and expires on {new Date(expiresAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}.</p>
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-lg bg-white px-2.5 font-mono text-[0.75rem] text-slate-700 ring-1 ring-slate-200" />
        <Button size="sm" variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => copy(url)}>Copy</Button>
      </div>
    </Alert>
  );
}

function InviteDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const roles = useQuery({ queryKey: ['admin', 'staff', 'roles'], queryFn: adminStaffApi.roles, enabled: open });
  const [form, setForm] = useState({ fullName: '', email: '', roleId: '' });
  const [result, setResult] = useState<{ inviteUrl: string; expiresAt: string } | null>(null);
  const invite = useMutation({
    mutationFn: () => adminStaffApi.invite(form),
    onSuccess: (r) => { setResult(r); qc.invalidateQueries({ queryKey: ['admin', 'staff'] }); toast.success(`${form.fullName} invited`); },
    onError: (e) => toast.error(apiError(e)),
  });
  const close = () => { onClose(); setResult(null); setForm({ fullName: '', email: '', roleId: '' }); };
  const role = roles.data?.find((r) => r.id === form.roleId);

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Invite to the admin panel"
      description="They get a link to set their own password. Nothing is emailed automatically."
      icon={<UserPlus className="h-5 w-5" />}
      footer={result ? <Button onClick={close} fullWidth>Done</Button> : (
        <Button fullWidth loading={invite.isPending} disabled={!form.fullName.trim() || !form.email.trim() || !form.roleId} onClick={() => invite.mutate()}>Create invite link</Button>
      )}
    >
      {result ? <InviteLink url={result.inviteUrl} expiresAt={result.expiresAt} /> : (
        <div className="space-y-4">
          <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required autoFocus />
          <Input label="Work email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required hint="Must not be a shop owner’s email. Admin and merchant accounts are separate." />
          <Select
            label="Role"
            required
            value={form.roleId}
            onChange={(e) => setForm({ ...form, roleId: e.target.value })}
            placeholder="Choose a role"
            options={(roles.data ?? []).map((r) => ({ value: r.id, label: `${r.name} (${r.permissions.length} permissions)` }))}
          />
          {role && <p className="rounded-xl bg-slate-50 p-3 text-[0.8125rem] text-slate-600">{role.description || 'Custom role.'} <Link to="/staff/roles" className="font-medium text-brand-700 hover:underline">See its permissions</Link></p>}
        </div>
      )}
    </Drawer>
  );
}

function MemberDrawer({ member, onClose }: { member: StaffMember | null; onClose: () => void }) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const catalog = useQuery({ queryKey: ['admin', 'staff', 'catalog'], queryFn: adminStaffApi.catalog, enabled: !!member, staleTime: Infinity });
  const roles = useQuery({ queryKey: ['admin', 'staff', 'roles'], queryFn: adminStaffApi.roles, enabled: !!member });
  const sessions = useQuery({ queryKey: ['admin', 'staff', 'sessions', member?.userId], queryFn: () => adminStaffApi.sessions(member!.userId), enabled: !!member && member.status === 'ACTIVE' });
  const [roleId, setRoleId] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[] | null>(null);
  const [invite, setInvite] = useState<{ inviteUrl: string; expiresAt: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'staff'] });
  const reset = () => { setRoleId(null); setExtras(null); setInvite(null); };

  const save = useMutation({
    mutationFn: () => adminStaffApi.updateMember(member!.id, { roleId: roleId ?? undefined, extraPermissions: extras ?? undefined }),
    onSuccess: () => { toast.success('Access updated'); refresh(); reset(); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const setStatus = useMutation({
    mutationFn: (status: 'ACTIVE' | 'DISABLED') => adminStaffApi.updateMember(member!.id, { status }),
    onSuccess: (_, s) => { toast.success(s === 'DISABLED' ? 'Access turned off and signed out everywhere' : 'Access turned on'); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: () => adminStaffApi.removeMember(member!.id),
    onSuccess: () => { toast.success('Removed from the admin panel'); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const resend = useMutation({ mutationFn: () => adminStaffApi.resendInvite(member!.id), onSuccess: setInvite, onError: (e) => toast.error(apiError(e)) });
  const endAll = useMutation({
    mutationFn: () => adminStaffApi.endAllSessions(member!.userId),
    onSuccess: (r) => { toast.success(`${r.ended} session${r.ended === 1 ? '' : 's'} ended`); sessions.refetch(); },
  });

  if (!member) return null;
  const isMe = member.userId === me?.id;
  const currentRole = roles.data?.find((r) => r.id === (roleId ?? member.role?.id));
  const dirty = roleId !== null || extras !== null;

  return (
    <Drawer
      open={!!member}
      onClose={() => { reset(); onClose(); }}
      size="lg"
      title={member.fullName}
      description={member.email}
      icon={<UserCog className="h-5 w-5" />}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <Button loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>Save access</Button>
          {member.status === 'ACTIVE' && !isMe && (
            <Button variant="outline" leftIcon={<ShieldOff className="h-4 w-4" />} onClick={async () => {
              if (await confirmDialog({ title: `Turn off ${member.fullName}’s access?`, text: 'They are signed out everywhere and cannot sign in until you turn it back on.', yes: 'Turn off', danger: true })) setStatus.mutate('DISABLED');
            }}>Turn off access</Button>
          )}
          {member.status === 'DISABLED' && <Button variant="outline" onClick={() => setStatus.mutate('ACTIVE')}>Turn access back on</Button>}
          {!isMe && (
            <Button variant="ghost" className="ms-auto text-rose-600" onClick={async () => {
              if (await confirmDialog({ title: `Remove ${member.fullName}?`, text: 'Their admin account is closed. The audit log keeps their name.', yes: 'Remove', danger: true })) remove.mutate();
            }}>Remove</Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <DetailList cols={2} items={[
          { label: 'Status', value: <StatusBadge value={member.status} /> },
          { label: 'Two-step sign-in', value: member.totpEnabled ? <Badge variant="success">On</Badge> : <Badge variant="warning">Off</Badge> },
          { label: 'Last sign-in', value: member.lastLoginAt ? formatRelative(member.lastLoginAt) : 'Never' },
          { label: 'Added', value: formatRelative(member.createdAt) },
        ]} />

        {member.status === 'INVITED' && (invite ? <InviteLink url={invite.inviteUrl} expiresAt={invite.expiresAt} /> : (
          <Alert tone="info" title="Has not accepted the invite yet" action={<Button size="sm" variant="outline" leftIcon={<Mail className="h-4 w-4" />} loading={resend.isPending} onClick={() => resend.mutate()}>New link</Button>}>
            The old link stops working when you make a new one.
          </Alert>
        ))}

        <Select
          label="Role"
          value={roleId ?? member.role?.id ?? ''}
          onChange={(e) => setRoleId(e.target.value)}
          placeholder="No role"
          options={(roles.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
          hint={currentRole?.description ?? undefined}
        />

        {catalog.data && (
          <div>
            <div className="mb-2">
              <div className="text-[0.875rem] font-semibold text-slate-900">Extra permissions</div>
              <p className="text-[0.75rem] text-slate-500">On top of the role, for this person only. Keys from the role are marked “from role”.</p>
            </div>
            <PermissionPicker areas={catalog.data.areas} value={extras ?? member.extraPermissions} locked={currentRole?.permissions ?? []} onChange={setExtras} />
          </div>
        )}

        {member.status === 'ACTIVE' && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[0.875rem] font-semibold text-slate-900">Signed in on</div>
              {!!sessions.data?.length && <Button size="xs" variant="outline" leftIcon={<LogOut className="h-3.5 w-3.5" />} loading={endAll.isPending} onClick={() => endAll.mutate()}>Sign out everywhere</Button>}
            </div>
            {sessions.data?.length ? (
              <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                {sessions.data.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 p-3 text-[0.8125rem]">
                    <Laptop className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-slate-900">{s.deviceName || deviceLabel(s.userAgent)}</span>
                      <span className="block text-[0.75rem] text-slate-500">{[s.ipAddress, s.location].filter(Boolean).join(' · ')} · active {formatRelative(s.lastUsedAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[0.8125rem] text-slate-500">No active sessions.</p>}
          </div>
        )}
      </div>
    </Drawer>
  );
}

export default function StaffPage() {
  const guide = usePageGuide();
  const can = useCan();
  const [inviting, setInviting] = useState(false);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const members = useQuery({ queryKey: ['admin', 'staff', 'members'], queryFn: adminStaffApi.members });
  const staff = members.data?.staff ?? [];
  const supers = members.data?.superAdmins ?? [];
  const canManage = can('staff.manage');

  const counts = useMemo(() => ({
    active: staff.filter((m) => m.status === 'ACTIVE').length,
    invited: staff.filter((m) => m.status === 'INVITED').length,
    noTwoStep: [...staff.filter((m) => m.status === 'ACTIVE'), ...supers].filter((m) => !m.totpEnabled).length,
  }), [staff, supers]);

  return (
    <PageShell>
      <PageHero
        title="Admin staff"
        chip={members.data ? `${supers.length + staff.length} people` : undefined}
        busy={members.isFetching}
        loading={members.isLoading}
        actions={
          <>
            {canManage && <button type="button" className={heroPrimaryButton} onClick={() => setInviting(true)}><UserPlus className="h-4 w-4" /> Invite</button>}
            <Link to="/staff/roles" className={heroButton}><KeyRound className="h-4 w-4" /> <span className="hidden sm:inline">Roles</span></Link>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={members.data ? [
          { label: 'Super admins', value: supers.length, hint: 'Full access, always' },
          { label: 'Active staff', value: counts.active },
          { label: 'Invites waiting', value: counts.invited },
          { label: 'Without two-step sign-in', value: counts.noTwoStep, hint: counts.noTwoStep ? 'Ask them to turn it on' : 'Everyone protected' },
        ] : undefined}
      />

      <ListCard title="Super admins" loading={members.isLoading} empty={!supers.length} rows={2}>
        <Table minWidth="40rem">
          <THead><Tr><Th>Name</Th><Th>Two-step sign-in</Th><Th>Last sign-in</Th></Tr></THead>
          <TBody>
            {supers.map((u) => (
              <Tr key={u.userId}>
                <Td><div className="font-semibold text-slate-900">{u.fullName}</div><div className="text-[0.75rem] text-slate-500">{u.email}</div></Td>
                <Td>{u.totpEnabled ? <Badge variant="success">On</Badge> : <Badge variant="warning">Off</Badge>}</Td>
                <Td className="text-slate-500">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Never'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <ListCard
        title="Team"
        loading={members.isLoading}
        empty={!staff.length}
        emptyIcon={<Users className="h-6 w-6" />}
        emptyTitle="No team members yet"
        emptyText="Invite people and give each one a role, so nobody needs the super admin password."
        emptyAction={canManage ? <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setInviting(true)}>Invite someone</Button> : undefined}
      >
        <Table minWidth="48rem">
          <THead><Tr><Th>Name</Th><Th>Role</Th><Th>Status</Th><Th>Two-step</Th><Th align="right">Last sign-in</Th></Tr></THead>
          <TBody>
            {staff.map((m) => (
              <Tr key={m.id} interactive={canManage} onClick={canManage ? () => setSelected(m) : undefined}>
                <Td><div className="font-semibold text-slate-900">{m.fullName}</div><div className="text-[0.75rem] text-slate-500">{m.email}</div></Td>
                <Td>
                  {m.role ? <span className="font-medium text-slate-900">{m.role.name}</span> : <span className="text-slate-400">No role</span>}
                  {!!m.extraPermissions.length && <div className="text-[0.75rem] text-slate-500">+{m.extraPermissions.length} extra</div>}
                </Td>
                <Td><StatusBadge value={m.status} /></Td>
                <Td>{m.totpEnabled ? <ShieldCheck className="h-4 w-4 text-emerald-600" aria-label="On" /> : <span className="text-[0.75rem] text-amber-600">Off</span>}</Td>
                <Td align="right" className="text-slate-500">{m.lastLoginAt ? formatRelative(m.lastLoginAt) : 'Never'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <InviteDrawer open={inviting} onClose={() => setInviting(false)} />
      <MemberDrawer member={selected} onClose={() => setSelected(null)} />

      {guide.isOpen && (
        <PageGuide
          title="Admin staff"
          description="Give every team member their own login and only the access their job needs."
          flowTitle="How someone gets access"
          flow={[
            { label: 'Invite', hint: 'Name, email, role', icon: UserPlus, color: '#4f46e5' },
            { label: 'They open the link', hint: 'Set a password', icon: Mail, color: '#0284c7' },
            { label: 'Turn on two-step', hint: 'Authenticator app', icon: ShieldCheck, color: '#059669' },
            { label: 'Work', hint: 'Every change logged', icon: KeyRound, color: '#e11d48' },
          ]}
          steps={[
            { icon: UserPlus, color: '#4f46e5', title: 'Invite', text: 'Create an invite link and send it yourself. It works once and expires in 7 days.' },
            { icon: KeyRound, color: '#0284c7', title: 'Pick a role', text: 'Roles are lists of permissions. Add extra permissions for one person when needed.' },
            { icon: ShieldOff, color: '#e11d48', title: 'Turn off access', text: 'Signs them out everywhere at once. Remove closes the account but keeps their name in the audit log.' },
          ]}
          tips={['Super admins always have full access and are not managed here.', 'Admin accounts cannot open the merchant app.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
