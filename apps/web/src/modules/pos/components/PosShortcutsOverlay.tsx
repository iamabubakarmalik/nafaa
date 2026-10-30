/** Every counter shortcut on one screen ("?" or F1 then "Shortcuts"). */

import { Kbd, Modal } from '@/design-system/components';
import { t } from '@core/i18n';

export const POS_SHORTCUTS: Array<{ title: string; keys: Array<[string, string]> }> = [
  {
    title: t('Search aur bill'),
    keys: [
      [t('Type'), t('Naam, SKU, barcode ya Urdu naam')],
      ['↑ ↓', t('Results me upar neeche')],
      [t('Enter'), t('Chuni hui cheez bill me')],
      ['3* Enter', t('Aakhri / chuni line ki qty 3')],
      ['3*naam', t('Naam wali cheez 3 dafa')],
      ['+  −', t('Aakhri / chuni line ki qty')],
      [t('Esc'), t('Search saaf / dialog band')],
      [t('Alt 1–9'), t('Aksar bikne wali cheez')],
    ],
  },
  {
    title: t('Bill ki lines'),
    keys: [
      ['F3', t('Bill ki lines par jayein')],
      ['↑ ↓', t('Line chunein')],
      ['+  −', t('Qty kam / zyada')],
      [t('Enter'), t('Qty likhein (Tab: rate)')],
      ['R', t('Rate badlein')],
      ['T', t('Is line ki price tier')],
      ['N', t('Line ka note')],
      [t('Delete'), t('Line hatayein')],
      [t('Esc'), t('Wapas search')],
    ],
  },
  {
    title: t('Counter'),
    keys: [
      ['F2', t('Customer dhoondein / naya')],
      ['F4', t('Discount')],
      ['F6', t('Hold / resume')],
      ['F7', t('Products / Combos')],
      ['F8', t('Payment ka tareeqa (1–5)')],
      ['F9', t('Aur kaam')],
      ['F10', t('Quick keys')],
      ['F12', t('Cash aur print')],
      [t('Ctrl Enter'), t('Checkout')],
      [t('Ctrl P'), t('Pichhla bill dobara print')],
      [t('Alt R'), t('Pichhla bill dobara bechein')],
      [t('Alt L'), t('Lene wala')],
      [t('Alt D'), t('Delivery')],
      [t('Alt T'), t('Retail / Wholesale / Credit price')],
      ['F1', t('Guide')],
    ],
  },
  {
    title: t('Checkout'),
    keys: [
      [t('Type'), t('Kitne paise mile')],
      [t('Enter'), t('Bill complete')],
      [t('Tab'), t('Agla khana')],
      ['F1 F3 F4 F5 F7', t('Cash, JazzCash, Easypaisa, Card, Bank')],
      ['F6', t('Poora udhaar')],
      [t('Alt S'), t('Split payment')],
      [t('Alt A'), t('Split me aur tareeqa')],
    ],
  },
];

export function PosShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="xl" title={t('Keyboard shortcuts')} description={t('Mouse ke bagair poori sale — ? dabayein to ye list khulti hai')}>
      <div className="grid gap-5 sm:grid-cols-2">
        {POS_SHORTCUTS.map((g) => (
          <section key={g.title}>
            <h3 className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{g.title}</h3>
            <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
              {g.keys.map(([k, label]) => (
                <li key={k + label} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[0.8125rem] text-slate-700">
                  <span>{label}</span>
                  <span className="flex shrink-0 gap-1">{k.split('  ').map((p) => <Kbd key={p}>{p}</Kbd>)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
