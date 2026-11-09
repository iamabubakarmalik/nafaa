/**
 * Add or change a campaign: platform, name as in the ads manager, the
 * utm_campaign of its links and the discount codes it gives out. Orders with
 * one of the codes, or with that utm_campaign, count for this campaign.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button, Modal, confirmDialog } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { t as tr } from '@core/i18n';
import { AD_PLATFORMS, apiError, type AdPlatform } from '../api/growth.api';
import { MARKETING_KEY, marketingApi, type Campaign } from '../api/marketing.api';
import { PLATFORM } from '../ads/meta';

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
const labelCls = 'mb-1.5 block text-[0.8125rem] font-medium text-slate-700';

export type CampaignDraft = Partial<Pick<Campaign, 'platform' | 'name' | 'utmCampaign' | 'discountCodes'>>;

export function CampaignForm({ campaign, draft, onClose }: { campaign: Campaign | null; draft?: CampaignDraft; onClose: () => void }) {
  const qc = useQueryClient();
  const start = campaign ?? draft ?? {};
  const [platform, setPlatform] = useState<AdPlatform>(start.platform ?? 'META');
  const [name, setName] = useState(start.name ?? '');
  const [utm, setUtm] = useState(start.utmCampaign ?? '');
  const [codes, setCodes] = useState((start.discountCodes ?? []).join(', '));
  const [budget, setBudget] = useState(campaign?.dailyBudget != null ? String(campaign.dailyBudget) : '');
  const [status, setStatus] = useState<Campaign['status']>(campaign?.status ?? 'ACTIVE');
  const [note, setNote] = useState(campaign?.note ?? '');
  const done = () => { qc.invalidateQueries({ queryKey: [MARKETING_KEY] }); onClose(); };

  const save = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error(tr('Campaign ka naam likhein'));
      const body = {
        platform, name: name.trim(), utmCampaign: utm.trim() || null,
        discountCodes: codes.split(/[,\s]+/).map((c) => c.trim().toUpperCase()).filter(Boolean),
        dailyBudget: budget.trim() === '' ? null : Number(budget), status, note: note.trim() || null,
      };
      return campaign ? marketingApi.updateCampaign(campaign.id, body) : marketingApi.createCampaign(body);
    },
    onSuccess: () => { toast.success(campaign ? tr('Campaign badal gayi') : tr('Campaign ban gayi')); done(); },
    onError: (e) => toast.error(apiError(e, tr('Save nahi hua'))),
  });
  const remove = useMutation({
    mutationFn: () => marketingApi.removeCampaign(campaign!.id),
    onSuccess: () => { toast.success(tr('Campaign mit gayi')); done(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi mita'))),
  });

  return (
    <Modal open onClose={onClose} size="md" title={campaign ? tr('Campaign badlein') : tr('Nayi campaign')}
      description={tr('Order is campaign ka gina jata hai jab us me is ka discount code ho, ya link ka utm_campaign mile.')}
      footer={<div className="flex w-full items-center gap-2">
        {campaign && (
          <Button variant="ghost" leftIcon={<Trash2 className="h-4 w-4" />} disabled={remove.isPending}
            onClick={async () => { if (await confirmDialog({ title: tr('"{{name}}" mitayein?', { name: campaign.name }), text: tr('Ads ka kharcha nahi mitega, sirf codes aur link ka rishta.'), danger: true })) remove.mutate(); }}>
            {tr('Mitayein')}
          </Button>
        )}
        <span className="flex-1" />
        <Button variant="secondary" onClick={onClose}>{tr('Band karein')}</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending}>{tr('Save')}</Button>
      </div>}>
      <div className="space-y-4">
        <div>
          <p className={labelCls}>{tr('Platform')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AD_PLATFORMS.map((p) => (
              <button key={p} type="button" onClick={() => setPlatform(p)} aria-pressed={platform === p}
                className={cn('flex h-10 items-center gap-2 rounded-xl px-2.5 text-[0.8125rem] font-semibold ring-1',
                  platform === p ? 'bg-brand-50 text-brand-900 ring-2 ring-brand-500' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                <BrandLogo name={PLATFORM[p].brand} size={20} /><span className="truncate">{PLATFORM[p].short}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="cmp-name" className={labelCls}>{tr('Campaign ka naam (jaisa Ads Manager me)')}</label>
          <input id="cmp-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={tr('Maslan: Winter sale')} className={inputCls} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cmp-utm" className={labelCls}>{tr('Link ka utm_campaign')}</label>
            <input id="cmp-utm" value={utm} onChange={(e) => setUtm(e.target.value)} maxLength={200} placeholder={tr('Khali = campaign ka naam')} className={inputCls} />
          </div>
          <div>
            <label htmlFor="cmp-codes" className={labelCls}>{tr('Discount codes')}</label>
            <input id="cmp-codes" value={codes} onChange={(e) => setCodes(e.target.value)} placeholder="EID20, AYESHA10" className={cn(inputCls, 'uppercase')} />
          </div>
          <div>
            <label htmlFor="cmp-budget" className={labelCls}>{tr('Roz ka budget (Rs)')}</label>
            <input id="cmp-budget" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ''))} placeholder="—" className={cn(inputCls, 'tabular-nums')} />
          </div>
          <div>
            <label htmlFor="cmp-status" className={labelCls}>{tr('Status')}</label>
            <select id="cmp-status" value={status} onChange={(e) => setStatus(e.target.value as Campaign['status'])} className={inputCls}>
              <option value="ACTIVE">{tr('Chal rahi hai')}</option>
              <option value="PAUSED">{tr('Ruki hui')}</option>
              <option value="ENDED">{tr('Khatam')}</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="cmp-note" className={labelCls}>{tr('Note')}</label>
          <input id="cmp-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={inputCls} />
        </div>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600">
          {tr('Shopify par naya discount code Nafaa nahi bana sakta — pehle se bana hua code yahan likhein.')}
        </p>
      </div>
    </Modal>
  );
}
