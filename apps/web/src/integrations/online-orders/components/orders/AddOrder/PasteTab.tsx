/**
 * Paste tab: the merchant pastes a WhatsApp / Instagram message, the server
 * reads name, phone, address, city and items out of it, and the result
 * fills the order form for a final check.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardPaste, Wand2 } from 'lucide-react';
import { Button, Card, Textarea } from '@/design-system/components';
import { apiErrorMessage } from '../../../api/online-orders.api';
import { orderBoardApi, type ParsedOrder } from '../../../api/order-board.api';
import { lineKey, type ItemLine } from '../ItemsEditor';
import type { ManualDraft } from './ManualOrderForm';
import { t } from '@core/i18n';

const SAMPLE = 'Ali Raza\n0300 1234567\nHouse 12, Street 4, Gulberg\nLahore\n2 x Black shirt (M)\n1 jeans\nCOD Rs 3500';

/** Merges a parsed message into the current draft (only fields the text had). */
export function draftFromParsed(d: ManualDraft, p: ParsedOrder): ManualDraft {
  const items: ItemLine[] = p.items.map((it) => it.match
    ? { key: lineKey(), productId: it.match.productId, variantId: it.match.variantId, name: it.match.name, quantity: it.quantity || 1, price: it.price ?? it.match.price }
    : { key: lineKey(), productId: null, name: it.text, quantity: it.quantity || 1, price: it.price ?? 0 });
  return {
    ...d,
    customer: {
      name: p.customerName ?? d.customer.name,
      phone: p.phone ?? d.customer.phone,
      address: p.address ?? d.customer.address,
      city: p.city ?? d.customer.city,
    },
    items: items.length ? items : d.items,
    notes: p.codAmount ? [d.notes, t('Message me COD: Rs {{amount}}', { amount: p.codAmount })].filter(Boolean).join('\n') : d.notes,
  };
}

export function PasteTab({ onParsed }: { onParsed: (p: ParsedOrder) => void }) {
  const [text, setText] = useState('');
  const parse = useMutation({
    mutationFn: () => orderBoardApi.parse(text),
    onSuccess: (p) => {
      const matched = p.items.filter((i) => i.match).length;
      toast.success(t('Message parh liya — {{matched}}/{{count}} cheezein mil gayin', { matched, count: p.items.length }));
      onParsed(p);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Message nahi parha gaya'))),
  });
  const pasteClipboard = async () => {
    try { setText(await navigator.clipboard.readText()); } catch { toast.error(t('Clipboard nahi khula — khud paste karein (Ctrl+V)')); }
  };

  return (
    <Card title={t('Message paste karein')} description={t('Customer ka WhatsApp ya Instagram message yahan daalein. Naam, phone, address, shehar aur cheezein khud bhar jayengi — phir check kar ke save karein.')}>
      <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={SAMPLE} className="font-mono text-[0.8125rem]" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button leftIcon={<Wand2 className="h-4 w-4" />} disabled={!text.trim()} loading={parse.isPending} onClick={() => parse.mutate()}>{t('Form bharein')}</Button>
        <Button variant="secondary" leftIcon={<ClipboardPaste className="h-4 w-4" />} onClick={() => void pasteClipboard()}>{t('Clipboard se paste')}</Button>
      </div>
    </Card>
  );
}
