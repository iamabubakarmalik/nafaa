/**
 * Actions for one shop user, shown as a "⋯" menu: edit name, phone and role;
 * sign out of every device; give a temporary password (shown once); switch
 * off or on. Each item appears only for admins allowed to use it.
 */

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, KeyRound, LogOut, MoreHorizontal, Pencil, Power } from 'lucide-react';
import { Alert, Button, IconButton, Input, Menu, MenuItem, MenuSeparator, Modal, Select, confirmDialog } from '@/design-system/components';
import { adminUsersApi } from '@/api/admin-users.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';

export interface UserActionTarget { id: string; fullName: string; phone?: string | null; role: string; isActive: boolean }

const ROLES = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'CASHIER', label: 'Cashier' },
  { value: 'STAFF', label: 'Staff' },
];

export function UserActions({ user, onChanged }: { user: UserActionTarget; onChanged?: () => void }) {
  const can = useCan();
  const qc = useQueryClient();
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone ?? '', role: user.role });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const done = () => { qc.invalidateQueries({ queryKey: ['admin'] }); onChanged?.(); };

  const toggle = useMutation({ mutationFn: () => adminUsersApi.toggle(user.id), onSuccess: (u) => { toast.success(u.isActive ? 'Switched on' : 'Switched off'); done(); }, onError: (e) => toast.error(apiError(e)) });
  const signOut = useMutation({ mutationFn: () => adminUsersApi.signOut(user.id), onSuccess: (r) => { toast.success(`Signed out of ${r.ended} device${r.ended === 1 ? '' : 's'}`); done(); }, onError: (e) => toast.error(apiError(e)) });
  const reset = useMutation({ mutationFn: () => adminUsersApi.resetPassword(user.id), onSuccess: (r) => { setTempPassword(r.temporaryPassword); done(); }, onError: (e) => toast.error(apiError(e)) });
  const save = useMutation({
    mutationFn: () => adminUsersApi.update(user.id, { fullName: form.fullName, phone: form.phone || null, role: form.role }),
    onSuccess: () => { toast.success('User updated'); setEditing(false); done(); },
    onError: (e) => toast.error(apiError(e)),
  });

  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_STAFF' || !can('users.manage')) return null;
  const run = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <>
      <IconButton ref={ref} label={`Actions for ${user.fullName}`} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}><MoreHorizontal className="h-4 w-4" /></IconButton>
      <Menu open={open} onClose={() => setOpen(false)} anchorRef={ref} align="end" width="w-60" label="User actions">
        <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={run(() => { setForm({ fullName: user.fullName, phone: user.phone ?? '', role: user.role }); setEditing(true); })}>Edit name, phone, role</MenuItem>
        <MenuItem icon={<LogOut className="h-4 w-4" />} onClick={run(async () => {
          if (await confirmDialog({ title: `Sign ${user.fullName} out everywhere?`, text: 'They stay switched on and can sign in again with their password.', yes: 'Sign out' })) signOut.mutate();
        })}>Sign out of all devices</MenuItem>
        {can('users.reset_password') && (
          <MenuItem icon={<KeyRound className="h-4 w-4" />} onClick={run(async () => {
            if (await confirmDialog({ title: `Give ${user.fullName} a temporary password?`, text: 'Their current password stops working and they are signed out everywhere. You will see the new password once.', yes: 'Create password', danger: true })) reset.mutate();
          })}>Give a temporary password</MenuItem>
        )}
        <MenuSeparator />
        <MenuItem icon={<Power className="h-4 w-4" />} tone={user.isActive ? 'danger' : 'default'} onClick={run(async () => {
          if (user.isActive && !(await confirmDialog({ title: `Switch off ${user.fullName}?`, text: 'They cannot sign in until you switch them on again.', yes: 'Switch off', danger: true }))) return;
          toggle.mutate();
        })}>{user.isActive ? 'Switch off' : 'Switch on'}</MenuItem>
      </Menu>

      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${user.fullName}`}
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button><Button loading={save.isPending} disabled={!form.fullName.trim()} onClick={() => save.mutate()}>Save</Button></div>}>
        <div className="space-y-3">
          <Input label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="Role in the shop" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLES} hint="Changing the owner can lock the shop out of owner-only settings." />
        </div>
      </Modal>

      <Modal open={!!tempPassword} onClose={() => setTempPassword(null)} title="Temporary password" description={`Give this to ${user.fullName}. It is shown only now.`}
        footer={<div className="flex justify-end"><Button onClick={() => setTempPassword(null)}>Done</Button></div>}>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-xl bg-slate-50 px-3 py-2.5 text-center font-mono text-[1.125rem] tracking-wider text-slate-900 ring-1 ring-slate-200">{tempPassword}</code>
          <Button variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => tempPassword && navigator.clipboard?.writeText(tempPassword).then(() => toast.success('Copied'))}>Copy</Button>
        </div>
        <Alert tone="info" className="mt-3">Ask them to change it from their profile after signing in.</Alert>
      </Modal>
    </>
  );
}
