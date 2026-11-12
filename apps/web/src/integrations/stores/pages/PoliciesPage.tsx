/**
 * Store policies (return, privacy, terms, delivery). Each starts from a
 * simple-language template with the shop's name, phone and email filled
 * in, and stays fully editable. Customers see them in the footer and at
 * checkout.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, FileText, GraduationCap, RotateCcw, Save, ShieldCheck, Truck, Undo2 } from 'lucide-react';
import { Button, Card, PageShell, Segmented, Skeleton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type PolicyKind } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { RichTextEditor } from '../components/RichTextEditor';
import { SK, storeLink } from '../lib/hooks';
import { shortDate } from '../lib/format';

export default function PoliciesPage() {
  return (
    <PageShell>
      <StoreGate title={t('Policies')}>{(ctx) => <Policies ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

const KINDS: Array<{ kind: PolicyKind; label: string; path: string }> = [
  { kind: 'refund', label: t('Return aur refund'), path: '/policies/refund-policy' },
  { kind: 'shipping', label: t('Delivery'), path: '/policies/shipping-policy' },
  { kind: 'privacy', label: t('Privacy'), path: '/policies/privacy-policy' },
  { kind: 'terms', label: t('Shartein (terms)'), path: '/policies/terms-of-service' },
];

function Policies({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [kind, setKind] = useState<PolicyKind>('refund');
  const q = useQuery({ queryKey: SK.policies(id), queryFn: () => storesApi.policies(id) });
  const tpl = useQuery({ queryKey: ['stores', 'policy-templates'], queryFn: storesApi.policyTemplates, staleTime: Infinity });
  const current = q.data?.find((p) => p.kind === kind);
  const [body, setBody] = useState('');
  useEffect(() => { setBody(current?.bodyHtml ?? ''); }, [current]);
  const dirty = body !== (current?.bodyHtml ?? '');
  const save = useMutation({
    mutationFn: () => storesApi.savePolicy(id, kind, { bodyHtml: body, title: current?.title }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: SK.policies(id) }); toast.success(t('Save ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const useTemplate = () => {
    const tp = tpl.data?.find((x) => x.kind === kind);
    if (!tp) return;
    const before = body;
    setBody(tp.bodyHtml.replace(/\{\{store_name\}\}/g, ctx.store.name));
    toast(t('Nafaa ka namoona laga diya. Save dabayein.'), { action: { label: t('Wapas'), onClick: () => setBody(before) } });
  };
  const filled = (q.data ?? []).filter((p) => p.bodyHtml.trim()).length;

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Policies')} loading={q.isLoading}
        meta={t('Customer ka bharosa barhta hai. Asaan alfaz me namoona tayyar hai, apne hisaab se badlein.')}
        actions={<>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <a href={storeLink(ctx.store, ctx.list.storefrontUrl, KINDS.find((k) => k.kind === kind)!.path)} target="_blank" rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--hero-btn-bg)] px-2.5 text-[0.8125rem] font-semibold text-[color:var(--hero-btn-fg)] ring-1 ring-[color:var(--hero-btn-ring)]">
            <ExternalLink className="h-4 w-4" />{t('Website par dekhein')}
          </a>
        </>}
        stats={[
          { label: t('Policies'), value: String(KINDS.length) },
          { label: t('Likhi hui'), value: String(filled) },
          { label: t('Khali'), value: String(KINDS.length - filled) },
          { label: t('Aakhri tabdeeli'), value: shortDate(current?.updatedAt) },
        ]} />

      <Segmented value={kind} onChange={setKind} label={t('Policy')} items={KINDS.map((k) => ({ value: k.kind, label: k.label }))} />

      {q.isLoading ? <Skeleton className="h-96 rounded-2xl" /> : (
        <Card title={KINDS.find((k) => k.kind === kind)?.label}
          actions={<div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={useTemplate} disabled={!tpl.data} leftIcon={<RotateCcw className="h-4 w-4" />}>{t('Nafaa ka namoona')}</Button>
            <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>
          </div>}>
          <RichTextEditor value={body} onChange={setBody} minHeight={380} placeholder={t('Khali hai. "Nafaa ka namoona" dabayein.')} />
        </Card>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Policies — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Namoona lagayein'), hint: t('Ek click'), icon: FileText, color: '#2563eb' },
            { label: t('Apne din likhein'), hint: t('Return kitne din'), icon: Undo2, color: '#7c3aed' },
            { label: t('Save'), hint: t('Footer me khud'), icon: ShieldCheck, color: '#16a34a' },
          ]}
          steps={[
            { icon: Undo2, color: '#7c3aed', title: t('Return'), text: t('Kitne din me wapas, kaun si cheez wapas nahi (jaise sale ka maal), paisay kaise wapas — saaf likhein.') },
            { icon: Truck, color: '#ea580c', title: t('Delivery'), text: t('Kitne din, kaun se courier, COD charges. Delivery charges page se mel khaye.') },
          ]} />
      )}
    </>
  );
}
