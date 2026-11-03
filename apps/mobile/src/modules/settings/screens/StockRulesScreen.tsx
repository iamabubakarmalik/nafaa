/** Settings → Stock rules: low-stock line, minus stock, manufacturing switch (web InventorySection). */

import { router } from 'expo-router';
import { ArrowRightLeft, ClipboardCheck, TrendingDown } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { ListRow, SettingSwitch, SettingsGroup, SettingsTemplate } from '@/design';
import { useAutoSave, useSettings, useSettingsOnline } from '../hooks/useSettings';
import { NumberField, Note, OfflineNote, SaveStatus, Section, ownerOnly } from '../components/SettingsParts';

function StockRules() {
  const q = useSettings();
  const online = useSettingsOnline();
  const { draft: d, set, saving, dirty, failed } = useAutoSave(q.data?.settings);
  const low = Number(d?.defaultLowStockAlert) || 0;

  return (
    <SettingsTemplate title={t('Stock rules')} description={t('Kam stock, minus stock aur Banayein (Manufacturing)')} loading={!d && q.isLoading} error={!d && q.error} onRetry={q.refetch}
      actions={<SaveStatus saving={saving} dirty={dirty} failed={failed} />}>
      {!online && <OfflineNote />}
      {d && (
        <>
          <Section title={t('Kam stock')} description={t('Kab product \'kam\' dikhe aur alert aaye')}>
            <NumberField label={t('Kam stock ki had')} hint={t('Naye products isi had se shuru hote hain; har product me alag had bhi rakh sakte hain. 0 = alert band.')}
              value={d.defaultLowStockAlert} onChange={(v) => set('defaultLowStockAlert', v)} min={0} suffix="units" disabled={!online} />
            <Note tone="muted">{low > 0 ? t('Jab kisi naye product ka stock {{low}} ya kam ho, woh \'Low stock\' list me aata hai.', { low }) : t('Naye products par kam stock ka alert nahi aayega.')}</Note>
          </Section>
          <SettingsGroup title={t('Minus stock')} footnote={t('Jab system me stock khatam ho magar shelf par maal ho')}>
            <SettingSwitch label={t('Stock khatam hone par bhi bechein')} description={t('Stock minus me chala jayega; baad me Purchase ya stock adjust se theek karein')}
              value={!!d.allowNegativeStock} onChange={(v) => set('allowNegativeStock', v, { now: true })} disabled={!online} />
          </SettingsGroup>
          {d.allowNegativeStock && <Note tone="warning">{t('Har branch ka stock minus ho sakta hai. Minus stock wale products ko jaldi Purchase ya stock adjust se theek karein.')}</Note>}
          <SettingsGroup title={t('Banayein (Manufacturing)')} footnote={t('2–3 raw items mila kar apna maal banayein — Cost khud nikalti hai')}>
            <SettingSwitch label={t('Recipe aur Production chalu karein')} description={t('Mix daal, dry fruit pack, cake, attar — Recipe banayein, maal banayein, raw maal khud stock se kam ho')}
              value={!!d.manufacturingEnabled} onChange={(v) => set('manufacturingEnabled', v, { now: true })} disabled={!online} />
          </SettingsGroup>
          <SettingsGroup title={t('Stock ke kaam')}>
            <ListRow icon={TrendingDown} title={t('Low stock')} subtitle={t('Kam aur khatam maal ki list')} chevron onPress={() => router.push('/low-stock' as never)} />
            <ListRow icon={ClipboardCheck} title={t('Stock adjust')} subtitle={t('Ginti ke baad stock theek karein')} chevron onPress={() => router.push('/stock-adjustments' as never)} />
            <ListRow icon={ArrowRightLeft} title={t('Transfers')} subtitle={t('Branch se branch maal')} chevron onPress={() => router.push('/transfers' as never)} />
          </SettingsGroup>
        </>
      )}
    </SettingsTemplate>
  );
}

export const StockRulesScreen = ownerOnly(StockRules, 'Stock rules');
