import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Copy, ExternalLink, MapPin, RefreshCw, ShoppingBag, Star } from 'lucide-react';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { Badge, Banner, Btn, Card, EmptyState, Field, Page, SettingRow, Toggle, inputCls } from '@integrations/online-orders/components/ui/kit';
import { cn } from '@core/lib/cn';
import { googleApi, type GoogleOverview } from './google.api';

/* ═════════════════════════════════════════════════════════════
   GOOGLE — products Google Shopping par, "dukaan me maujood" Google
   Maps par, aur customer se Google review. Koi Google approval ka
   intezar nahi: Merchant Center khud hamara feed link roz parhta hai.
   ═════════════════════════════════════════════════════════════ */

const KEY = ['google'];
const copy = (s: string) => navigator.clipboard.writeText(s).then(() => toast.success('Copy ho gaya'), () => toast.error('Copy nahi hua'));

export default function GooglePage() {
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: googleApi.overview });
  return (
    <Page back={{ to: '/settings', label: 'Settings' }} title="Google"
      subtitle="Aap ke products Google Shopping aur Maps par — log dhoondein to aap ki dukaan nazar aaye.">
      {isLoading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        : error || !data ? <Card><EmptyState title="Safha nahi khula">{apiErrorMessage(error)}</EmptyState></Card>
        : (
          <>
            <MerchantCard data={data} />
            <LocalCard data={data} />
            <ReviewCard data={data} />
          </>
        )}
    </Page>
  );
}

function useSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: googleApi.update,
    onSuccess: (r) => { qc.setQueryData(KEY, r); qc.invalidateQueries({ queryKey: ['google-review'] }); toast.success('Mehfooz'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
}

function UrlBox({ label, url }: { label: string; url: string }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()} className={cn(inputCls, 'font-mono text-[12px]')} />
        <Btn icon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(url)}>Copy</Btn>
      </div>
    </Field>
  );
}

function MerchantCard({ data }: { data: GoogleOverview }) {
  const save = useSave();
  const s = data.settings;
  const [brand, setBrand] = useState(s.defaultBrand);
  useEffect(() => setBrand(s.defaultBrand), [s.defaultBrand]);

  return (
    <Card title={<span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-blue-600" /> Google Shopping (Merchant Center)
      {data.enabled ? <Badge tone="success" dot>Feed chalu</Badge> : <Badge tone="neutral">Band</Badge>}</span>}
      description="Har product naam, tasveer, qeemat aur stock ke saath Google par. Stock / qeemat badle to Google khud roz update kar leta hai."
      actions={data.enabled ? <Toggle checked onChange={() => { if (confirm('Feed band karein? Google par products hat jayenge.')) save.mutate({ enable: false }); }} /> : undefined}>
      {data.channels.length === 0 ? (
        <Banner tone="warning" title="Pehle product ka safha chahiye">
          Google har product ka link maangta hai. <Link to="/online-store/channels" className="font-semibold underline">Online store</Link> me apni website jorein ya <b>order form</b> chalu karein (muft, 1 minute).
        </Banner>
      ) : !data.enabled ? (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-[13px] text-slate-700 dark:text-slate-200">
            <li>Neeche "Feed chalu karein" — aap ko ek link milega</li>
            <li><a href="https://merchants.google.com" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">Google Merchant Center</a> me muft account (country: Pakistan, currency: PKR)</li>
            <li>Products → Add products → <b>File</b> → "Add file from link" → link paste → roz (daily) fetch</li>
          </ol>
          <Btn variant="primary" loading={save.isPending} onClick={() => save.mutate({ enable: true })}>Feed chalu karein</Btn>
        </div>
      ) : (
        <div className="space-y-4">
          <UrlBox label="Product feed link (Merchant Center me)" url={data.productFeedUrl!} />
          {data.stats && (
            <div className="space-y-2">
              <p className="text-[13px] text-slate-700 dark:text-slate-200"><b>{data.stats.items}</b> product Google ko ja rahe hain.</p>
              {data.stats.warnings.map((w) => (
                <p key={w.code} className="flex items-start gap-1.5 text-[12.5px] text-amber-700 dark:text-amber-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w.message}</p>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Product ka safha kahan se" help="Customer Google par click kare to yahan pohanche">
              <select value={s.channelId ?? ''} onChange={(e) => save.mutate({ channelId: e.target.value || null })} className={inputCls}>
                <option value="">Khud chunein (order form pehle)</option>
                {data.channels.map((c) => <option key={c.id} value={c.id}>{c.name} {c.hasForm ? '— order form' : c.siteUrl ? `— ${c.siteUrl}` : ''}</option>)}
              </select>
            </Field>
            <Field label="Brand (jab product ka brand na ho)" help="Khali = dukaan ka naam">
              <div className="flex gap-2">
                <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputCls} />
                {brand !== s.defaultBrand && <Btn onClick={() => save.mutate({ defaultBrand: brand })}>Save</Btn>}
              </div>
            </Field>
          </div>
          <SettingRow title="Khatam stock wale bhi dikhayein" help="'Out of stock' likh kar — order form me stock na ho to ye kaam nahi karta"
            control={<Toggle checked={s.includeOutOfStock} onChange={(v) => save.mutate({ includeOutOfStock: v })} />} />
          <Btn size="sm" variant="plain" icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => { if (confirm('Naya link banayein? Purana link band ho jayega — Merchant Center me naya daalna hoga.')) save.mutate({ rotate: true }); }}>Naya link</Btn>
        </div>
      )}
    </Card>
  );
}

function LocalCard({ data }: { data: GoogleOverview }) {
  const save = useSave();
  const [codes, setCodes] = useState<Record<string, string>>(data.settings.storeCodes);
  useEffect(() => setCodes(data.settings.storeCodes), [data.settings.storeCodes]);
  const dirty = JSON.stringify(codes) !== JSON.stringify(data.settings.storeCodes);
  if (!data.enabled) return null;
  return (
    <Card title={<span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> Dukaan me maujood (Google Maps)</span>}
      description="Log Google Maps par dukaan dekhein to 'In stock' products bhi dikhein — har branch ka apna stock.">
      <div className="space-y-3">
        <ol className="list-decimal space-y-1 pl-5 text-[13px] text-slate-700 dark:text-slate-200">
          <li>Google Business Profile ko Merchant Center se jorein (Merchant Center → Settings → Business Profile)</li>
          <li>Har branch ka <b>store code</b> Business Profile me likha hota hai (Info → Advanced) — wahi neeche likhein</li>
          <li>Merchant Center → Products → Add → File → <b>Local inventory</b> → neeche wala link, roz</li>
        </ol>
        {data.shops.map((sh) => (
          <Field key={sh.id} label={sh.name} help={sh.address ?? undefined}>
            <input value={codes[sh.id] ?? ''} onChange={(e) => setCodes({ ...codes, [sh.id]: e.target.value })} placeholder="Store code (jaise LHR-01)" className={cn(inputCls, 'w-56')} />
          </Field>
        ))}
        {dirty && <Btn variant="primary" loading={save.isPending} onClick={() => save.mutate({ storeCodes: codes })}>Store codes mehfooz</Btn>}
        {data.localInventoryUrl && Object.keys(data.settings.storeCodes).length > 0 && <UrlBox label="Local inventory link" url={data.localInventoryUrl} />}
      </div>
    </Card>
  );
}

function ReviewCard({ data }: { data: GoogleOverview }) {
  const save = useSave();
  const [placeId, setPlaceId] = useState(data.settings.placeId);
  useEffect(() => setPlaceId(data.settings.placeId), [data.settings.placeId]);
  return (
    <Card title={<span className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Google reviews</span>}
      description="Zyada reviews = Google Maps par upar. Bill par QR — customer scan kare aur seedha review likhe.">
      <div className="space-y-3">
        <Field label="Google Place ID" help={<>Apni dukaan <a className="font-semibold text-blue-700 underline" href="https://developers.google.com/maps/documentation/places/web-service/place-id#find-id" target="_blank" rel="noreferrer">yahan dhoondein</a> → "ChIJ…" copy karein</>}>
          <div className="flex gap-2">
            <input value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="ChIJ…" className={cn(inputCls, 'font-mono')} />
            {placeId !== data.settings.placeId && <Btn variant="primary" loading={save.isPending} onClick={() => save.mutate({ placeId })}>Save</Btn>}
          </div>
        </Field>
        {data.reviewUrl && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <a href={data.reviewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">Review link kholein <ExternalLink className="h-3.5 w-3.5" /></a>
              <Btn size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(data.reviewUrl!)}>Copy (WhatsApp ke liye)</Btn>
            </div>
            <SettingRow title="Har bill par review QR" help="Bill ke neeche chhota QR: 'Google par review dein'"
              control={<Toggle checked={data.settings.reviewOnBill} onChange={(v) => save.mutate({ reviewOnBill: v })} />} />
          </>
        )}
      </div>
    </Card>
  );
}
