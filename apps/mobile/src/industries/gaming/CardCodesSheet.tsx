/**
 * After a bill with cards is saved: each card's code and PIN to hand to the
 * customer (copy, print, share), and a retry when the codes could not be fetched.
 */

import * as Clipboard from 'expo-clipboard';
import { Copy, CreditCard, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Card, Row, Sheet, Text, toast } from '@/design';
import { DocActions, L, type PackDoc } from '../_shared/docKit';
import { errorText } from '../_shared/deskKit';
import { gamingApi, type GivenCard } from './api';
import { providerOf, refreshGaming } from './meta';
import { counterStore, useCounterState } from './counterStore';

const cardDoc = (saleNumber: string, cards: GivenCard[], lang: Parameters<typeof L>[0]): PackDoc => ({
  fileName: `cards-${saleNumber}`, title: L(lang, 'Digital card', 'ڈیجیٹل کارڈ', 'Digital card'), subtitle: `${L(lang, 'Bill', 'بل', 'Bill')} ${saleNumber}`,
  tables: [{ columns: [L(lang, 'Card', 'کارڈ', 'Card'), 'Code', 'PIN', 'Serial'], rows: cards.map((c) => [`${providerOf(c.provider)} ${c.topupType} ${c.denominationValue}`, c.cardCode ?? '—', c.cardPin ?? '', c.cardSerial ?? '']) }],
  notes: [L(lang, 'A card code works only once. Keep this safe.', 'کارڈ کوڈ صرف ایک بار چلتا ہے۔ اسے سنبھال کر رکھیں۔', 'Card ka code ek dafa istemal hota hai. Sambhaal kar rakhein.')],
});

export function CardCodesSheet() {
  const { given, pendingSale } = useCounterState();
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    if (!pendingSale || busy) return;
    setBusy(true);
    try { counterStore.set({ given: await gamingApi.topups.assignSale(pendingSale.id), pendingSale: null }); refreshGaming(); }
    catch (e) { toast.error(errorText(e, t('Codes nahi mile — Top-ups page par bill number se dekhein'))); } finally { setBusy(false); }
  };
  const copy = async (code: string) => { await Clipboard.setStringAsync(code); toast.success(t('Copy ho gaya')); };
  return (
    <>
      <Sheet open={!!pendingSale && !given} onClose={() => counterStore.set({ pendingSale: null })} title={t('Card codes nahi mile')} description={pendingSale ? t('Bill {{saleNumber}}', { saleNumber: pendingSale.saleNumber }) : undefined}
        footer={<Button fullWidth size="lg" icon={RefreshCw} loading={busy} onPress={() => void retry()}>{t('Dobara')}</Button>}>
        <Row gap={2}><CreditCard size={18} /><Text size="sm" style={{ flex: 1 }}>{t('Bill {{saleNumber}} ke card codes nahi mile', { saleNumber: pendingSale?.saleNumber ?? '' })}</Text></Row>
      </Sheet>
      <Sheet open={!!given} onClose={() => counterStore.set({ given: null })} title={t('Card codes customer ko dein')} description={given ? t('Bill {{saleNumber}}', { saleNumber: given.saleNumber }) : undefined}
        footer={given ? <View style={{ gap: 8, alignItems: 'center' }}><DocActions build={(lang) => cardDoc(given.saleNumber, given.cards, lang)} /><Button fullWidth onPress={() => counterStore.set({ given: null })}>{t('Theek hai')}</Button></View> : undefined}>
        {given && (
          <View style={{ gap: 10 }}>
            {given.missing > 0 && <Text size="sm" tone="danger">{t('{{missing}} card stock me nahi the — Top-ups page par card daalein ya bill par return karein.', { missing: given.missing })}</Text>}
            {given.cards.map((c) => (
              <Card key={c.id} title={`${providerOf(c.provider)} · ${c.topupType} ${c.denominationValue}`}>
                <Row gap={2}>
                  <Text weight="bold" size="lg" ltr style={{ flex: 1 }} selectable>{c.cardCode ?? '—'}</Text>
                  {c.cardCode && <Button size="sm" variant="secondary" icon={Copy} onPress={() => void copy(c.cardCode!)}>{t('Copy')}</Button>}
                </Row>
                {(c.cardPin || c.cardSerial) && <Text size="sm" tone="muted" ltr selectable>{[c.cardPin ? `PIN ${c.cardPin}` : '', c.cardSerial ? `Serial ${c.cardSerial}` : ''].filter(Boolean).join(' · ')}</Text>}
              </Card>
            ))}
            <Text size="xs" tone="muted">{t('Code dobara chahiye ho to Top-ups → Bike hue me card kholein.')}</Text>
          </View>
        )}
      </Sheet>
    </>
  );
}
