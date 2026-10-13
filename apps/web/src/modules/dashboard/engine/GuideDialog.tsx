/** Plain-language tour of what each part of the dashboard tells the owner. */

import { Button, Kbd, Modal } from '@/design-system/components';
import { IconBubble } from './parts';
import type { GuideItem } from './types';

export function GuideDialog({ open, onClose, items }: { open: boolean; onClose: () => void; items: GuideItem[] }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Ye safha kya batata hai"
      description="Upar se neeche, isi sort se parhein"
      footer={<Button onClick={onClose}>Samajh gaya</Button>}
    >
      <ul className="space-y-3">
        {items.map((g) => (
          <li key={g.title} className="flex gap-3">
            <IconBubble icon={g.icon} tone="brand" />
            <div className="min-w-0">
              <p className="text-[0.875rem] font-semibold text-slate-900">{g.title}</p>
              <p className="mt-0.5 text-[0.8125rem] text-slate-600">{g.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-[0.75rem] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><Kbd>G</Kbd> Ye safha</span>
        <span className="inline-flex items-center gap-1.5"><Kbd>R</Kbd> Taaza karein</span>
        <span className="inline-flex items-center gap-1.5"><Kbd>Esc</Kbd> Band</span>
      </div>
    </Modal>
  );
}
