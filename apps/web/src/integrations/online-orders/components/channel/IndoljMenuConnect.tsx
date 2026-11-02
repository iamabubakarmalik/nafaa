/**
 * Indolj menu connection for a website built on Indolj: the Menu API keys
 * Indolj gives the shop bring the whole menu (with sizes) into Nafaa so each
 * item can be linked to a Nafaa product. Shown only on Indolj channels.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Lock } from 'lucide-react';
import { Button, confirmDialog, Input } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { apiErrorMessage, onlineOrdersApi, type WebsiteOverview } from '../../api/online-orders.api';
import { whenText } from '../../lib/labels';
import { t } from '@core/i18n';

const FIELDS = [
  ['activationToken', t('Activation token'), t('Indolj ki team se')],
  ['secret', t('JWT secret key'), t('Merchant Menu API key')],
  ['merchantId', t('Merchant ID (optional)'), ''],
  ['branchId', t('Branch ID (optional)'), ''],
  ['baseUrl', t('API address (optional)'), t('Khali chhorein = console.indolj.io')],
] as const;

export function IndoljMenuConnect({ data, onChange }: { data: WebsiteOverview; onChange: (d: WebsiteOverview) => void }) {
  const qc = useQueryClient();
  const i = data.integration!;
  const id = i.id;
  const [f, setF] = useState({ activationToken: '', merchantId: '', secret: '', baseUrl: '', branchId: '' });
  const [edit, setEdit] = useState(false);
  const refresh = () => {
    onlineOrdersApi.channel(id).then(onChange).catch(() => null);
    qc.invalidateQueries({ queryKey: ['channel-catalog', id] });
  };
  const save = useMutation({
    mutationFn: () => onlineOrdersApi.connectIndolj(id, { ...f, baseUrl: f.baseUrl || undefined, branchId: f.branchId || undefined, merchantId: f.merchantId || undefined }),
    onSuccess: (r) => { toast.success(t('Indolj menu se {{items}} items aa gaye', { items: r.items })); setEdit(false); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const off = useMutation({
    mutationFn: () => onlineOrdersApi.disconnectIndolj(id),
    onSuccess: () => { toast.success(t('Indolj menu ka link hata diya')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const connected = !!i.indolj?.connected;

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <header className="flex flex-wrap items-center gap-3">
        <BrandLogo name="indolj" size={36} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Indolj menu')}</h2>
          <p className="text-[0.75rem] text-slate-500">{t('Menu Nafaa me aata hai, phir har item ek Nafaa product se jurta hai')}</p>
        </div>
        {connected && !edit && (
          <>
            <Button size="xs" variant="secondary" onClick={() => setEdit(true)}>{t('Keys badlein')}</Button>
            <Button size="xs" variant="ghost" className="text-rose-700" loading={off.isPending}
              onClick={async () => { if (await confirmDialog({ title: t('Indolj menu ka link hatayein?'), text: t('Jore hue products waise hi rahenge. Orders aate rahenge.'), danger: true })) off.mutate(); }}>{t('Hatayein')}</Button>
          </>
        )}
      </header>

      {connected && !edit ? (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-success-50 px-3 py-2 text-[0.8125rem] text-success-900 ring-1 ring-inset ring-success-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
          {t('Menu jura hai{{value}}. Items Products tab me jorein.', { value: i.indolj?.connectedAt ? t(' · {{connectedAt}} se', { connectedAt: whenText(i.indolj.connectedAt) }) : '' })}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([k, label, hint]) => (
              <Input key={k} size="sm" label={label} hint={hint || undefined} type={k === 'secret' || k === 'activationToken' ? 'password' : 'text'}
                autoComplete="off" spellCheck={false} className="font-mono" value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Lock className="h-3.5 w-3.5" /> {' '}{t('Keys mehfooz rakhi jati hain')}</span>
            <div className="flex gap-2">
              {connected && <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>{t('Rehne dein')}</Button>}
              <Button size="sm" loading={save.isPending} disabled={!f.activationToken.trim() || !f.secret.trim()} onClick={() => save.mutate()}>{t('Menu check karke jorein')}</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
