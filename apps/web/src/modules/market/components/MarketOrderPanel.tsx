/**
 * Extra details of a Nafaa Market order inside the Online Orders drawer:
 * how the customer gets it, the chosen delivery time, prescription photos and
 * per-item choices (add-ons, cake message, substitutes). Renders nothing for
 * orders from other channels.
 */
import { CalendarCheck, CalendarClock, FileImage, ShoppingBag, Store, Truck, UtensilsCrossed } from 'lucide-react';
import { Badge, Card } from '@/design-system/components';
import { t } from '@core/i18n';

interface Attachment { kind?: string; url?: string; note?: string | null }
interface ItemExtra {
  name: string; variant?: string | null; quantity: number; notes?: string | null;
  modifiers?: { summary?: Array<{ group: string; options: string[] }> } | null;
  options?: Record<string, unknown> | null;
}
interface MarketMeta {
  platform?: string;
  fulfilment?: 'DELIVERY' | 'PICKUP' | 'DINE_IN' | 'BOOKING';
  deliverySlot?: { start: string; end: string | null };
  attachments?: Attachment[];
  itemExtras?: ItemExtra[];
}

const PK_TIME: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit' };
const PK_DAY: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Karachi', weekday: 'short', day: 'numeric', month: 'short' };

function slotText(slot: { start: string; end: string | null }) {
  const a = new Date(slot.start);
  if (Number.isNaN(a.getTime())) return null;
  const day = a.toLocaleDateString('en-PK', PK_DAY);
  const from = a.toLocaleTimeString('en-PK', PK_TIME);
  const b = slot.end ? new Date(slot.end) : null;
  return b && !Number.isNaN(b.getTime()) ? `${day}, ${from} – ${b.toLocaleTimeString('en-PK', PK_TIME)}` : `${day}, ${from}`;
}

/** Known option keys from the category flows, shown with a plain label. */
const OPTION_LABEL: Record<string, string> = {
  substitute: t('Na ho to badal dein'),
  cakeMessage: t('Cake par message'),
  weight: t('Wazan'),
  flavour: t('Flavour'),
  date: t('Tareekh'),
  giftMessage: t('Gift message'),
  size: t('Size'),
  colour: t('Rang'),
};

function optionValue(v: unknown) {
  if (v === true) return t('Haan');
  if (v === false) return t('Nahi');
  if (v === null || v === undefined || v === '') return null;
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

export function MarketOrderPanel({ metadata }: { metadata: unknown }) {
  const m = (metadata ?? {}) as MarketMeta;
  if (m.platform !== 'nafaa_market') return null;

  const slot = m.deliverySlot ? slotText(m.deliverySlot) : null;
  const photos = (m.attachments ?? []).filter((a) => typeof a.url === 'string' && /^https?:\/\//.test(a.url));
  const extras = m.itemExtras ?? [];
  const fulfilment = m.fulfilment ?? 'DELIVERY';
  const FulfilIcon = fulfilment === 'BOOKING' ? CalendarCheck : fulfilment === 'PICKUP' ? Store : fulfilment === 'DINE_IN' ? UtensilsCrossed : Truck;
  const fulfilLabel = fulfilment === 'BOOKING' ? t('Booking: customer is waqt aayega') : fulfilment === 'PICKUP' ? t('Customer khud le jayega') : fulfilment === 'DINE_IN' ? t('Dukaan par baith kar khayega') : t('Delivery');

  return (
    <Card title={t('Nafaa Market order')} description={t('Customer ne Market se order kiya hai')}>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand"><ShoppingBag className="me-1 h-3.5 w-3.5" />{t('Market')}</Badge>
          <span className="inline-flex items-center gap-1.5 text-slate-700"><FulfilIcon className="h-4 w-4" />{fulfilLabel}</span>
          {slot && <span className="inline-flex items-center gap-1.5 text-slate-700"><CalendarClock className="h-4 w-4" />{slot}</span>}
        </div>

        {photos.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 font-medium text-slate-800"><FileImage className="h-4 w-4" />{t('Nuskha (prescription)')}</p>
            <p className="mb-2 text-[0.8rem] text-amber-700">{t('Accept karne se pehle nuskha dekh lein')}</p>
            <div className="flex flex-wrap gap-2">
              {photos.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 hover:ring-2 hover:ring-brand-500/40">
                  <img src={a.url} alt={t('Nuskha {{n}}', { n: i + 1 })} className="h-24 w-24 object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        )}

        {extras.length > 0 && (
          <div>
            <p className="mb-1.5 font-medium text-slate-800">{t('Items ki details')}</p>
            <ul className="space-y-2">
              {extras.map((it, i) => {
                const opts = Object.entries(it.options ?? {}).map(([k, v]) => [OPTION_LABEL[k] ?? k, optionValue(v)] as const).filter(([, v]) => v);
                return (
                  <li key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="font-medium text-slate-800">{it.quantity} × {it.name}{it.variant ? ` (${it.variant})` : ''}</p>
                    {(it.modifiers?.summary ?? []).map((g) => (
                      <p key={g.group} className="text-slate-600">{g.group}: {g.options.join(', ')}</p>
                    ))}
                    {opts.map(([k, v]) => <p key={k} className="text-slate-600">{k}: {v}</p>)}
                    {it.notes && <p className="text-slate-600">{t('Note')}: {it.notes}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
