/**
 * Which vehicles a part fits (web FitmentEditor): company, model and years, any
 * number of rows, or "fits every vehicle" for universal items (bulbs, oils,
 * fuses). The list is what the counter searches, so "corolla 2016 brake" finds
 * the part.
 */

import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { badYears, yearRange } from '@nafaa/core/industries/autoparts';
import { t } from '@/core/i18n';
import { Button, Card, Chip, FormSection, Row, Select, Switch, Text, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { vehicleMakesApi, vehicleModelsApi, type PartFitment } from '../api';
import { MAKES_KEY, MODELS_KEY } from '../meta';

export function yearText(f: Pick<PartFitment, 'yearFrom' | 'yearTo'>): string {
  const y = yearRange(f);
  return y.kind === 'both' ? `${y.from}–${y.to}` : y.kind === 'from' ? t('{{yearFrom}} se', { yearFrom: y.from }) : y.kind === 'to' ? t('{{yearTo}} tak', { yearTo: y.to }) : t('Har saal');
}

export function FitmentEditor({ universal, fitments, onChange, error }: { universal: boolean; fitments: PartFitment[]; onChange: (v: { universal?: boolean; fitments?: PartFitment[] }) => void; error?: string }) {
  const th = useTheme();
  const [makeId, setMakeId] = useState('');
  const [modelId, setModelId] = useState('');
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const makes = useQuery({ queryKey: [MAKES_KEY, 'active'], queryFn: () => vehicleMakesApi.list({ active: true }), staleTime: 5 * 60_000 });
  const models = useQuery({ queryKey: [MODELS_KEY, makeId], queryFn: () => vehicleModelsApi.list({ makeId, active: true }), enabled: !!makeId, staleTime: 5 * 60_000 });
  const make = makes.data?.find((m) => m.id === makeId);
  const model = models.data?.find((m) => m.id === modelId);
  const yearsBad = badYears(from, to);

  const add = () => {
    if (!make || yearsBad) return;
    const row: PartFitment = { makeId: make.id, makeName: make.name, modelId: model?.id, modelName: model?.name, yearFrom: from, yearTo: to };
    if (fitments.some((f) => f.makeId === row.makeId && f.modelId === row.modelId && f.yearFrom === row.yearFrom && f.yearTo === row.yearTo)) return;
    onChange({ fitments: [...fitments, row] });
    setModelId(''); setFrom(null); setTo(null);
  };

  return (
    <FormSection title={t('Kis gaari me lagta hai')} description={t('Counter par gaari ke naam se part milta hai — jaise “corolla brake”')}>
      <Switch value={universal} onChange={(v) => onChange({ universal: v, ...(v && { fitments: [] }) })} label={t('Har gaari me lagta hai')} description={t('Bulb, fuse, oil, tape jaisa saman')} />
      {!universal && (
        <View style={{ gap: th.space(3) }}>
          <Select label={t('Company')} value={makeId} searchable onChange={(v) => { setMakeId(v); setModelId(''); }} placeholder={makes.isLoading ? t('Load ho raha…') : t('Company')} options={(makes.data ?? []).map((m) => ({ value: m.id, label: m.name }))} />
          <Select label={t('Model')} value={modelId} searchable disabled={!makeId} onChange={setModelId} placeholder={t('Sab model')} options={[{ value: '', label: t('Sab model') }, ...(models.data ?? []).map((m) => ({ value: m.id, label: m.name }))]} />
          <Row gap={2}>
            <View style={{ flex: 1 }}><NumberInput label={t('Saal se')} integer value={from} onChangeValue={setFrom} /></View>
            <View style={{ flex: 1 }}><NumberInput label={t('Saal tak')} integer value={to} onChangeValue={setTo} error={yearsBad ? t('“Saal se” “saal tak” se bara hai') : undefined} /></View>
          </Row>
          <Button icon={Plus} variant="secondary" disabled={!make || yearsBad} onPress={add}>{t('Jorein')}</Button>
          {!makes.isLoading && !makes.data?.length ? <Card tone="warning"><Text size="sm">{t('Abhi koi company nahi. “Gaariyan → Company / Model” me Pakistani companies aur model ek click me daal lein.')}</Text></Card> : null}
          {fitments.length === 0 ? <Text size="sm" tone="muted" align="center">{t('Koi gaari nahi likhi — bagair is ke bhi save ho jata hai')}</Text> : (
            <Row gap={2} wrap>
              {fitments.map((f, i) => (
                <Chip key={`${f.makeId}-${f.modelId}-${i}`} selected label={`${[f.makeName, f.modelName ?? t('sab model')].join(' ')} · ${yearText(f)}`} icon={Trash2} onPress={() => onChange({ fitments: fitments.filter((_, j) => j !== i) })} />
              ))}
            </Row>
          )}
        </View>
      )}
      {error ? <Text size="sm" tone="danger">{error}</Text> : null}
    </FormSection>
  );
}
