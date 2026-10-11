/** POS guide: the fastest ways to bill, keyboard shortcuts and voice commands. */

import { Kbd, Modal } from '@/design-system/components';

const SECTIONS: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: 'Sab se tez bill',
    items: [
      ['Scan → F12', 'Barcode scan karein aur F12 dabayein — cash sale ho kar bill print. Bas.'],
      ['Naam likhein', 'Search mein naam ya barcode likhein, Enter se pehla result bill mein.'],
      ['Rate badlein', 'Bill ki line par rate par click karein — mol-tol wahin.'],
      ['Hold', 'Customer ruk gaya? Bill hold karein, agla customer lein, baad me resume.'],
    ],
  },
  {
    title: 'Paisa',
    items: [
      ['F9', 'Card, JazzCash, Easypaisa, bank, kuch paisa ya pura udhaar.'],
      ['Wapsi', 'Customer ne zyada diya to likhein — kitna wapas dena hai khud nikalta hai, ya khate mein advance jama.'],
      ['Udhaar', 'Udhaar ke liye customer chunna zaroori. Maal koi aur le ja raha ho to uska naam bill par.'],
    ],
  },
  {
    title: 'Awaaz se (F6)',
    items: [
      ['"2 kilo cheeni"', 'Cheez bill mein'],
      ['"sau ka doodh"', 'Raqam se wazan khud'],
      ['"5 percent discount"', 'Discount lag jata hai'],
      ['"nagad" / "udhaar"', 'Checkout khul jata hai'],
    ],
  },
];

const KEYS: Array<[string, string]> = [
  ['/', 'Search'], ['F2', 'Camera scan'], ['F6', 'Awaaz'], ['F9', 'Checkout'], ['F12', 'Cash + print'],
  ['F7', 'Products'], ['F8', 'Combos'], ['F10', 'Quick keys'], ['Esc', 'Band'],
];

export function PosTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="lg" title="POS kaise chalayein" description="2 second mein bill — ye tareeqe yaad kar lein">
      <div className="space-y-5">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{s.title}</h3>
            <ul className="space-y-2">
              {s.items.map(([k, v]) => (
                <li key={k} className="flex gap-3 text-[0.8125rem]">
                  <span className="w-36 shrink-0 font-semibold text-slate-900">{k}</span>
                  <span className="text-slate-600">{v}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Keyboard</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {KEYS.map(([k, v]) => (
              <span key={k} className="flex items-center gap-2 text-[0.8125rem] text-slate-600"><Kbd>{k}</Kbd>{v}</span>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
