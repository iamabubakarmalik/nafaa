/**
 * Industry-aware stock presets — used across:
 *   • StockReportPage
 *   • LowStockPage
 *   • StockMovementsPage
 *   • StockTransferPage
 *
 * Each industry can define:
 *   - Restock urgency rules
 *   - Supplier reminder templates (WhatsApp-ready)
 *   - Extra columns for stock tables
 *   - Industry-specific priority thresholds
 */

export interface RestockRule {
  label: string;
  emoji: string;
  color: string;
  description: string;
  threshold: (stock: number, alert: number) => boolean;
}

export interface SupplierReminder {
  id: string;
  label: string;
  emoji: string;
  template: (ctx: {
    supplierName?: string;
    productName: string;
    currentStock: string;
    unit: string;
    quantityNeeded: string;
    shopName?: string;
  }) => string;
}

export interface StockExtraColumn {
  key: string;
  header: string;
  render: (row: any) => string;
}

export interface IndustryStockPreset {
  industryId: string;
  industryName: string;
  industryEmoji: string;
  restockRules: RestockRule[];
  supplierReminders: SupplierReminder[];
  extraColumns: StockExtraColumn[];
}

const RETAIL: IndustryStockPreset = {
  industryId: 'retail',
  industryName: 'Retail Store',
  industryEmoji: '🛒',
  restockRules: [
    {
      label: 'CRITICAL',
      emoji: '🚨',
      color: '#dc2626',
      description: 'Stock = 0 — abhi order karo',
      threshold: (s) => s <= 0,
    },
    {
      label: 'URGENT',
      emoji: '⚠️',
      color: '#ea580c',
      description: '1-2 din ka stock bacha',
      threshold: (s, a) => s > 0 && s <= a * 0.3,
    },
    {
      label: 'LOW',
      emoji: '📉',
      color: '#f59e0b',
      description: '3-7 din ka stock',
      threshold: (s, a) => s > a * 0.3 && s <= a,
    },
    {
      label: 'HEALTHY',
      emoji: '✅',
      color: '#10b981',
      description: 'Stock theek hai',
      threshold: (s, a) => s > a,
    },
  ],
  supplierReminders: [
    {
      id: 'polite',
      label: 'Polite Request',
      emoji: '🙏',
      template: ({ supplierName, productName, currentStock, unit, quantityNeeded, shopName }) =>
        `Assalam-o-Alaikum ${supplierName || 'sir'},\n\nHumari dukan${shopName ? ` (${shopName})` : ''} me *${productName}* ka stock kam ho raha hai.\n\nCurrent: ${currentStock} ${unit}\nChahiye: ${quantityNeeded}\n\nJab moqa mile bhijwa dijiye.\n\nShukriya! 🙏`,
    },
    {
      id: 'urgent',
      label: 'Urgent',
      emoji: '🚨',
      template: ({ supplierName, productName, quantityNeeded, shopName }) =>
        `Salam ${supplierName || 'bhai'}!\n\n*URGENT:* ${productName} khatam ho gaya hai.${shopName ? ` (${shopName})` : ''}\n\n${quantityNeeded} chahiye — kya aaj mil sakta hai?\n\nJawab ka intezar hai 🚀`,
    },
    {
      id: 'bulk',
      label: 'Bulk Order',
      emoji: '📦',
      template: ({ supplierName, productName, quantityNeeded, shopName }) =>
        `Assalam-o-Alaikum ${supplierName || 'sir'},\n\n${shopName ? `${shopName} ke liye ` : ''}bulk order chahiye:\n\n📦 ${productName}\n📊 Quantity: ${quantityNeeded}\n\nBest rate aur delivery timing bataiye.\n\nShukriya!`,
    },
  ],
  extraColumns: [],
};

const CARPET: IndustryStockPreset = {
  industryId: 'carpet',
  industryName: 'Carpet Shop',
  industryEmoji: '🪟',
  restockRules: [
    {
      label: 'DESIGN OUT',
      emoji: '🚨',
      color: '#dc2626',
      description: 'Design khatam — nayi roll chahiye',
      threshold: (s) => s <= 0,
    },
    {
      label: 'CUT PIECES ONLY',
      emoji: '⚠️',
      color: '#ea580c',
      description: 'Sirf cut pieces baqi — full roll order karo',
      threshold: (s, a) => s > 0 && s <= a * 0.4,
    },
    {
      label: 'RUNNING LOW',
      emoji: '📉',
      color: '#f59e0b',
      description: '1-2 roll bacha',
      threshold: (s, a) => s > a * 0.4 && s <= a,
    },
    {
      label: 'STOCKED',
      emoji: '✅',
      color: '#10b981',
      description: 'Kaafi stock hai',
      threshold: (s, a) => s > a,
    },
  ],
  supplierReminders: [
    {
      id: 'design',
      label: 'Design Restock',
      emoji: '🪟',
      template: ({ supplierName, productName, currentStock, unit, quantityNeeded }) =>
        `Salam ${supplierName || 'sir'},\n\n*${productName}* design ka stock kam ho gaya.\n\nBaqi: ${currentStock} ${unit}\nChahiye: ${quantityNeeded}\n\nAgli lot me shamil kar dijiye.\n\nShukriya!`,
    },
    {
      id: 'urgent-roll',
      label: 'Urgent Full Roll',
      emoji: '🚨',
      template: ({ supplierName, productName, quantityNeeded }) =>
        `Assalam-o-Alaikum ${supplierName || 'bhai'},\n\nURGENT: *${productName}* ki full roll chahiye.\n\nCustomer wait kar raha hai — ${quantityNeeded}.\n\nAaj deliver ho sakti hai kya?`,
    },
  ],
  extraColumns: [],
};

const MOBILE: IndustryStockPreset = {
  industryId: 'mobile',
  industryName: 'Mobile Shop',
  industryEmoji: '📱',
  restockRules: [
    {
      label: 'OUT OF MODEL',
      emoji: '🚨',
      color: '#dc2626',
      description: 'Model khatam — customer loss risk',
      threshold: (s) => s <= 0,
    },
    {
      label: 'LAST FEW',
      emoji: '⚠️',
      color: '#ea580c',
      description: '2-3 pieces baqi — restock karo',
      threshold: (s, a) => s > 0 && s <= a * 0.3,
    },
    {
      label: 'LOW STOCK',
      emoji: '📉',
      color: '#f59e0b',
      description: 'Hafta bhar ka stock',
      threshold: (s, a) => s > a * 0.3 && s <= a,
    },
    {
      label: 'GOOD',
      emoji: '✅',
      color: '#10b981',
      description: 'Kaafi mobile stock me',
      threshold: (s, a) => s > a,
    },
  ],
  supplierReminders: [
    {
      id: 'new-model',
      label: 'New Model Order',
      emoji: '📱',
      template: ({ supplierName, productName, quantityNeeded, shopName }) =>
        `Salam ${supplierName || 'sir'},\n\n${shopName ? `${shopName} ke liye ` : ''}naya order:\n\n📱 ${productName}\n📊 ${quantityNeeded}\n\nPTA approved hone chahiye, aur best rate bataiye.\n\nShukriya!`,
    },
    {
      id: 'popular',
      label: 'Fast Moving Restock',
      emoji: '🔥',
      template: ({ supplierName, productName, currentStock, quantityNeeded }) =>
        `Salam ${supplierName || 'bhai'},\n\n${productName} bahut fast bik raha hai! Sirf ${currentStock} baqi.\n\n${quantityNeeded} aur bhijwa dein — jaldi.`,
    },
  ],
  extraColumns: [],
};

const PRESETS: Record<string, IndustryStockPreset> = {
  retail: RETAIL,
  carpet: CARPET,
  mobile: MOBILE,
};

export function getStockPreset(industryId?: string | null): IndustryStockPreset {
  if (!industryId) return RETAIL;
  return PRESETS[industryId.toLowerCase()] || RETAIL;
}
