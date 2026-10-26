/** Every counter shortcut on one screen ("?" or F1 then "Shortcuts"). */

import { Kbd, Modal } from '@/design-system/components';

export const POS_SHORTCUTS: Array<{ title: string; keys: Array<[string, string]> }> = [
  {
    title: 'Search aur bill',
    keys: [
      ['Type', 'Naam, SKU, barcode ya Urdu naam'],
      ['↑ ↓', 'Results me upar neeche'],
      ['Enter', 'Chuni hui cheez bill me'],
      ['3* Enter', 'Aakhri / chuni line ki qty 3'],
      ['3*naam', 'Naam wali cheez 3 dafa'],
      ['+  −', 'Aakhri / chuni line ki qty'],
      ['Esc', 'Search saaf / dialog band'],
      ['Alt 1–9', 'Aksar bikne wali cheez'],
    ],
  },
  {
    title: 'Bill ki lines',
    keys: [
      ['F3', 'Bill ki lines par jayein'],
      ['↑ ↓', 'Line chunein'],
      ['+  −', 'Qty kam / zyada'],
      ['Enter', 'Qty likhein (Tab: rate)'],
      ['R', 'Rate badlein'],
      ['T', 'Is line ki price tier'],
      ['N', 'Line ka note'],
      ['Delete', 'Line hatayein'],
      ['Esc', 'Wapas search'],
    ],
  },
  {
    title: 'Counter',
    keys: [
      ['F2', 'Customer dhoondein / naya'],
      ['F4', 'Discount'],
      ['F6', 'Hold / resume'],
      ['F7', 'Products / Combos'],
      ['F8', 'Payment ka tareeqa (1–5)'],
      ['F9', 'Aur kaam'],
      ['F10', 'Quick keys'],
      ['F12', 'Cash aur print'],
      ['Ctrl Enter', 'Checkout'],
      ['Ctrl P', 'Pichhla bill dobara print'],
      ['Alt R', 'Pichhla bill dobara bechein'],
      ['Alt L', 'Lene wala'],
      ['Alt D', 'Delivery'],
      ['Alt T', 'Retail / Wholesale / Credit price'],
      ['F1', 'Guide'],
    ],
  },
  {
    title: 'Checkout',
    keys: [
      ['Type', 'Kitne paise mile'],
      ['Enter', 'Bill complete'],
      ['Tab', 'Agla khana'],
      ['F1 F3 F4 F5 F7', 'Cash, JazzCash, Easypaisa, Card, Bank'],
      ['F6', 'Poora udhaar'],
      ['Alt S', 'Split payment'],
      ['Alt A', 'Split me aur tareeqa'],
    ],
  },
];

export function PosShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="xl" title="Keyboard shortcuts" description="Mouse ke bagair poori sale — ? dabayein to ye list khulti hai">
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
