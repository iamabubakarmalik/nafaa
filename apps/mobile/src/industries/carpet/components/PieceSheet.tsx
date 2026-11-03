/** Add a piece by hand (opening remnant, rug offcut) or edit a piece's size, price, condition and place (web PieceFormModal). Sold pieces cannot be edited. */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { Button, Card, ChipGroup, Input, MoneyInput, Select, Sheet, Text, toast, useTheme } from '@/design';
import { carpetCutPiecesApi, type CarpetCutPiece, type CarpetCutPieceStatus } from '../api';
import { isRollUnit, opt, r2, realFt, refreshCarpet } from '../meta';
import { SizeInput } from './SizeInput';
import { useCarpetProducts } from './useCarpetProducts';

interface Draft {
  productId: string; pieceCode: string; wFt: number | null; wIn: number | null; lFt: number | null; lIn: number | null;
  cost: number | null; price: number | null; condition: string; rack: string; notes: string; status: CarpetCutPieceStatus;
}
const blank = (): Draft => ({ productId: '', pieceCode: '', wFt: null, wIn: null, lFt: null, lIn: null, cost: null, price: null, condition: 'Good', rack: '', notes: '', status: 'AVAILABLE' });
const fromPiece = (p: CarpetCutPiece): Draft => ({
  productId: p.productId, pieceCode: p.pieceCode, wFt: p.widthFt, wIn: p.widthInch || null, lFt: p.lengthFt, lIn: p.lengthInch || null, cost: p.costAmount, price: p.salePrice,
  condition: p.condition ?? 'Good', rack: p.rackNumber ?? '', notes: p.notes ?? '', status: p.status,
});

export function PieceSheet({ piece, open, onClose }: { piece: CarpetCutPiece | 'new' | null; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const shopId = useAuthStore((s) => s.currentShopId) ?? undefined;
  const edit = !!piece && piece !== 'new';
  const [d, setD] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const products = useCarpetProducts(open && !edit);
  useEffect(() => { if (open) { setD(piece && piece !== 'new' ? fromPiece(piece) : blank()); setTried(false); } }, [open, piece]);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const sqft = r2(realFt(d.wFt ?? 0, d.wIn ?? 0) * realFt(d.lFt ?? 0, d.lIn ?? 0));

  const errors: Record<string, string> = {};
  if (!edit && !d.productId) errors.product = t('Carpet chunein');
  if (!(sqft > 0)) errors.size = t('Chaurai aur lambai likhein');
  if ((d.wIn ?? 0) >= 12 || (d.lIn ?? 0) >= 12) errors.size = t('Inch 12 se kam likhein');
  if (!((d.price ?? 0) > 0) && d.status !== 'DAMAGED') errors.price = t('Poore tukre ki qeemat likhein');
  const err = (k: string) => (tried ? errors[k] : undefined);

  const save = async () => {
    setTried(true);
    if (Object.keys(errors).length || busy) return;
    setBusy(true);
    const body = {
      pieceCode: opt(d.pieceCode), widthFt: d.wFt ?? 0, widthInch: d.wIn ?? 0, lengthFt: d.lFt ?? 0, lengthInch: d.lIn ?? 0,
      costAmount: d.cost ?? 0, salePrice: d.price ?? 0, condition: opt(d.condition), rackNumber: opt(d.rack), notes: opt(d.notes), status: d.status,
    };
    try {
      if (edit) await carpetCutPiecesApi.update((piece as CarpetCutPiece).id, body);
      else await carpetCutPiecesApi.create({ ...body, productId: d.productId, shopId, sourceType: 'MANUAL' });
      toast.success(edit ? t('Tukra save ho gaya') : t('Tukra ban gaya'));
      refreshCarpet();
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title={edit ? t('Tukra {{pieceCode}}', { pieceCode: (piece as CarpetCutPiece).pieceCode }) : t('Naya tukra')}
      description={t('Bacha hua ya alag para carpet ka tukra, poori qeemat par bikta hai')}
      footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {!edit && <Select label={t('Carpet')} value={d.productId} searchable onChange={(v) => set({ productId: v })} error={err('product')} placeholder={t('Carpet chunein')}
          options={products.items.filter((p) => isRollUnit(p.unit) || ['ft', 'm'].includes(p.unit.toLowerCase())).map((p) => ({ value: p.id, label: p.name }))} />}
        <Input label={t('Piece code')} value={d.pieceCode} onChangeText={(v) => set({ pieceCode: v })} ltr hint={t('Khaali chhorein to khud banega')} />
        <SizeInput label={t('Chaurai')} ft={d.wFt} inch={d.wIn} onChange={(wFt, wIn) => set({ wFt, wIn })} error={err('size')} />
        <SizeInput label={t('Lambai')} ft={d.lFt} inch={d.lIn} onChange={(lFt, lIn) => set({ lFt, lIn })} />
        <MoneyInput label={t('Poore tukre ki qeemat')} value={d.price} onChangeValue={(v) => set({ price: v })} error={err('price')} hint={sqft > 0 && (d.price ?? 0) > 0 ? t('{{r2}} / sqft', { r2: r2((d.price ?? 0) / sqft) }) : undefined} />
        <MoneyInput label={t('Poore tukre ki cost')} value={d.cost} onChangeValue={(v) => set({ cost: v })} hint={t('Profit report isi se banti hai')} />
        <Input label={t('Halat')} value={d.condition} onChangeText={(v) => set({ condition: v })} placeholder={t('Good, kinara ghisa hua')} />
        <Input label={t('Rack / jagah')} value={d.rack} onChangeText={(v) => set({ rack: v })} />
        {edit && <Select label={t('Status')} value={d.status} onChange={(v) => set({ status: v as CarpetCutPieceStatus })}
          options={[{ value: 'AVAILABLE', label: t('Bikne ko tayyar') }, { value: 'RESERVED', label: t('Reserved (customer ke liye)') }, { value: 'DAMAGED', label: t('Damage') }]} />}
        <Input label={t('Note')} value={d.notes} onChangeText={(v) => set({ notes: v })} />
        <Card tone="default"><Text size="sm">{t('Area:')} <Text size="sm" weight="bold" ltr>{t('{{sqft}} sqft', { sqft })}</Text></Text></Card>
      </View>
    </Sheet>
  );
}
