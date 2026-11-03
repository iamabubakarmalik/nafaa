/**
 * Agri dashboard (web agri/dashboard): sowing season readiness, farmer credit
 * recovery, government registration of seed / fertilizer / spray stock and
 * pending subsidy claims. Last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Boxes, BookOpen, Calendar, CalendarClock, Clock, Landmark, Leaf, Package, Plus, Receipt, ShieldAlert, ShoppingCart, Sprout, Tractor, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { deriveAgriKind, needsGovtReg, certState, lateBy, planCycle, planProducts, type AgriKind } from '@nafaa/core/industries/agri';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Card, ListRow, Text } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { farmersApi, seasonalPlansApi, subsidyApi } from '../api';
import { useAgriFacts, useStockLines } from '../facts';
import { AGRI_KEYS, todayKey } from '../meta';

function useAgriOps() {
  const facts = useAgriFacts();
  const stockQ = useStockLines();
  const farmersQ = useQuery({ queryKey: [AGRI_KEYS.ops, 'farmers'], queryFn: () => farmersApi.list({}).catch(() => []), staleTime: 60_000 });
  const plansQ = useQuery({ queryKey: [AGRI_KEYS.ops, 'plans'], queryFn: () => seasonalPlansApi.list({ active: true }).catch(() => []), staleTime: 5 * 60_000 });
  const subsidyQ = useQuery({ queryKey: [AGRI_KEYS.ops, 'subsidy'], queryFn: () => subsidyApi.list({}).catch(() => []), staleTime: 5 * 60_000 });
  const today = todayKey();

  const stock = useMemo(() => (stockQ.data ?? []).map((r) => {
    const f = facts.get(r.productId);
    const kind = (f?.category as AgriKind | undefined) ?? deriveAgriKind(r.category?.name, r.name);
    const cert = certState(f?.govtRegExpiry);
    const regulated = needsGovtReg(kind);
    return { id: r.productId, name: r.name, unit: r.unit, stock: Number(r.stock || 0), value: Number(r.valueAtCost ?? r.retail ?? 0), crops: f?.targetCrops ?? [], isOut: r.status === 'out', blocked: regulated && cert.state === 'expired', certSoon: regulated && cert.state === 'soon', certDays: cert.days };
  }), [stockQ.data, facts]);

  const registration = useMemo(() => {
    const blocked = stock.filter((r) => r.blocked && r.stock > 0);
    const soon = stock.filter((r) => r.certSoon);
    return { blocked: blocked.length, blockedValue: blocked.reduce((s, r) => s + r.value, 0), soon: soon.length, list: [...blocked, ...soon].sort((a, b) => (a.certDays ?? 0) - (b.certDays ?? 0)).slice(0, 6) };
  }, [stock]);

  const farmers = useMemo(() => {
    const rows = (farmersQ.data ?? []).map((f) => {
      const owed = Number(f.currentBalance || 0) || Number(f.totalOutstanding || 0);
      const late = lateBy(owed, f.lastPurchaseAt, Number(f.creditDays || 60));
      return { ...f, owed, late, overdue: late !== null && late > 0 };
    });
    const owing = rows.filter((f) => f.owed > 0);
    const overdue = rows.filter((f) => f.overdue).sort((a, b) => (b.late ?? 0) - (a.late ?? 0));
    return { total: rows.length, owed: owing.reduce((s, f) => s + f.owed, 0), owing: owing.length, overdue: overdue.length, overdueAmount: overdue.reduce((s, f) => s + f.owed, 0), list: overdue.slice(0, 6) };
  }, [farmersQ.data]);

  const season = useMemo(() => {
    const list = (plansQ.data ?? []).flatMap((p) => {
      const c = planCycle(p, today);
      if (!c.now && !c.soon) return [];
      const key = (p.cropName || '').trim().toLowerCase();
      const items = stock.filter((r) => r.crops.some((x) => { const k = x.trim().toLowerCase(); return k === key || k.includes(key) || key.includes(k); }) || planProducts(p.recommendedProducts).some((x) => x.productId === r.id));
      const out = items.filter((i) => i.isOut).length;
      return [{ id: p.id, crop: p.cropName, toSow: c.toSow, now: c.now, items: items.length, out, risky: items.length === 0 || out > 0 }];
    });
    return { list: list.sort((a, b) => Number(b.risky) - Number(a.risky) || a.toSow - b.toSow).slice(0, 6), risky: list.filter((s) => s.risky).length };
  }, [plansQ.data, stock, today]);

  const subsidy = useMemo(() => {
    const stuck = (subsidyQ.data ?? []).filter((c) => c.status === 'PENDING' || c.status === 'APPROVED');
    return { count: stuck.length, amount: stuck.reduce((s, c) => s + Number(c.subsidyAmount || 0), 0), list: stuck.slice(0, 6) };
  }, [subsidyQ.data]);

  return { registration, farmers, season, subsidy, query: farmersQ, refetch: () => { void farmersQ.refetch(); void plansQ.refetch(); void subsidyQ.refetch(); void stockQ.refetch(); } };
}

export function AgriDashboardScreen() {
  const can = usePermission();
  const { cost } = useCostMask();
  const ops = useAgriOps();
  const { registration, farmers, season, subsidy } = ops;

  const attention: DashAttention[] = [];
  if (registration.blocked) attention.push({ icon: ShieldAlert, tone: 'danger', text: t('{{blocked}} cheezon ki registration khatam — {{blockedValue}} ka maal qanoonan bech nahi sakte', { blocked: registration.blocked, blockedValue: cost(registration.blockedValue) }), href: '/products' });
  if (farmers.overdue) attention.push({ icon: Clock, tone: 'warning', text: t('{{overdue}} farmer ka udhaar ka waqt guzar gaya — {{overdueAmount}}', { overdue: farmers.overdue, overdueAmount: cost(farmers.overdueAmount) }), href: '/agri/farmers' });
  if (season.risky) attention.push({ icon: Sprout, tone: 'warning', text: t('{{risky}} fasal ki bijai aa rahi hai magar maal poora nahi', { risky: season.risky }), href: '/agri/seasonal-plans' });
  if (registration.soon) attention.push({ icon: CalendarClock, tone: 'info', text: t('{{soon}} cheezon ki registration 60 din me khatam — renew karwa lein', { soon: registration.soon }), href: '/products' });
  if (subsidy.count) attention.push({ icon: Landmark, tone: 'neutral', text: t('{{amount}} subsidy sarkar ke paas atki hai — {{count}} claim', { amount: cost(subsidy.amount), count: subsidy.count }), href: '/agri/subsidy' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/agri/farmers', icon: Tractor, label: t('Farmer'), hint: farmers.overdue ? t('{{overdue}} late', { overdue: farmers.overdue }) : t('{{total}} log', { total: farmers.total }), show: can(P.AGRI_FARMERS_VIEW) },
    { href: '/agri/bulk-orders/new', icon: Boxes, label: t('Bara order'), hint: t('Naya order'), show: can(P.AGRI_ORDERS_MANAGE) },
    { href: '/agri/bulk-orders', icon: Boxes, label: t('Bare order'), hint: t('Sab dekhein'), show: can(P.AGRI_ORDERS_VIEW) },
    { href: '/agri/seasonal-plans', icon: Calendar, label: t('Fasal calendar'), hint: season.risky ? t('{{risky}} ka maal kam', { risky: season.risky }) : t('Bijai ka waqt'), show: can(P.AGRI_ORDERS_VIEW) },
    { href: '/agri/subsidy', icon: Landmark, label: t('Subsidy'), hint: subsidy.count ? t('{{count}} baqi', { count: subsidy.count }) : t('Claims'), show: can(P.AGRI_ORDERS_VIEW) },
    { href: '/agri/advisory', icon: Leaf, label: t('Mashwara'), hint: t('Fasal ki salah'), show: can(P.AGRI_ADVISORY_VIEW) },
    { href: '/products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Package, label: t('Maal'), hint: t('Sab cheezein'), show: can(P.PRODUCTS_VIEW) },
    { href: '/khata', icon: BookOpen, label: t('Khata'), hint: t('Udhaar'), show: can(P.KHATA_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ];

  return (
    <PackDashboard title={t('Agri')} onRefresh={ops.refetch}
      stats={[
        { label: t('Farmer ka udhaar'), value: cost(farmers.owed) },
        { label: t('Bijai qareeb'), value: String(season.list.length) },
        { label: t('Registration khatam'), value: String(registration.blocked) },
      ]}
      attention={attention} actions={actions}>
      <OfflineNote feature="agriDesk" />
      <CachedNote query={ops.query} />
      {season.list.length > 0 && (
        <Card flush title={t('Bijai qareeb hai')} description={season.risky ? t('{{risky}} fasal ka maal poora nahi', { risky: season.risky }) : t('Agle 45 din ki fasalein')}>
          {season.list.map((s, i) => (
            <ListRow key={s.id} divider={i < season.list.length - 1} icon={Sprout} iconTone={s.risky ? 'danger' : 'success'} title={s.crop}
              subtitle={s.items === 0 ? t('Koi maal is fasal se juda nahi') : s.out > 0 ? t('{{out}} cheezein khatam · {{items}} kul', { out: s.out, items: s.items }) : t('{{items}} cheezein maujood', { items: s.items })}
              trailing={<Badge tone={s.now ? 'success' : 'neutral'}>{s.now ? t('Chal rahi') : t('{{toSow}} din', { toSow: s.toSow })}</Badge>} chevron onPress={() => router.push('/agri/seasonal-plans' as never)} />
          ))}
        </Card>
      )}
      {can(P.AGRI_FARMERS_VIEW) && farmers.list.length > 0 && (
        <Card flush title={t('Farmer receiving')} description={t('{{overdueAmount}} ka waqt guzar chuka', { overdueAmount: cost(farmers.overdueAmount) })}>
          {farmers.list.map((f, i) => (
            <ListRow key={f.id} divider={i < farmers.list.length - 1} icon={Tractor} iconTone="warning" title={f.fullName} subtitle={[f.village, f.district].filter(Boolean).join(', ') || f.phone}
              trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={f.owed} size="sm" weight="semibold" /><Text size="2xs" tone="danger">{t('{{lateBy}} din late', { lateBy: f.late ?? 0 })}</Text></View>} chevron onPress={() => router.push(`/agri/farmers/${f.id}` as never)} />
          ))}
        </Card>
      )}
      {registration.list.length > 0 && (
        <Card flush title={t('Registration')} description={registration.blocked ? t('{{blocked}} khatam · {{blockedValue}} ka maal', { blocked: registration.blocked, blockedValue: cost(registration.blockedValue) }) : t('{{soon}} jald khatam', { soon: registration.soon })}>
          {registration.list.map((r, i) => (
            <ListRow key={r.id} divider={i < registration.list.length - 1} icon={ShieldAlert} iconTone={r.blocked ? 'danger' : 'warning'} title={r.name} subtitle={`${r.stock} ${r.unit} · ${cost(r.value)}`}
              trailing={<Badge tone={r.blocked ? 'danger' : 'warning'}>{r.blocked ? t('Khatam') : t('{{certDays}} din', { certDays: r.certDays })}</Badge>} chevron onPress={() => router.push(`/products/${r.id}` as never)} />
          ))}
        </Card>
      )}
      {subsidy.list.length > 0 && (
        <Card flush title={t('Subsidy claims')} description={t('{{amount}} ka jawab baqi', { amount: cost(subsidy.amount) })}>
          {subsidy.list.map((c, i) => (
            <ListRow key={c.id} divider={i < subsidy.list.length - 1} icon={Landmark} title={c.schemeName} subtitle={`${c.claimNumber} · ${c.productType}`}
              trailing={<Badge tone={c.status === 'APPROVED' ? 'info' : 'warning'}>{c.status === 'APPROVED' ? t('Approve') : t('Baqi')}</Badge>} chevron onPress={() => router.push('/agri/subsidy' as never)} />
          ))}
        </Card>
      )}
    </PackDashboard>
  );
}
