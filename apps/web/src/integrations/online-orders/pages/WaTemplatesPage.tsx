/**
 * WhatsApp messages: the shop's own text for each wa.me message the board
 * and the abandoned-carts list send (confirm order, address check, advance,
 * dispatched, delivered, cart recovery). An empty box uses Nafaa's text.
 * The WhatsApp bot is shown as coming soon.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bot, CheckCircle2, GraduationCap, MessageCircle, RotateCcw, Save, Truck } from 'lucide-react';
import { Button, Card, PageHero, PageShell, Skeleton, Textarea, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useAuthStore } from '@core/stores/auth.store';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { growthApi, type WaTemplateKey } from '../api/growth.api';
import { WA_TEMPLATES, defaultTemplateText, fillTemplate, usePlatformWaTemplates, useWaTemplates } from '../lib/waTemplates';

const SAMPLE = {
  name: 'Ayesha', shop: '', no: '1042', items: '2 × Lawn suit', total: 'Rs 6,500', cod: 'Rs 4,500', address: 'House 12, Street 4, Gulberg',
  city: 'Lahore', advance: 'Rs 2,000', courier: 'PostEx', tracking: 'CN123456789', trackingUrl: 'https://postex.pk/tracking', cartUrl: 'https://shop.pk/cart/abc',
};
/** Owner or manager, like the API (assertManager). */
const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];
const TAGS = ['{name}', '{shop}', '{no}', '{items}', '{total}', '{cod}', '{address}', '{city}', '{advance}', '{courier}', '{tracking}', '{trackingUrl}', '{cartUrl}'];

export default function WaTemplatesPage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const shopName = useAuthStore((s) => s.tenant?.name) ?? '';
  const canEdit = MANAGERS.includes(String(role));
  const q = useWaTemplates();
  const platformWa = usePlatformWaTemplates();
  const ownCount = WA_TEMPLATES.filter((x) => q.data?.templates?.[x.key]?.trim()).length;
  const [draft, setDraft] = useState<Partial<Record<WaTemplateKey, string>>>({});
  useEffect(() => { if (q.data) setDraft(q.data.templates); }, [q.data]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(q.data?.templates ?? {}), [draft, q.data]);
  const save = useMutation({
    mutationFn: () => growthApi.saveWaTemplates(Object.fromEntries(Object.entries(draft).filter(([, v]) => v?.trim()))),
    onSuccess: (r) => { qc.setQueryData(['wa-templates'], r); toast.success(t('Messages save ho gaye')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <PageShell>
      <PageHero back="/online-store" backLabel={t('Online store')} title={t('WhatsApp messages')}
        meta={t('Orders board aur abandoned carts ka WhatsApp button yahi message bhejta hai')}
        actions={<button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        loading={q.isLoading}
        stats={[
          { label: t('Messages'), value: String(WA_TEMPLATES.length) },
          { label: t('Aap ke apne'), value: String(ownCount) },
          { label: t('Nafaa ke default'), value: String(WA_TEMPLATES.length - ownCount) },
        ]} />

      <Card title={t('Message me ye cheezein khud bharti hain')}>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((x) => <code key={x} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.75rem] text-slate-700">{x}</code>)}
        </div>
      </Card>

      {q.isLoading ? <Skeleton className="h-96 rounded-2xl" /> : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {WA_TEMPLATES.map((x) => {
            const own = draft[x.key] ?? '';
            const text = own.trim() || defaultTemplateText(x.key, platformWa);
            return (
              <section key={x.key} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${x.color}17`, color: x.color }}><x.icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.875rem] font-semibold text-slate-900">{x.label}</p>
                    <p className="text-[0.75rem] text-slate-500">{x.hint}</p>
                  </div>
                  {own.trim() && canEdit && (
                    <Button size="xs" variant="ghost" onClick={() => setDraft((d) => ({ ...d, [x.key]: '' }))} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>{t('Nafaa ka')}</Button>
                  )}
                </div>
                <Textarea value={own} onChange={(e) => setDraft((d) => ({ ...d, [x.key]: e.target.value }))} rows={4} maxLength={1000}
                  disabled={!canEdit} placeholder={defaultTemplateText(x.key, platformWa)} aria-label={x.label} />
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[#e7fbe9] px-3 py-2 text-[0.75rem] text-slate-800">{fillTemplate(text, { ...SAMPLE, shop: shopName })}</p>
              </section>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-slate-500">{canEdit ? t('Khali dabba = Nafaa ka message.') : t('Messages sirf malik ya manager badal sakta hai.')}</p>
        {canEdit && <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>}
      </div>

      <section className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/80">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Bot className="h-4 w-4" /></span>
        <div>
          <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900">{t('WhatsApp bot')}
            <span className="rounded-full bg-amber-100 px-1.5 py-px text-[0.625rem] font-semibold uppercase text-amber-800">{t('Soon')}</span></p>
          <p className="text-[0.8125rem] text-slate-600">{t('Bot khud message bhejega aur "Haan / Nahi" ka jawab order par laga dega. Abhi message aap ke WhatsApp se jata hai.')}</p>
        </div>
      </section>

      {guide.isOpen && (
        <PageGuide
          title={t('WhatsApp messages — aasaan tareeqa')}
          description={t('Har kaam ka apna message. Board par hara button dabayein, sahi message pehle nazar aata hai.')}
          onClose={guide.close}
          flow={[
            { label: t('Order aaya'), hint: t('Confirm message'), icon: MessageCircle, color: '#16a34a' },
            { label: t('Jawab'), hint: t('Haan / Jawab nahi / Mana'), icon: CheckCircle2, color: '#0d9488' },
            { label: t('Bhej diya'), hint: t('Tracking message'), icon: Truck, color: '#ea580c' },
          ]}
          steps={[
            { icon: MessageCircle, color: '#16a34a', title: t('Message badlein'), text: t('Dabbe me apna text likhein. {name} jaisi cheezein order se khud bharti hain.') },
            { icon: CheckCircle2, color: '#0d9488', title: t('Texted nishan'), text: t('Message bhejne par order par "Texted" lagta hai. Customer ka jawab usi menu se lagayein.') },
          ]}
        />
      )}
    </PageShell>
  );
}
