/**
 * Google (/settings/google): products on Google Shopping through a feed link
 * that Merchant Center reads daily, branch stock on Google Maps (local
 * inventory with store codes), and a Google review link / QR on the bill.
 * Nothing waits for a Google approval on Nafaa's side.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Copy, ExternalLink, MapPin, RefreshCw, ShoppingBag, Star, type LucideIcon } from 'lucide-react';
import {
  Alert, Badge, Button, Field, Input, PageHero, PageShell, Select, Skeleton, Switch, confirmDialog, controlClass,
} from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { GuideCard, type GuideData } from '@integrations/online-orders/components/guides/Guide';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { cn } from '@core/lib/cn';
import { googleApi, type GoogleOverview } from './google.api';

const KEY = ['google'];
const copy = (s: string) => navigator.clipboard.writeText(s).then(() => toast.success('Copy ho gaya'), () => toast.error('Copy nahi hua'));

function googleGuide(d: GoogleOverview | undefined): GuideData {
  const codes = Object.values(d?.settings.storeCodes ?? {}).filter(Boolean).length;
  return {
    brand: 'google',
    title: 'Google se jorne ki guide',
    intro: 'Teen hisse hain: Google Shopping (products), Google Maps (branch ka stock) aur reviews. Sirf pehla zaroori hai.',
    steps: [
      { title: 'Nafaa me feed chalu karein', body: <>"Google Shopping" me <b>Feed chalu karein</b> dabayein — aap ko ek product feed link milega. Pehle Online store me website ya order form hona zaroori hai.</>, done: !!d?.enabled },
      { title: 'Google Merchant Center account banayein', path: ['merchants.google.com', 'Sign up'], body: <>Muft account. Country <b>Pakistan</b>, currency <b>PKR</b>.</> },
      { title: 'Feed link paste karein', path: ['Merchant Center', 'Products', 'Add products', 'File', 'Add file from link'], body: <>Nafaa wala feed link paste karein aur fetch <b>Daily</b> rakhein. Price aur stock roz khud update hote rahenge.</> },
      { title: 'Google Maps par branch ka stock (optional)', path: ['Merchant Center', 'Settings', 'Business Profile'], body: <>Business Profile jorein, har branch ka <b>store code</b> (Business Profile → Info → Advanced) yahan likhein, phir <b>Local inventory</b> wala link bhi isi tarah "Add file from link" me daalein.</>, done: codes > 0 },
      { title: 'Reviews (optional)', body: <>Apni dukaan ka <b>Place ID</b> (ChIJ…) daalein — review link milega aur bill par QR chhap sakta hai.</>, done: !!d?.settings.placeId },
    ],
    test: [
      'Feed link browser me kholein — products ki list dikhni chahiye.',
      'Merchant Center → Products me 1-2 din me products "Approved" ho jate hain.',
      'Review QR chalu kar ke ek bill print karein — neeche QR aana chahiye.',
    ],
    errors: [
      { q: 'Google kehta hai tasveer nahi', a: 'Jis product ki tasveer nahi, Google use nahi leta. Products me tasveer lagayein — agli fetch me aa jayega.' },
      { q: 'Product ka link nahi', a: <>Google har product ka safha maangta hai. <Link to="/online-store/channels" className="font-semibold text-brand-700 hover:underline">Online store</Link> me website jorein ya order form chalu karein, phir neeche "Product ka safha kahan se" chunein.</> },
      { q: 'Merchant Center me price ya stock purana hai', a: 'Google feed din me ek dafa parhta hai. Merchant Center me feed kholein aur "Fetch now" dabayein.' },
      { q: 'Feed fetch fail — link nahi khulta', a: 'Kya "Naya link" banaya tha? Purana link band ho jata hai — Merchant Center me naya link daalein.' },
      { q: 'Maps par "In stock" nahi dikhta', a: 'Store code bilkul wahi ho jo Business Profile me hai, aur Local inventory wala link bhi daily fetch par laga ho.' },
    ],
    links: [
      { label: 'Google Merchant Center', href: 'https://merchants.google.com' },
      { label: 'Google Business Profile', href: 'https://business.google.com' },
      { label: 'Place ID dhoondein', href: 'https://developers.google.com/maps/documentation/places/web-service/place-id#find-id' },
    ],
  };
}

export default function GooglePage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: KEY, queryFn: googleApi.overview });
  const codes = Object.values(data?.settings.storeCodes ?? {}).filter(Boolean).length;
  const warnings = data?.stats?.warnings ?? [];

  return (
    <PageShell>
      <PageHero
        title={<span className="inline-flex items-center gap-2.5"><BrandLogo name="google" size={30} /> Google</span>}
        chip={data ? (data.enabled ? <>Feed chalu</> : <>Feed band</>) : undefined}
        meta="Products Google Shopping aur Maps par, aur customer se Google review"
        loading={isLoading}
        stats={data?.enabled ? [
          { label: 'Google ko products', value: String(Math.max(0, data.stats?.items ?? 0)) },
          { label: 'Tawajjo chahiye', value: String(warnings.length) },
          { label: 'Branches Maps par', value: `${codes}/${data.shops.length}` },
        ] : undefined}
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}</div>
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : error || !data ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Google ka safha nahi khula</p>
          <p className="mt-1 text-sm text-slate-500">{apiErrorMessage(error)}</p>
          <Button className="mt-3" variant="secondary" onClick={() => refetch()}>Dobara koshish</Button>
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-4">
            <MerchantCard data={data} />
            <LocalCard data={data} />
            <ReviewCard data={data} />
          </div>
          <GuideCard guide={googleGuide(data)} className="lg:sticky lg:top-4" />
        </div>
      )}
    </PageShell>
  );
}

function Section({ icon: Icon, color, title, badge, description, actions, children }: {
  icon: LucideIcon; color: string; title: string; badge?: ReactNode; description: ReactNode; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">{title}{badge}</h2>
          <p className="mt-0.5 text-[0.8125rem] text-slate-500">{description}</p>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <div className="mt-4">{children}</div>
    </section>
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

function UrlBox({ label, url, hint }: { label: string; url: string; hint?: ReactNode }) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="flex gap-2">
          <input id={id} readOnly value={url} onFocus={(e) => e.target.select()} className={cn(controlClass(), 'h-9 min-w-0 px-3 font-mono text-[0.75rem]')} />
          <Button size="sm" variant="secondary" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(url)}>Copy</Button>
        </div>
      )}
    </Field>
  );
}

function MerchantCard({ data }: { data: GoogleOverview }) {
  const save = useSave();
  const s = data.settings;
  const [brand, setBrand] = useState(s.defaultBrand);
  useEffect(() => setBrand(s.defaultBrand), [s.defaultBrand]);
  const items = Math.max(0, data.stats?.items ?? 0);

  return (
    <Section icon={ShoppingBag} color="#4285F4" title="Google Shopping"
      badge={data.enabled ? <Badge size="xs" variant="success" dot>Feed chalu</Badge> : <Badge size="xs" variant="default" dot>Band</Badge>}
      description="Har product naam, tasveer, price aur stock ke saath Google par. Price ya stock badle to Google roz khud update karta hai."
      actions={data.enabled ? (
        <Switch size="sm" checked aria-label="Feed band karein"
          onChange={async () => { if (await confirmDialog({ title: 'Feed band karein?', text: 'Google par products hat jayenge.', danger: true })) save.mutate({ enable: false }); }} />
      ) : undefined}>
      {data.channels.length === 0 ? (
        <Alert tone="warning" title="Pehle product ka safha chahiye">
          Google har product ka link maangta hai. <Link to="/online-store/channels" className="font-semibold underline">Online store</Link> me apni website jorein ya order form chalu karein (muft, 1 minute).
        </Alert>
      ) : !data.enabled ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
          <p className="min-w-0 flex-1 text-[0.8125rem] text-slate-600">Feed chalu karte hi ek link milega — wahi Google Merchant Center me lagana hai. Guide saath hai.</p>
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate({ enable: true })}>Feed chalu karein</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <UrlBox label="Product feed link" url={data.productFeedUrl!} hint="Merchant Center → Products → Add products → File → Add file from link" />
          <p className="text-[0.8125rem] text-slate-700"><b className="tabular-nums">{items}</b> product Google ko ja rahe hain.</p>
          {data.stats && data.stats.warnings.length > 0 && (
            <ul className="space-y-1.5 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200">
              {data.stats.warnings.map((w) => (
                <li key={w.code} className="flex items-start gap-1.5 text-[0.8125rem] text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /> {w.message}</li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Select size="sm" label="Product ka safha kahan se" hint="Customer Google par click kare to yahan pohanche" value={s.channelId ?? ''} onChange={(e) => save.mutate({ channelId: e.target.value || null })}>
              <option value="">Khud chunein (order form pehle)</option>
              {data.channels.map((c) => <option key={c.id} value={c.id}>{c.name}{c.hasForm ? ' — order form' : c.siteUrl ? ` — ${c.siteUrl.replace(/^https?:\/\//, '')}` : ''}</option>)}
            </Select>
            <Field label="Brand (jab product ka brand na ho)" hint="Khali = dukaan ka naam">
              {(id) => (
                <div className="flex gap-2">
                  <input id={id} value={brand} onChange={(e) => setBrand(e.target.value)} className={cn(controlClass(), 'h-9 min-w-0 px-3 text-[0.8125rem]')} />
                  {brand !== s.defaultBrand && <Button size="sm" loading={save.isPending} onClick={() => save.mutate({ defaultBrand: brand })}>Save</Button>}
                </div>
              )}
            </Field>
          </div>
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            <Switch size="sm" checked={s.includeOutOfStock} onChange={(e) => save.mutate({ includeOutOfStock: e.target.checked })}
              label="Khatam stock wale bhi dikhayein" description="'Out of stock' likh kar. Order form par stock na ho to customer order nahi kar sakta." className="py-3" />
          </div>
          <Button size="xs" variant="ghost" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={async () => { if (await confirmDialog({ title: 'Naya link banayein?', text: 'Purana link band ho jayega — Merchant Center me naya daalna hoga.', danger: true })) save.mutate({ rotate: true }); }}>
            Naya link banayein
          </Button>
        </div>
      )}
    </Section>
  );
}

function LocalCard({ data }: { data: GoogleOverview }) {
  const save = useSave();
  const [codes, setCodes] = useState<Record<string, string>>(data.settings.storeCodes);
  useEffect(() => setCodes(data.settings.storeCodes), [data.settings.storeCodes]);
  const dirty = JSON.stringify(codes) !== JSON.stringify(data.settings.storeCodes);
  if (!data.enabled) return null;
  return (
    <Section icon={MapPin} color="#34A853" title="Google Maps par stock"
      description="Log Maps par dukaan dekhein to 'In stock' products bhi dikhein — har branch ka apna stock. Optional.">
      <div className="space-y-3">
        <p className="text-[0.8125rem] text-slate-600">Har branch ka <b>store code</b> wahi likhein jo Google Business Profile me hai (Info → Advanced).</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.shops.map((sh) => (
            <Input size="sm" key={sh.id} label={sh.name} hint={sh.address ?? undefined} value={codes[sh.id] ?? ''}
              onChange={(e) => setCodes({ ...codes, [sh.id]: e.target.value })} placeholder="Store code (jaise LHR-01)" />
          ))}
        </div>
        {dirty && <Button size="sm" loading={save.isPending} onClick={() => save.mutate({ storeCodes: codes })}>Store codes mehfooz karein</Button>}
        {data.localInventoryUrl && Object.values(data.settings.storeCodes).some(Boolean) && (
          <UrlBox label="Local inventory link" url={data.localInventoryUrl} hint="Merchant Center → Add products → File → Local inventory → daily" />
        )}
      </div>
    </Section>
  );
}

function ReviewCard({ data }: { data: GoogleOverview }) {
  const save = useSave();
  const [placeId, setPlaceId] = useState(data.settings.placeId);
  useEffect(() => setPlaceId(data.settings.placeId), [data.settings.placeId]);
  return (
    <Section icon={Star} color="#F59E0B" title="Google reviews"
      description="Zyada reviews = Maps par upar. Bill par QR — customer scan kare aur seedha review likhe.">
      <div className="space-y-3">
        <Field label="Google Place ID" hint={<>Apni dukaan <a className="font-semibold text-brand-700 underline" href="https://developers.google.com/maps/documentation/places/web-service/place-id#find-id" target="_blank" rel="noreferrer">yahan search karein</a> aur "ChIJ…" copy karein</>}>
          {(id) => (
            <div className="flex gap-2">
              <input id={id} value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="ChIJ…" className={cn(controlClass(), 'h-9 min-w-0 px-3 font-mono text-[0.8125rem]')} />
              {placeId !== data.settings.placeId && <Button size="sm" loading={save.isPending} onClick={() => save.mutate({ placeId })}>Save</Button>}
            </div>
          )}
        </Field>
        {data.reviewUrl && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
              <a href={data.reviewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">Review link kholein <ExternalLink className="h-3.5 w-3.5" /></a>
              <Button size="xs" variant="secondary" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(data.reviewUrl!)}>Copy (WhatsApp ke liye)</Button>
            </div>
            <div className="border-t border-slate-100">
              <Switch size="sm" checked={data.settings.reviewOnBill} onChange={(e) => save.mutate({ reviewOnBill: e.target.checked })}
                label="Har bill par review QR" description="Bill ke neeche chhota QR: 'Google par review dein'" className="pt-3" />
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
