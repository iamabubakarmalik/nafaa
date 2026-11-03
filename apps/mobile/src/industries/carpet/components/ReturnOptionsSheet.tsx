/**
 * Carpet line in a return (web CarpetReturnOptionsDialog): what comes back. A
 * roll cut comes back as a piece of the returned size (good or damaged); a
 * sold piece goes back on sale by itself once the whole line is returned.
 * The returns screen opens this for a line whose note is a carpet note and
 * sends the answer with the return item.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, ChipGroup, Input, Segmented, Sheet, Text, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { formatMoney } from '@/core/format';
import { noteDims, r2, readCarpetNote } from '../meta';

export interface CarpetReturnOptions {
  createCutPiece: boolean; isDamaged: boolean; cutPieceCondition: string; cutPieceWidthFt: number; cutPieceLengthFt: number; cutPieceNotes: string;
}
export interface CarpetNoteInfo { rollNumber?: string; pieceCode?: string; widthFt?: number; lengthFt?: number; isRollCut: boolean; isCutPiece: boolean }

/** Reads a carpet bill line note (roll numbers with spaces, widths with inches). */
export function parseCarpetNoteClient(note?: string | null): CarpetNoteInfo {
  const info = readCarpetNote(note);
  if (!info) return { isRollCut: false, isCutPiece: false };
  const d = noteDims(note);
  const widthFt = d ? r2(d.w) : undefined;
  const lengthFt = d ? r2(d.l) : undefined;
  return info.kind === 'roll' ? { isRollCut: true, isCutPiece: false, rollNumber: info.ref, widthFt, lengthFt } : { isRollCut: false, isCutPiece: true, pieceCode: info.ref, widthFt, lengthFt };
}

const CONDITIONS = ['Good', 'Thora istemal', 'Kinara ghisa'];

export function CarpetReturnOptionsSheet({ open, carpetInfo, productName, variantName, returnedSqft, pricePerSqft, initialOptions, onConfirm, onClose }: {
  open: boolean; carpetInfo: CarpetNoteInfo; productName: string; variantName?: string; returnedSqft: number; pricePerSqft: number;
  initialOptions?: Partial<CarpetReturnOptions>; onConfirm: (o: CarpetReturnOptions) => void; onClose: () => void;
}) {
  const th = useTheme();
  const [state, setState] = useState<'good' | 'damaged'>(initialOptions?.isDamaged ? 'damaged' : 'good');
  const [condition, setCondition] = useState(initialOptions?.cutPieceCondition ?? 'Good');
  const [width, setWidth] = useState<number | null>(initialOptions?.cutPieceWidthFt ?? carpetInfo.widthFt ?? null);
  const [length, setLength] = useState<number | null>(initialOptions?.cutPieceLengthFt ?? (carpetInfo.widthFt && returnedSqft ? r2(returnedSqft / carpetInfo.widthFt) : carpetInfo.lengthFt ?? null));
  const [notes, setNotes] = useState(initialOptions?.cutPieceNotes ?? '');
  useEffect(() => { if (open) setState(initialOptions?.isDamaged ? 'damaged' : 'good'); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const w = width ?? 0;
  const l = length ?? 0;
  const error = carpetInfo.isRollCut && !(w > 0 && l > 0) ? t('Wapas aaye tukre ki chaurai aur lambai likhein') : null;
  const confirm = () => {
    if (error) return;
    // A sold piece is put back on sale after the return; only roll cuts make a new piece.
    onConfirm({ createCutPiece: carpetInfo.isRollCut, isDamaged: state === 'damaged', cutPieceCondition: state === 'damaged' ? 'Damaged' : condition, cutPieceWidthFt: w, cutPieceLengthFt: l, cutPieceNotes: notes.trim() });
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Carpet wapsi — {{productName}}{{value}}', { productName, value: variantName ? ` (${variantName})` : '' })}
      description={carpetInfo.isRollCut ? t('Roll {{rollNumber}} se kata hissa — wapas aa kar tukra banega', { rollNumber: carpetInfo.rollNumber }) : t('Tukra {{pieceCode}} — poori line wapas ho to dobara bikne ko tayyar ho jata hai', { pieceCode: carpetInfo.pieceCode })}
      footer={<Button fullWidth size="lg" disabled={!!error} onPress={confirm}>{t('Theek hai')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm">{t('Wapsi: {{sqft}} · refund rate {{rate}}', { sqft: String(r2(returnedSqft)), rate: formatMoney(pricePerSqft) })}</Text>
        <Segmented value={state} onChange={setState} options={[{ value: 'good', label: t('Theek halat') }, { value: 'damaged', label: t('Kharab / damage') }]} />
        {carpetInfo.isRollCut ? (
          <>
            <NumberInput label={t('Chaurai (ft)')} value={width} onChangeValue={setWidth} />
            <NumberInput label={t('Lambai (ft)')} value={length} onChangeValue={setLength} error={error ?? undefined} />
            {state === 'good' && <ChipGroup wrap value={condition} onChange={setCondition} options={CONDITIONS.map((c) => ({ value: c, label: c }))} />}
            <Text size="sm" tone="secondary">{state === 'good' ? t('Naya tukra {{r2}} sqft ka banega, roll rate ke 80% par.', { r2: r2(w * l) }) : t('Tukra damage me jayega — stock me nahi ginega.')}</Text>
          </>
        ) : (
          <Text size="sm" tone="secondary">{state === 'good' ? t('Tukra dobara bikne ko tayyar ho jayega.') : t('Wapsi ke baad Tukre page par is tukre ko "Hatayein" karein taake ye na bike.')}</Text>
        )}
        <Input label={t('Note')} value={notes} onChangeText={setNotes} placeholder={t('Wapsi ki wajah')} />
      </View>
    </Sheet>
  );
}
