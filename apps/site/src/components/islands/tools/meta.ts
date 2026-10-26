/** Card and OG labels per calculator. Plain data, so hubs can import it without pulling in the islands. */
import type { ToolKey } from '@/lib/cms/contract/cms-contract';

export const TOOL_META: Record<ToolKey, { icon: string; label: string }> = {
  'gst-calculator': { icon: 'percent', label: 'GST calculator' },
  'profit-margin-calculator': { icon: 'trending-up', label: 'Profit margin calculator' },
  'pos-cost-calculator': { icon: 'calculator', label: 'POS cost calculator' },
  'invoice-generator': { icon: 'receipt-text', label: 'Invoice generator' },
  'gold-rate-calculator': { icon: 'gem', label: 'Gold price calculator' },
  'fbr-tier-1-checker': { icon: 'landmark', label: 'FBR Tier-1 checker' },
  'break-even-calculator': { icon: 'target', label: 'Break-even calculator' },
  'discount-calculator': { icon: 'badge-percent', label: 'Discount calculator' },
  'reorder-level-calculator': { icon: 'package-check', label: 'Reorder level calculator' },
  'khata-ageing-calculator': { icon: 'calendar-clock', label: 'Khata ageing calculator' },
  'food-cost-calculator': { icon: 'chef-hat', label: 'Food cost calculator' },
  'barcode-generator': { icon: 'barcode', label: 'Barcode generator' },
  'zakat-calculator': { icon: 'hand-coins', label: 'Zakat calculator' },
  'receipt-maker': { icon: 'receipt', label: 'Receipt maker' },
};

const TOOL_LABEL_UR: Record<ToolKey, string> = {
  'gst-calculator': 'GST کیلکولیٹر',
  'profit-margin-calculator': 'پرافٹ مارجن کیلکولیٹر',
  'pos-cost-calculator': 'POS کاسٹ کیلکولیٹر',
  'invoice-generator': 'انوائس بنائیں',
  'gold-rate-calculator': 'سونے کی قیمت کیلکولیٹر',
  'fbr-tier-1-checker': 'FBR Tier-1 چیکر',
  'break-even-calculator': 'بریک ایون کیلکولیٹر',
  'discount-calculator': 'ڈسکاؤنٹ کیلکولیٹر',
  'reorder-level-calculator': 'ری آرڈر لیول کیلکولیٹر',
  'khata-ageing-calculator': 'پرانا ادھار کیلکولیٹر',
  'food-cost-calculator': 'فوڈ کاسٹ کیلکولیٹر',
  'barcode-generator': 'بارکوڈ بنائیں',
  'zakat-calculator': 'زکوٰۃ کیلکولیٹر',
  'receipt-maker': 'رسید بنائیں',
};

/** Card and OG label in the page's language: Urdu for 'ur', otherwise the English TOOL_META label. */
export function toolLabel(key: ToolKey, locale?: string): string {
  return locale === 'ur' ? TOOL_LABEL_UR[key] : TOOL_META[key].label;
}
