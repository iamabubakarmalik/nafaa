/** Reason for turning a leave down or cancelling an approved one. */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { Button, Input, Sheet, toast } from '@/design';
import { attendanceApi, type LeaveRow } from '../api/attendance';
import { ATT_KEY } from '../lib/meta';

export interface DecisionTarget { leave: LeaveRow; decision: 'REJECT' | 'CANCEL' }

export function LeaveDecisionSheet({ target, onClose }: { target: DecisionTarget | null; onClose: () => void }) {
  return (
    <Sheet open={!!target} onClose={onClose}
      title={target?.decision === 'REJECT' ? t('Chhutti na-approve karein') : t('Approve chhutti cancel karein')}
      description={target ? t('{{fullName}} · {{days}} din', { fullName: target.leave.staff.fullName, days: target.leave.days }) : undefined}>
      {target && <Body key={target.leave.id} target={target} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ target, onClose }: { target: DecisionTarget; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: () => attendanceApi.decideLeave(target.leave.id, target.decision, reason.trim() || undefined),
    onSuccess: () => {
      toast.success(target.decision === 'REJECT' ? t('Chhutti na-approve') : t('Chhutti cancel'));
      void qc.invalidateQueries({ queryKey: [ATT_KEY] });
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <Input label={t('Wajah')} value={reason} onChangeText={setReason} maxLength={300} placeholder={t('Masalan: us din stock ginti hai')} hint={t('Staff aur activity log me dikhegi')} autoFocus />
      <Button variant="danger" fullWidth loading={m.isPending} disabled={target.decision === 'REJECT' && reason.trim().length < 2} onPress={() => m.mutate()}>
        {target.decision === 'REJECT' ? t('Na-approve') : t('Cancel karein')}
      </Button>
    </View>
  );
}
