/** Create or edit a price list: name, code, the rule for items it does not name, default and active. */

import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Input, Row, Segmented, Sheet, Switch, Text, TextArea, useTheme } from '@/design';
import type { ListBase, PriceList, SavePriceList } from '../api/distribution.api';
import { BASE_LABEL, ruleText } from '../lib/setup';

export function PriceListFormSheet({ list, saving, onClose, onSave }: {
  list: PriceList | null; saving: boolean; onClose: () => void; onSave: (body: SavePriceList) => void;
}) {
  const th = useTheme();
  const [name, setName] = useState(list?.name ?? '');
  const [code, setCode] = useState(list?.code ?? '');
  const [basedOn, setBasedOn] = useState<ListBase>(list?.basedOn ?? 'WHOLESALE');
  const [pct, setPct] = useState(list ? String(list.adjustPct ?? 0) : '0');
  const [isDefault, setDefault] = useState(list?.isDefault ?? false);
  const [isActive, setActive] = useState(list?.isActive ?? true);
  const [note, setNote] = useState(list?.note ?? '');
  const p = Number(pct);
  const pctBad = !Number.isFinite(p) || p < -90 || p > 500;
  const nameBad = !name.trim();

  const submit = () => {
    if (nameBad || pctBad) return;
    onSave({ name: name.trim(), code: code.trim() || undefined, basedOn, adjustPct: p, isDefault, isActive, note: note.trim() || undefined });
  };

  return (
    <Sheet open onClose={onClose} height={0.92} title={list ? t('{{name}} — badlein', { name: list.name }) : t('Nayi price list')}
      description={t('List me jo rate likhenge wohi chalega; baqi items par neeche wala rule.')}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button style={{ flex: 1.4 }} loading={saving} disabled={nameBad || pctBad} onPress={submit}>{list ? t('Save karein') : t('List banayein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(4) }}>
        <Row gap={3} align="start">
          <Input containerStyle={{ flex: 2 }} label={t('Naam')} value={name} onChangeText={setName} maxLength={80} placeholder={t('Retailers')} />
          <Input containerStyle={{ flex: 1 }} label={t('Code')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} maxLength={20} placeholder={t('RET')} ltr autoCapitalize="characters" />
        </Row>
        <View style={{ gap: th.space(3), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
          <Text size="sm" weight="semibold">{t('Jo item list me nahi, us ka rate')}</Text>
          <Segmented value={basedOn} onChange={setBasedOn} size="sm" options={(['PRICE', 'WHOLESALE', 'COST'] as ListBase[]).map((b) => ({ value: b, label: t(BASE_LABEL[b]) }))} />
          <Input label="± %" value={pct} onChangeText={setPct} keyboardType="numbers-and-punctuation" ltr error={pctBad ? t('-90 se 500') : undefined} />
          <Text size="xs" tone="muted">{t('Rule: {{rule}} — misal: −3 likhein to 3% kam, 5 likhein to 5% zyada.', { rule: ruleText({ basedOn, adjustPct: p }) })}</Text>
        </View>
        <Switch value={isDefault} onChange={setDefault} label={t('Default list')} description={t('Jis customer ki apni list nahi, us par yehi list lagegi (booker app me).')} />
        <Switch value={isActive} onChange={setActive} label={t('Chalu')} description={t('Band list kisi bill par nahi lagti.')} />
        <TextArea label={t('Note')} value={note} onChangeText={setNote} maxLength={300} placeholder={t('Andar ke liye')} />
      </View>
    </Sheet>
  );
}
