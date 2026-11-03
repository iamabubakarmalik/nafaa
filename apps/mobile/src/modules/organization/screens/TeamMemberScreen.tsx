/** One team login: details, permissions and actions (edit, password, approval PIN, sign out, switch off, delete). */

import { router, useLocalSearchParams } from 'expo-router';
import { KeyRound, LogOut, Pencil, ShieldCheck, Trash2, UserCheck } from 'lucide-react-native';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { t } from '@/core/i18n';
import { formatDateTime } from '@/core/format';
import { useAuthStore } from '@/core/auth/store';
import { PERMISSIONS as P, usePermissions } from '@/core/permissions';
import {
  Avatar, Badge, DetailRow, DetailSection, DetailTemplate, EmptyState, ListGroup, ListRow, Screen, SettingSwitch, Text, confirm, toast,
} from '@/design';
import { teamApi, type TeamMember } from '../api/organization';
import { ApprovalPinSheet, EditLoginSheet, ResetPasswordSheet } from '../components/MemberSheets';
import { ROLES, type RoleKey } from '../lib/meta';

export function TeamMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const me = useAuthStore((s) => s.user?.id);
  const canManage = can(P.TEAM_MANAGE);
  const [sheet, setSheet] = useState<'edit' | 'password' | 'pin' | null>(null);

  const list = useQuery({ queryKey: ['team'], queryFn: teamApi.list });
  const member: TeamMember | undefined = list.data?.find((m) => m.id === id);
  const protectedRole = !member || member.role === 'OWNER' || member.role === 'SUPER_ADMIN';
  const editable = canManage && !protectedRole && member?.id !== me;

  // The profile endpoint says whether this person has an approval PIN.
  const prof = useQuery({
    queryKey: ['team-profile', id],
    queryFn: () => apiClient.get(`/staff/people/${id}/profile`).then((r) => (r.data?.data ?? r.data) as { login?: { hasApprovalPin?: boolean } | null }),
    enabled: !!member && editable,
    retry: false,
  });
  const hasPin = !!prof.data?.login?.hasApprovalPin;

  const refresh = () => ['team', 'staff-people', 'staff'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const setActive = useMutation({
    mutationFn: (isActive: boolean) => teamApi.setActive(id!, isActive),
    onSuccess: (r) => { refresh(); toast.success(r.isActive ? t('Login chalu ho gaya') : t('Login band ho gaya')); },
  });
  const signOut = useMutation({
    mutationFn: () => teamApi.signOut(id!),
    onSuccess: (r) => toast.success(t('{{count}} devices se logout ho gaya', { count: r.sessionsClosed })),
  });
  const remove = useMutation({
    mutationFn: () => teamApi.remove(id!),
    onSuccess: () => { refresh(); toast.success(t('Login mita diya')); router.back(); },
  });

  if (!list.isLoading && !member) return <Screen title={t('Team')}><EmptyState title={t('Yeh banda nahi mila')} /></Screen>;
  const meta = member ? ROLES[member.role as RoleKey] : undefined;

  return (
    <>
      <DetailTemplate
        title={member?.fullName ?? ''}
        subtitle={meta ? t(meta.label) : member?.role}
        loading={list.isLoading}
        error={list.error}
        onRetry={list.refetch}
        onRefresh={() => list.refetch()}
        refreshing={list.isRefetching}
        summary={member ? (
          <ListGroup>
            <ListRow avatar={<Avatar name={member.fullName} size={48} />} title={member.fullName} subtitle={member.email}
              trailing={<Badge tone={member.isActive ? 'success' : 'neutral'}>{member.isActive ? t('Chalu') : t('Off')}</Badge>} />
          </ListGroup>
        ) : undefined}
      >
        {member && (
          <>
            <DetailSection title={t('Login')}>
              <DetailRow label={t('Role')} value={meta ? t(meta.label) : member.role} />
              <DetailRow label={t('Branch')} value={member.assignedShop?.name ?? t('Sab branches')} />
              <DetailRow label="Email" value={<Text size="sm" ltr>{member.email}</Text>} />
              {!!member.phone && <DetailRow label={t('Phone')} value={<Text size="sm" ltr>{member.phone}</Text>} />}
              <DetailRow label={t('Aakhri login')} value={member.lastLoginAt ? formatDateTime(member.lastLoginAt) : t('Kabhi login nahi kiya')} last />
            </DetailSection>

            <DetailSection title={t('Permissions')}>
              {protectedRole ? (
                <ListRow icon={ShieldCheck} title={t('Sab kuch kar sakta hai')} subtitle={t('Malik ko permission ki zaroorat nahi — sab kuch kar sakta hai')} />
              ) : (
                <ListRow icon={ShieldCheck} title={t('{{count}} permissions', { count: member.permissions?.length ?? 0 })}
                  subtitle={canManage ? t('Kholein aur badlein') : t('Dekhein')} chevron onPress={() => router.push(`/team/${member.id}/permissions` as never)} />
              )}
            </DetailSection>

            {editable && (
              <DetailSection title={t('Actions')}>
                <ListRow icon={Pencil} title={t('Edit login')} subtitle={t('Naam, email, role aur branch')} chevron onPress={() => setSheet('edit')} />
                <ListRow icon={KeyRound} title={t('Naya password')} subtitle={t('Purana password bhool gaya ho to')} chevron onPress={() => setSheet('password')} />
                <ListRow icon={UserCheck} title={t('Approval PIN')} subtitle={hasPin ? t('PIN laga hua hai') : t('PIN nahi laga')} chevron onPress={() => setSheet('pin')} />
                <ListRow icon={LogOut} title={t('Sab devices se logout')} subtitle={t('Wahan dobara login karna hoga.')} onPress={async () => {
                  if (await confirm({ title: t('Sab devices se logout karein?'), message: t('Wahan dobara login karna hoga.'), confirmLabel: t('Logout') })) signOut.mutate();
                }} />
                <SettingSwitch label={t('Login chalu hai')} description={t('Band karne par banda login nahi kar sakta; purana hisaab waise hi rehta hai.')}
                  value={member.isActive} onChange={(v) => setActive.mutate(v)} disabled={setActive.isPending} />
                <ListRow icon={Trash2} destructive title={t('Delete login')} onPress={async () => {
                  if (await confirm({ title: t('{{name}} ka login mitayein?', { name: member.fullName }), message: t('Sirf login mitta hai; purani sale aur hisaab waise hi rehta hai.'), tone: 'danger', confirmLabel: t('Delete') })) remove.mutate();
                }} />
              </DetailSection>
            )}
          </>
        )}
      </DetailTemplate>
      <EditLoginSheet member={sheet === 'edit' ? member ?? null : null} onClose={() => setSheet(null)} />
      <ResetPasswordSheet member={sheet === 'password' ? member ?? null : null} onClose={() => setSheet(null)} />
      <ApprovalPinSheet member={sheet === 'pin' ? member ?? null : null} hasPin={hasPin} onClose={() => setSheet(null)} />
    </>
  );
}
