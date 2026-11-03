/** Edit one login's permissions (PATCH /team/:id/permissions). */

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermissions } from '@/core/permissions';
import { EmptyState, FormTemplate, Screen, SkeletonRows, toast } from '@/design';
import { teamApi, type AssignableRole } from '../api/organization';
import { PermissionEditor } from '../components/PermissionEditor';
import { ASSIGNABLE } from '../lib/meta';

export function MemberPermissionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const canManage = can(P.TEAM_MANAGE);
  const list = useQuery({ queryKey: ['team'], queryFn: teamApi.list });
  const member = list.data?.find((m) => m.id === id);
  const [value, setValue] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (member) { setValue(member.permissions ?? []); setDirty(false); } }, [member]);

  const save = useMutation({
    mutationFn: () => teamApi.updatePermissions(id!, value),
    onSuccess: () => {
      ['team', 'staff-people', 'staff'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(t('Permissions save ho gayin'));
      setDirty(false);
      router.back();
    },
  });

  if (list.isLoading) return <Screen title={t('Permissions')}><SkeletonRows count={6} avatar={false} /></Screen>;
  if (!member || member.role === 'OWNER' || member.role === 'SUPER_ADMIN') return <Screen title={t('Permissions')}><EmptyState title={t('Malik ko permission ki zaroorat nahi — sab kuch kar sakta hai')} /></Screen>;
  const role = (ASSIGNABLE.includes(member.role as AssignableRole) ? member.role : 'STAFF') as AssignableRole;

  return (
    <FormTemplate title={t('Permissions')} subtitle={member.fullName} dirty={dirty && canManage} saving={save.isPending} onSave={() => (canManage ? save.mutate() : router.back())} saveLabel={canManage ? t('Save') : t('Done')}>
      <PermissionEditor value={value} role={role} readOnly={!canManage} onChange={(v) => { setValue(v); setDirty(true); }} />
    </FormTemplate>
  );
}
