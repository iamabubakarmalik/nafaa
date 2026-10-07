import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, CheckCircle2, ChevronRight, Circle, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { apiErrorMessage, onlineOrdersApi, type WebsiteOverview } from '../../api/online-orders.api';
import { docsUrl } from '../../lib/docs';
import { Btn, Card, inputCls } from '../ui/kit';
import { CopyField } from './CopyField';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   SETUP KE HISSE — malik ya developer khud jor sake:
   Indolj ki General POS guide, har branch ka URL, aur masle ka hal.
   Har hissa poori guide (/docs/online-store) ke us hisse se jurta hai.
   ═════════════════════════════════════════════════════════════ */

type Shop = { id: string; name: string; isActive?: boolean };

function useActiveShops(): Shop[] {
  const { data } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const list = (Array.isArray(data) ? data : (data as any)?.items ?? []) as Shop[];
  return list.filter((s) => s.isActive !== false);
}

/** "Poori guide" ka chhota link — nayi tab me */
export function DocsLink({ anchor, children = 'Poori guide' }: { anchor?: string; children?: ReactNode }) {
  return (
    <a href={docsUrl(anchor)} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
      <BookOpen className="h-3.5 w-3.5" /> {children}
    </a>
  );
}

function Step({ n, done, title, children }: { n: number; done?: boolean; title: ReactNode; children?: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
        done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200')}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{title}</div>
        {children && <div className="mt-1.5 space-y-2 text-[13px] text-slate-600 dark:text-slate-300">{children}</div>}
      </div>
    </li>
  );
}

/* ─── INDOLJ ─── */

/** Indolj: menu (activation token) + orders (General POS har branch me) — sab copy button ke saath */
export function IndoljGuide({ data, onOpenProducts }: { data: WebsiteOverview; onOpenProducts: () => void }) {
  const i = data.integration!;
  const shops = useActiveShops();
  const multi = shops.length > 1;
  const defaultShop = i.config?.shopId ?? (i as any).shopId ?? shops[0]?.id;
  const rows = (multi ? shops : shops.filter((s) => s.id === defaultShop).slice(0, 1)).map((s) => ({
    ...s, url: multi ? `${data.urls.base}/orders/branch/${s.id}` : data.urls.orders,
  }));
  const menuOk = !!i.indolj?.connected;
  const ordersOk = !!data.stats?.lastOrderAt;

  const message = [
    'Hi Indolj team,',
    '',
    `Please set up the General POS integration for ${i.displayName} with Nafaa POS. For each branch, use these values:`,
    '',
    ...rows.flatMap((r) => [
      `*${r.name}*`,
      `• POS Code: ${r.id}`,
      `• Token: ${i.apiKey}`,
      `• Call Back URL: ${r.url}`,
      `• Cancel Call Back URL: ${r.url}`,
      '• Status: Active · Send on Order Placement: ON',
      '',
    ]),
    multi ? 'Each branch has its own Call Back URL — that is how Nafaa knows which branch an order belongs to.' : '',
    'Once done, please place one test order per branch and let us know. Thanks!',
  ].filter((l, idx, arr) => !(l === '' && arr[idx - 1] === '')).join('\n');

  const copy = () => navigator.clipboard?.writeText(message).then(() => toast.success('Paigham copy ho gaya — Indolj group me paste karein'));

  return (
    <Card title="Indolj se jorna" description="Do hisse: menu (products) aur orders. Orders wali settings aksar Indolj ki team lagati hai — neeche wala paigham unhein bhej dein."
      actions={<DocsLink anchor="indolj" />}>
      <ol className="space-y-5">
        <Step n={1} done={menuOk} title={<>Menu Nafaa me {menuOk && <span className="font-normal text-emerald-700">— jura hua ✓</span>}</>}>
          <p>Indolj se <b>Menu API activation token</b> aur <b>JWT secret</b> lein, phir Products tab me <b>"Indolj se jorein"</b> me paste karein.</p>
          <Btn size="sm" onClick={onOpenProducts}>Products tab kholein</Btn>
        </Step>

        <Step n={2} done={ordersOk} title={<>Orders — Indolj ki General POS settings {ordersOk && <span className="font-normal text-emerald-700">— orders aa rahe hain ✓</span>}</>}>
          <p>{multi ? 'Har branch ki' : 'Branch ki'} General POS settings me ye khaane bharein:</p>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                {multi && <div className="mb-2 text-[12.5px] font-bold uppercase tracking-wide text-slate-500">{r.name}</div>}
                <div className="grid gap-2 md:grid-cols-2">
                  <CopyField label="Call Back URL" value={r.url} />
                  <CopyField label="Cancel Call Back URL" value={r.url} />
                  <CopyField label="Token" value={i.apiKey} secret />
                  <CopyField label="POS Code" value={r.id} />
                </div>
                <p className="mt-2 text-[12px] text-slate-500">Status: <b>Active</b> · Send on Order Placement: <b>ON</b></p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sky-50 p-3 dark:bg-sky-500/10">
            <span className="flex-1 text-[13px] font-medium text-sky-900 dark:text-sky-200">Indolj ki team ko English me poora paigham — har branch ka URL aur Token ke saath.</span>
            <Btn size="sm" variant="primary" onClick={copy} icon={<Copy className="h-3.5 w-3.5" />}>Paigham copy</Btn>
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
              <Btn size="sm" icon={<MessageCircle className="h-3.5 w-3.5" />}>WhatsApp</Btn>
            </a>
          </div>
        </Step>

        <Step n={3} done={ordersOk} title="Test order">
          <p>Website par {multi ? 'har branch se' : ''} ek order karein — yahan ghanti bajegi{multi ? ' aur order par usi branch ka naam hoga' : ''}. Na aaye to <b>Activity</b> tab dekhein.</p>
        </Step>
      </ol>
    </Card>
  );
}

/* ─── KAI BRANCHES ─── */

/** Har branch ka orders URL + (advanced) platform ke code → branch */
export function BranchSetup({ data }: { data: WebsiteOverview }) {
  const shops = useActiveShops();
  const i = data.integration!;
  if (shops.length <= 1) return null;
  const defaultShop = i.config?.shopId ?? (i as any).shopId ?? null;
  return (
    <Card title="Kai branches" description="Har branch ka apna orders URL — jo order jis URL par aaye, bill aur stock usi branch ka. Key / Token sab branches ki ek hi."
      actions={<DocsLink anchor="branches" />}>
      <div className="space-y-2">
        {shops.map((s) => (
          <CopyField key={s.id} label={`${s.name}${s.id === defaultShop ? ' (main)' : ''}`} value={`${data.urls.base}/orders/branch/${s.id}`} />
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-slate-500">
        Branch ke baghair wala URL bhi chalta hai — us par aaya order Settings ki "Stock kis branch se" wali branch me jata hai.
        Ghalat branch me aaya order: order kholein → <b>Branch</b> badlein.
      </p>
      {(i.branchCodes?.length ?? 0) > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">Advanced — website ke code se branch</summary>
          <BranchCodeMap channelId={i.id} codes={i.branchCodes ?? []} defaultShopId={defaultShop} shops={shops} />
        </details>
      )}
    </Card>
  );
}

/**
 * Platform order ke saath koi code bheje (POS code, branch code, Token ki shakal) to us ke saamne
 * Nafaa branch — phir har order khud sahi branch me. URL se branch pakki ho to iski zaroorat nahi.
 */
function BranchCodeMap({ channelId, codes, defaultShopId, shops }: {
  channelId: string;
  codes: NonNullable<NonNullable<WebsiteOverview['integration']>['branchCodes']>;
  defaultShopId: string | null;
  shops: Shop[];
}) {
  const qc = useQueryClient();
  const fallback = defaultShopId && shops.some((s) => s.id === defaultShopId) ? defaultShopId : shops[0]?.id ?? '';
  const [map, setMap] = useState<Record<string, string | null>>(() => Object.fromEntries(codes.map((c) => [c.code, c.shopId])));
  const codesKey = JSON.stringify(codes.map((c) => [c.code, c.shopId]));
  useEffect(() => { setMap(Object.fromEntries(codes.map((c) => [c.code, c.shopId]))); }, [codesKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: () => onlineOrdersApi.saveBranchMap(channelId, map),
    onSuccess: () => { toast.success('Mehfooz — ab har order sahi branch me jayega'); qc.invalidateQueries({ queryKey: ['sales-channel', channelId] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const dirty = codes.some((c) => (map[c.code] ?? null) !== c.shopId);
  const onlyMerchant = codes.every((c) => c.kind === 'merchant' && !c.shopId);
  return (
    <div className="mt-2 space-y-2">
      <p className="text-[12.5px] text-slate-500">
        {onlyMerchant
          ? 'Website sab branches ka ek hi code bhejti hai — is se branch pata nahi chalti. Upar wale branch URL istemal karein.'
          : 'Jo code jis branch ka hai, us ke saamne wahi branch chunein.'}
      </p>
      {codes.map((c) => (
        <div key={c.code} className="flex flex-wrap items-center gap-2 text-[13px]">
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] dark:bg-slate-800">{c.label ?? c.code}</code>
          {c.sample && <span className="text-[12px] text-slate-500">aakhri order {c.sample}</span>}
          <span className="flex-1" />
          <select value={map[c.code] ?? fallback}
            onChange={(e) => setMap((m) => ({ ...m, [c.code]: e.target.value === fallback ? null : e.target.value }))}
            className={cn(inputCls, 'w-64')}>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}{s.id === fallback ? ' (main)' : ''}</option>)}
          </select>
        </div>
      ))}
      {dirty && <div className="flex justify-end"><Btn size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate()}>Mehfooz karein</Btn></div>}
    </div>
  );
}

/* ─── MASLE KA HAL ─── */

type Kind = 'indolj' | 'woocommerce' | 'shopify' | 'custom' | 'daraz';

export function Troubleshoot({ kind, onOpenActivity }: { kind: Kind; onOpenActivity: () => void }) {
  const items: Array<{ q: string; a: ReactNode; only?: Kind[] }> = [
    {
      q: 'Website par order hua, Nafaa me nahi aaya',
      a: <>Pehle <button onClick={onOpenActivity} className="font-semibold text-emerald-700 hover:underline">Activity</button> dekhein. <b>401</b> = key / Token ghalat — Setup se dobara copy karein. Activity me kuch nahi = request aayi hi nahi: URL dobara copy karein aur dekhein channel band to nahi.</>,
    },
    {
      q: 'Order ghalat branch me aaya',
      a: <>Har branch ka URL alag lagayein (upar "Kai branches"). Abhi wala order: order kholein → <b>Branch</b> → sahi branch.</>,
    },
    {
      q: 'Accept par "product nahi mila"',
      a: <>Products tab me us item ko Nafaa product se jorein — ya Accept par khulne wale safhe par ek dafa chun lein, aage se khud.</>,
    },
    {
      q: 'Website par stock update nahi hota',
      a: <>Product jura hua hai? Settings → "Stock kis branch se" sahi hai? Connection card par <b>Check</b> dabayein.</>,
      only: ['woocommerce', 'shopify', 'custom'],
    },
    {
      q: 'Website par cancel hua, Nafaa me nahi',
      a: kind === 'indolj'
        ? <>Indolj me <b>Cancel Call Back URL</b> bhi wahi URL ho jo Call Back URL hai.</>
        : <>Apni website: <code>POST …/orders/&#123;orderId&#125;/status</code> se <code>{'{"status":"cancelled"}'}</code> bhejein. WooCommerce / Shopify me khud hota hai.</>,
      only: ['indolj', 'custom'],
    },
    {
      q: 'Rider delivery charges le jata hai, phir bhi sale me aa rahe hain',
      a: <>Settings → <b>Delivery charges kis ke paas → Rider ke</b>.</>,
    },
    {
      q: 'Key galat haath lag gayi',
      a: <>Neeche Keys → <b>Nayi key</b>. Purani foran band. {kind === 'indolj' ? 'Phir Indolj ke Token me nayi key daalni hogi.' : kind === 'custom' ? 'Phir website me nayi key daalni hogi.' : ''}</>,
    },
  ];
  return (
    <Card title="Masle aur hal" description="Jo aksar hota hai — aur us ka hal" actions={<DocsLink anchor="masle">Sab masle</DocsLink>}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.filter((x) => !x.only || x.only.includes(kind)).map((x) => (
          <li key={x.q}>
            <details className="group py-2.5">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-[13.5px] font-medium text-slate-900 dark:text-white">
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-90" /> {x.q}
              </summary>
              <div className="mt-1.5 pl-6 text-[13px] text-slate-600 dark:text-slate-300">{x.a}</div>
            </details>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ─── SETUP KI CHECKLIST (overview ke liye) ─── */

export function HelpCard() {
  return (
    <Card title="Madad">
      <ul className="space-y-2 text-[13px]">
        <li><a href={docsUrl()} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-700 hover:text-emerald-700 dark:text-slate-200"><BookOpen className="h-4 w-4" /> Online store ki poori guide <ExternalLink className="h-3 w-3" /></a></li>
        <li><a href={docsUrl('masle')} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-700 hover:text-emerald-700 dark:text-slate-200"><Circle className="h-4 w-4" /> Masle aur hal <ExternalLink className="h-3 w-3" /></a></li>
        <li><a href={docsUrl('api')} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-700 hover:text-emerald-700 dark:text-slate-200"><Circle className="h-4 w-4" /> Developer API <ExternalLink className="h-3 w-3" /></a></li>
      </ul>
    </Card>
  );
}
