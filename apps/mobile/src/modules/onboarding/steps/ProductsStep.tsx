/** Step 3: first products (samples, a few typed in, or a file later) and categories. */

import { FileSpreadsheet, PenLine, Plus, Sparkles, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Card, ChipGroup, IconButton, Input, MoneyInput, Text, useTheme } from '@/design';
import { ChoiceCard, StepSection } from '../components/ChoiceCard';

export type ProductsMode = 'sample' | 'manual' | 'import';
export interface QuickProduct { name: string; price: number | null; stock: string }
export interface ProductsForm { mode: ProductsMode | null; products: QuickProduct[]; categories: string[] }
export interface ProductsErrors { rows?: Record<number, string>; form?: string }

const MAX_ROWS = 15;
const emptyProduct = (): QuickProduct => ({ name: '', price: null, stock: '' });

export const filledProducts = (f: ProductsForm) => f.products.filter((p) => p.name.trim() || p.price != null);

export function validateProducts(f: ProductsForm): ProductsErrors {
  if (f.mode !== 'manual') return {};
  const rows: Record<number, string> = {};
  f.products.forEach((p, i) => {
    if (!p.name.trim() && p.price == null) return;
    if (!p.name.trim()) rows[i] = t('Naam likhein');
    else if (!(Number(p.price) > 0)) rows[i] = t('Bechne ki qeemat likhein');
    else if (p.stock && !(Number(p.stock) >= 0)) rows[i] = t('Stock sahi likhein');
  });
  if (Object.keys(rows).length) return { rows };
  if (filledProducts(f).length === 0) return { form: t('Kam se kam ek product likhein, ya koi aur tareeqa chunein.') };
  return {};
}

export function ProductsStep({ value, onChange, errors, suggestedCategories, addedCount, savedCategories }: {
  value: ProductsForm; onChange: (p: Partial<ProductsForm>) => void; errors: ProductsErrors; suggestedCategories: string[]; addedCount: number; savedCategories: string[];
}) {
  const th = useTheme();
  const all = Array.from(new Set([...suggestedCategories, ...savedCategories]));
  const setRow = (i: number, patch: Partial<QuickProduct>) => onChange({ products: value.products.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });

  return (
    <View style={{ gap: th.space(6) }}>
      {addedCount > 0 && (
        <Card tone="success" title={<Text weight="bold" tone="success">{t('{{addedCount}} products pehle hi add ho chuke', { addedCount })}</Text>}>
          <Text size="sm" tone="success">{t('Aage barhne ke liye kuch aur chunne ki zaroorat nahi. Mazeed chahiye to neeche chunein.')}</Text>
        </Card>
      )}
      <StepSection title={t('Products kaise daalein?')} hint={t('Jo aasaan lage. Baad me Products page se kabhi bhi badal sakte hain.')}>
        <View style={{ gap: th.space(2) }}>
          <ChoiceCard selected={value.mode === 'sample'} onSelect={() => onChange({ mode: 'sample' })} icon={Sparkles} title={t('Misaal wale products')} description={t('Aap ke kaam ke hisaab se kuch products — app samajhne ke liye. Baad me mita sakte hain.')} />
          <ChoiceCard selected={value.mode === 'manual'} onSelect={() => onChange({ mode: 'manual', products: value.products.length ? value.products : [emptyProduct(), emptyProduct()] })} icon={PenLine} title={t('Khud likhein')} description={t('Apne 5–10 sab se zyada bikne wale products abhi likh dein.')} />
          <ChoiceCard selected={value.mode === 'import'} onSelect={() => onChange({ mode: 'import' })} icon={FileSpreadsheet} title={t('Excel / CSV file se')} description={t('Setup khatam hote hi import ka page khulega.')} />
        </View>
        {errors.form && <Text size="xs" weight="medium" tone="danger">{errors.form}</Text>}
      </StepSection>

      {value.mode === 'manual' && (
        <StepSection title={t('Products likhein')} hint={t('Sirf naam aur qeemat zaroori hai. Stock khaali chhor dein to 0 hoga.')}>
          {value.products.map((p, i) => (
            <View key={i} style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('xl'), borderWidth: 1, borderColor: errors.rows?.[i] ? th.colors.danger.border : th.colors.border, backgroundColor: th.colors.surface }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: th.space(2) }}>
                <View style={{ flex: 1 }}>
                  <Input placeholder={t('Misaal: Surf 1kg')} value={p.name} onChangeText={(name) => setRow(i, { name })} accessibilityLabel={t('Product {{value}} ka naam', { value: i + 1 })} size="md" />
                </View>
                <IconButton icon={Trash2} label={t('Hatayein')} variant="secondary" disabled={value.products.length === 1} onPress={() => onChange({ products: value.products.filter((_, idx) => idx !== i) })} />
              </View>
              <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                <View style={{ flex: 3 }}><MoneyInput value={p.price} onChangeValue={(price) => setRow(i, { price })} placeholder={t('Qeemat')} size="md" accessibilityLabel={t('Product {{value}} ki qeemat', { value: i + 1 })} /></View>
                <View style={{ flex: 2 }}><Input value={p.stock} onChangeText={(stock) => setRow(i, { stock: stock.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" placeholder={t('Stock')} size="md" accessibilityLabel={t('Product {{value}} ka stock', { value: i + 1 })} /></View>
              </View>
              {errors.rows?.[i] && <Text size="xs" weight="medium" tone="danger">{errors.rows[i]}</Text>}
            </View>
          ))}
          {value.products.length < MAX_ROWS && (
            <Button variant="secondary" icon={Plus} onPress={() => onChange({ products: [...value.products, emptyProduct()] })} style={{ alignSelf: 'flex-start' }}>{t('Ek aur product')}</Button>
          )}
        </StepSection>
      )}

      {all.length > 0 && (
        <StepSection title={t('Categories')} hint={t('Products ko groups me rakhne ke liye. Jo chahiye un par tap karein.')}>
          <ChipGroup
            multiple
            wrap
            value={[...savedCategories, ...value.categories]}
            onChange={(next) => onChange({ categories: next.filter((c) => !savedCategories.includes(c)) })}
            options={all.map((c) => ({ value: c, label: c, disabled: savedCategories.includes(c) }))}
          />
        </StepSection>
      )}
    </View>
  );
}
