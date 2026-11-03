/** Signed-in devices ("this device" marked) and the recent login attempts. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Laptop, LogOut, Monitor, Smartphone, Tablet, XCircle } from 'lucide-react-native';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { Badge, Button, Card, EmptyState, ErrorState, ListGroup, ListRow, Row, SkeletonRows, SwipeRow, Text, confirm, toast, useTheme } from '@/design';
import { profileApi } from '../api/profile';
import { ago, day } from '../lib/meta';

function deviceIcon(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('ipad') || n.includes('tablet')) return Tablet;
  if (n.includes('iphone') || n.includes('android') || n.includes('mobile')) return Smartphone;
  if (n.includes('mac') || n.includes('windows') || n.includes('linux')) return Laptop;
  return Monitor;
}

export function DevicesTab() {
  const th = useTheme();
  const qc = useQueryClient();
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const sessions = useQuery({ queryKey: ['active-sessions'], queryFn: profileApi.sessions });
  const mine = useQuery({ queryKey: ['active-sessions', 'current'], queryFn: () => profileApi.currentSession(refreshToken!), enabled: !!refreshToken, staleTime: 5 * 60_000 });
  const history = useQuery({ queryKey: ['login-history'], queryFn: profileApi.loginHistory });

  const list = sessions.data ?? [];
  const currentId = mine.data?.id ?? null;
  const ordered = [...list].sort((a, b) => Number(b.id === currentId) - Number(a.id === currentId));
  const others = list.filter((s) => s.id !== currentId).length;
  const failed = (history.data ?? []).filter((h) => !h.success).length;

  const done = () => qc.invalidateQueries({ queryKey: ['active-sessions'] });
  const revoke = useMutation({
    mutationFn: (id: string) => profileApi.revokeSession(id),
    onSuccess: () => { toast.success(t('Us device se logout ho gaya')); void done(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Logout nahi hua'))),
  });
  const revokeOthers = useMutation({
    mutationFn: () => profileApi.revokeOthers(useAuthStore.getState().refreshToken ?? ''),
    onSuccess: () => { toast.success(t('Baqi sab devices se logout ho gaya')); void done(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Logout nahi hua'))),
  });

  const askOthers = async () => {
    if (await confirm({ title: t('Baqi devices se logout?'), message: `${t('{{others}} device se login khatam ho jayega. Is device par aap login rahenge.', { others })}\n${t('Agar koi phone gum ho gaya ho ya kisi aur ne login kiya ho to ye karein, phir password bhi badal lein.')}`, tone: 'danger', confirmLabel: t('Haan, logout karein') })) revokeOthers.mutate();
  };

  return (
    <View style={{ gap: th.space(4) }}>
      <Card title={t('Login wale devices')} description={sessions.isLoading ? t('Dekh rahe hain…') : t('{{count}} device par login hai', { count: list.length })}
        action={others > 0 ? <Button size="sm" variant="critical" icon={LogOut} loading={revokeOthers.isPending} onPress={() => void askOthers()}>{t('Baqi sab se logout')}</Button> : undefined} flush>
        {sessions.isLoading ? <SkeletonRows count={3} /> : sessions.isError ? <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} /> : !list.length ? <EmptyState compact title={t('Koi device nahi mila')} /> : (
          <ListGroup>
            {ordered.map((s) => {
              const isMe = s.id === currentId;
              return (
                <SwipeRow key={s.id} enabled={!isMe} end={[{ icon: LogOut, label: t('Logout'), tone: 'danger', onPress: () => revoke.mutate(s.id) }]}>
                  <ListRow icon={deviceIcon(s.deviceName)} iconTone={isMe ? 'success' : 'neutral'}
                    title={<Row gap={2} wrap><Text weight="semibold">{s.deviceName}</Text>{isMe && <Badge tone="success" dot>{t('Ye device')}</Badge>}</Row>}
                    subtitle={`${s.location || t('Pata nahi')} · ${t('Aakhri dafa: {{lastActive}}', { lastActive: ago(s.lastActive) })} · ${t('Login: {{createdAt}}', { createdAt: day(s.createdAt) })}`} />
                </SwipeRow>
              );
            })}
          </ListGroup>
        )}
      </Card>

      <Card title={t('Login ki koshishein')} description={failed ? t('{{failed}} nakaam koshish', { failed }) : t('Pichle 30 login')} flush>
        {history.isLoading ? <SkeletonRows count={4} /> : !(history.data ?? []).length ? <EmptyState compact title={t('Abhi koi record nahi')} /> : (
          <>
            {failed >= 3 && (
              <Row gap={2} align="start" style={{ margin: th.space(3), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.warning.soft }}>
                <AlertTriangle size={16} color={th.colors.warning.text} />
                <Text size="xs" style={{ flex: 1 }}>{t('Kai nakaam koshishein — agar ye aap nahi thay to password badal lein.')}</Text>
              </Row>
            )}
            <ListGroup>
              {(history.data ?? []).slice(0, 30).map((h) => (
                <ListRow key={h.id} dense icon={h.success ? CheckCircle2 : XCircle} iconTone={h.success ? 'success' : 'danger'}
                  title={<Row gap={2} wrap><Text size="sm" weight="medium">{h.deviceName || t('Device')}</Text>{h.isNewDevice && <Badge tone="info">{t('Naya device')}</Badge>}</Row>}
                  subtitle={`${ago(h.createdAt)}${h.location ? ` · ${h.location}` : ''}${!h.success && h.failureReason ? ` · ${h.failureReason}` : ''}`} />
              ))}
            </ListGroup>
          </>
        )}
      </Card>
    </View>
  );
}
