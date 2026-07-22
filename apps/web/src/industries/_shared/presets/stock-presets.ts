/**
 * Industry-specific Stock Management presets.
 *
 * Covers:
 *   • Damage reasons (per industry — carpet cutting waste, mobile screen crack, meat spoilage)
 *   • Loss reasons (theft, expiry, breakage — different per industry)
 *   • Adjustment reasons (counting errors, opening balance, promotional giveaway)
 *   • Restock urgency thresholds (industry-specific reorder points)
 *   • Transfer purposes (warehouse-to-shop, event supply, seasonal move)
 *   • Supplier WhatsApp reminder templates
 */

export interface DamageReasonPreset {
  reason: string;
  emoji: string;
  category: 'DAMAGE' | 'LOSS' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  color: string;
  severity?: 'minor' | 'major' | 'critical';
}

export interface TransferPurposePreset {
  name: string;
  emoji: string;
  color: string;
  description: string;
}

export interface RestockUrgencyRule {
  label: string;
  emoji: string;
  color: string;
  daysToStockOut: number;  // If stock lasts less than X days, mark urgent
  description: string;
}

export interface SupplierReminderTemplate {
  id: string;
  label: string;
  emoji: string;
  template: (params: {
    supplierName?: string;
    productName: string;
    currentStock: string;
    unit: string;
    quantityNeeded?: string;
    shopName?: string;
  }) => string;
}

export interface IndustryStockPresets {
  damageReasons: DamageReasonPreset[];
  transferPurposes: TransferPurposePreset[];
  restockRules: RestockUrgencyRule[];
  supplierReminders: SupplierReminderTemplate[];
  adjustmentReasons: string[];  // Quick-fill options
}

// ═══════════════════════════════════════════════════════════════
// 🧶 CARPET
// ═══════════════════════════════════════════════════════════════
export const CARPET_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: 'Cutting Waste (unavoidable)', emoji: '✂️', category: 'DAMAGE', color: '#f59e0b', severity: 'minor' },
    { reason: 'Water Damage', emoji: '💧', category: 'DAMAGE', color: '#0ea5e9', severity: 'major' },
    { reason: 'Moth / Pest Damage', emoji: '🪲', category: 'DAMAGE', color: '#a855f7', severity: 'major' },
    { reason: 'Fire / Burn Marks', emoji: '🔥', category: 'DAMAGE', color: '#ef4444', severity: 'critical' },
    { reason: 'Stain (unremovable)', emoji: '🎨', category: 'DAMAGE', color: '#8b5cf6', severity: 'major' },
    { reason: 'Frayed Edges', emoji: '🧵', category: 'DAMAGE', color: '#f97316', severity: 'minor' },
    { reason: 'Colour Bleeding', emoji: '🌈', category: 'DAMAGE', color: '#ec4899', severity: 'major' },
    { reason: 'Roll End Waste', emoji: '📏', category: 'DAMAGE', color: '#78716c', severity: 'minor' },
    { reason: 'Warehouse Theft', emoji: '🚨', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: 'Sample / Display Cutoff', emoji: '📖', category: 'ADJUSTMENT_OUT', color: '#8b5cf6' },
    { reason: 'Counting Correction (found extra)', emoji: '➕', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: 'Opening Stock Entry', emoji: '📦', category: 'ADJUSTMENT_IN', color: '#3b82f6' },
  ],
  transferPurposes: [
    { name: 'Warehouse → Showroom', emoji: '🏭', color: '#3b82f6', description: 'Moving stock from warehouse to display shop' },
    { name: 'Showroom → Warehouse', emoji: '🏬', color: '#8b5cf6', description: 'Excess showroom stock back to storage' },
    { name: 'Wedding Season Prep', emoji: '💒', color: '#ec4899', description: 'Stocking up busy branch for weddings' },
    { name: 'Exhibition Loan', emoji: '🎪', color: '#f59e0b', description: 'Temporary transfer for exhibition/fair' },
    { name: 'Installation Site Delivery', emoji: '🔨', color: '#22c55e', description: 'Direct to customer install location' },
    { name: 'Branch Reallocation', emoji: '🔄', color: '#a855f7', description: 'Balancing stock between branches' },
  ],
  restockRules: [
    { label: 'Critical (< 5 sqft)', emoji: '🚨', color: '#dc2626', daysToStockOut: 3, description: 'Immediate reorder needed' },
    { label: 'Urgent (< 20 sqft)', emoji: '⚠️', color: '#f59e0b', daysToStockOut: 7, description: 'Order this week' },
    { label: 'Low Rolls (< 3 rolls)', emoji: '📉', color: '#f97316', daysToStockOut: 14, description: 'Popular colors running out' },
    { label: 'Seasonal Refill', emoji: '📅', color: '#8b5cf6', daysToStockOut: 30, description: 'Prepare for wedding/festival season' },
  ],
  supplierReminders: [
    {
      id: 'urgent-reorder',
      label: 'Urgent Reorder',
      emoji: '🚨',
      template: ({ supplierName, productName, currentStock, unit, quantityNeeded, shopName }) => [
        `Assalam-o-Alaikum ${supplierName || 'sir'},`,
        '',
        `*URGENT REORDER REQUEST*`,
        '',
        `Product: *${productName}*`,
        `Current stock: ${currentStock} ${unit}`,
        quantityNeeded ? `Required: *${quantityNeeded} ${unit}*` : '',
        '',
        'Kindly arrange delivery ASAP as stock is running critically low.',
        '',
        shopName ? `Regards,\n${shopName}` : 'Shukriya',
      ].filter(Boolean).join('\n'),
    },
    {
      id: 'seasonal-order',
      label: 'Seasonal Order (Wedding)',
      emoji: '💒',
      template: ({ supplierName, productName, quantityNeeded, shopName }) => [
        `Dear ${supplierName || 'supplier'},`,
        '',
        `Wedding season aane wala hai — advance order dena chahte hain.`,
        '',
        `Product: *${productName}*`,
        quantityNeeded ? `Quantity: *${quantityNeeded}*` : 'Quantity: TBD',
        '',
        'Kindly confirm delivery timeline and best rate.',
        '',
        shopName ? `Regards,\n${shopName}` : '',
      ].filter(Boolean).join('\n'),
    },
    {
      id: 'quality-issue',
      label: 'Quality Complaint',
      emoji: '⚠️',
      template: ({ supplierName, productName, shopName }) => [
        `${supplierName || 'Sir'},`,
        '',
        `${productName} mein quality issue mila hai — colour bleeding / damage observed.`,
        'Details ke sath photo bhej raha hoon.',
        '',
        'Please arrange replacement or credit note.',
        '',
        shopName ? `- ${shopName}` : '',
      ].filter(Boolean).join('\n'),
    },
  ],
  adjustmentReasons: [
    'Cutting waste correction',
    'Roll leftover recorded',
    'Opening balance entry',
    'Physical count adjustment',
    'Sample piece taken out',
    'Damaged section removed',
    'Return from customer',
    'Warehouse audit correction',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 📱 MOBILE
// ═══════════════════════════════════════════════════════════════
export const MOBILE_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: 'Screen Crack / Damage', emoji: '📱', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: 'Water Damage', emoji: '💧', category: 'DAMAGE', color: '#0ea5e9', severity: 'critical' },
    { reason: 'Battery Swollen', emoji: '🔋', category: 'DAMAGE', color: '#f59e0b', severity: 'major' },
    { reason: 'Motherboard Fault', emoji: '⚡', category: 'DAMAGE', color: '#dc2626', severity: 'critical' },
    { reason: 'Physical Drop Damage', emoji: '💥', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: 'IMEI Tampered', emoji: '🔒', category: 'DAMAGE', color: '#a855f7', severity: 'critical' },
    { reason: 'PTA Block', emoji: '🚫', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: 'Shop Theft', emoji: '🚨', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: 'Warranty Return (Manufacturer)', emoji: '🔄', category: 'ADJUSTMENT_OUT', color: '#3b82f6' },
    { reason: 'Repair Test Unit', emoji: '🔧', category: 'ADJUSTMENT_OUT', color: '#f59e0b' },
    { reason: 'Trade-in Received', emoji: '📥', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: 'Counting Correction', emoji: '✅', category: 'ADJUSTMENT_IN', color: '#22c55e' },
  ],
  transferPurposes: [
    { name: 'Main Store → Branch', emoji: '🏪', color: '#3b82f6', description: 'Stock replenishment to branch' },
    { name: 'Branch → Repair Center', emoji: '🔧', color: '#f59e0b', description: 'Send for authorized repair' },
    { name: 'Warranty Return to HQ', emoji: '🔄', color: '#8b5cf6', description: 'Defective units for warranty claim' },
    { name: 'Display Model Swap', emoji: '📱', color: '#ec4899', description: 'Rotating display units' },
    { name: 'Emergency Restock', emoji: '🚨', color: '#dc2626', description: 'Urgent product movement' },
  ],
  restockRules: [
    { label: 'No Stock (0 IMEIs)', emoji: '🚨', color: '#dc2626', daysToStockOut: 0, description: 'Immediate action required' },
    { label: 'Critical (< 2 IMEIs)', emoji: '⚠️', color: '#f59e0b', daysToStockOut: 3, description: 'Only 1-2 units left' },
    { label: 'Popular Model Low', emoji: '📉', color: '#f97316', daysToStockOut: 7, description: 'Fast-selling model running low' },
    { label: 'Slow Mover', emoji: '🐢', color: '#8b5cf6', daysToStockOut: 60, description: 'Consider promotional pricing' },
  ],
  supplierReminders: [
    {
      id: 'imei-shortage',
      label: 'IMEI Shortage Alert',
      emoji: '📱',
      template: ({ supplierName, productName, currentStock, quantityNeeded, shopName }) => [
        `Assalam-o-Alaikum ${supplierName || 'sir'},`,
        '',
        `*URGENT — Stock Shortage*`,
        '',
        `Model: *${productName}*`,
        `Available IMEIs: ${currentStock} units`,
        quantityNeeded ? `Need: *${quantityNeeded} units*` : '',
        '',
        'Kindly confirm availability and PTA-approved delivery ASAP.',
        '',
        shopName ? `Regards,\n${shopName}` : '',
      ].filter(Boolean).join('\n'),
    },
    {
      id: 'new-model-inquiry',
      label: 'New Model Inquiry',
      emoji: '🆕',
      template: ({ supplierName, productName, shopName }) => [
        `${supplierName || 'Sir'},`,
        '',
        `${productName} — new arrival available hai kya?`,
        'Rate + PTA status + warranty details bhej dein.',
        '',
        shopName ? `- ${shopName}` : '',
      ].filter(Boolean).join('\n'),
    },
    {
      id: 'accessories-restock',
      label: 'Accessories Restock',
      emoji: '🔌',
      template: ({ supplierName, productName, quantityNeeded }) => [
        `${supplierName || 'Bhai'},`,
        '',
        `Accessories restock chahiye:`,
        `${productName}${quantityNeeded ? ` — ${quantityNeeded} pieces` : ''}`,
        '',
        'Kal tak deliver ho jaye to zabardast.',
      ].join('\n'),
    },
  ],
  adjustmentReasons: [
    'IMEI counting correction',
    'Trade-in phone added',
    'Repair test unit',
    'Damaged in transport',
    'Warranty replacement',
    'PTA block detected',
    'Display model change',
    'Refurbished unit added',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🍽️ RESTAURANT
// ═══════════════════════════════════════════════════════════════
export const RESTAURANT_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: 'Expired / Spoiled', emoji: '🗑️', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: 'Kitchen Waste', emoji: '🍽️', category: 'DAMAGE', color: '#f59e0b', severity: 'minor' },
    { reason: 'Burnt / Overcooked', emoji: '🔥', category: 'DAMAGE', color: '#dc2626', severity: 'major' },
    { reason: 'Freezer Breakdown', emoji: '❄️', category: 'DAMAGE', color: '#0ea5e9', severity: 'critical' },
    { reason: 'Contamination', emoji: '⚠️', category: 'DAMAGE', color: '#f97316', severity: 'critical' },
    { reason: 'Insect / Pest Issue', emoji: '🪲', category: 'DAMAGE', color: '#a855f7', severity: 'major' },
    { reason: 'Staff Meal', emoji: '👨‍🍳', category: 'ADJUSTMENT_OUT', color: '#8b5cf6' },
    { reason: 'Complimentary Serve', emoji: '🎁', category: 'ADJUSTMENT_OUT', color: '#ec4899' },
    { reason: 'Recipe Test / R&D', emoji: '🧪', category: 'ADJUSTMENT_OUT', color: '#3b82f6' },
    { reason: 'Fresh Delivery Received', emoji: '🚚', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: 'Portion Correction', emoji: '⚖️', category: 'ADJUSTMENT_IN', color: '#84cc16' },
  ],
  transferPurposes: [
    { name: 'Main Kitchen → Branch', emoji: '👨‍🍳', color: '#f59e0b', description: 'Central kitchen supplies branch' },
    { name: 'Cold Storage → Prep Area', emoji: '❄️', color: '#0ea5e9', description: 'Daily prep ingredient transfer' },
    { name: 'Event Catering Move', emoji: '🎉', color: '#ec4899', description: 'Stocking event/wedding venue' },
    { name: 'Emergency Ingredient Swap', emoji: '🚨', color: '#dc2626', description: 'Cross-branch emergency supply' },
    { name: 'Ramzan/Iftar Stock', emoji: '🌙', color: '#a855f7', description: 'Seasonal stock reallocation' },
  ],
  restockRules: [
    { label: 'Out Now', emoji: '🚨', color: '#dc2626', daysToStockOut: 0, description: 'Cannot serve — order today' },
    { label: 'Daily Fresh Item Low', emoji: '🥬', color: '#f59e0b', daysToStockOut: 1, description: 'Order tomorrow morning' },
    { label: 'Weekly Item Low', emoji: '📅', color: '#f97316', daysToStockOut: 3, description: 'Order within 3 days' },
    { label: 'Monthly Bulk Low', emoji: '📦', color: '#8b5cf6', daysToStockOut: 14, description: 'Plan bulk order' },
  ],
  supplierReminders: [
    {
      id: 'daily-order',
      label: 'Daily Ingredient Order',
      emoji: '🥕',
      template: ({ supplierName, productName, quantityNeeded, shopName }) => [
        `Assalam-o-Alaikum ${supplierName || 'bhai'},`,
        '',
        `Aaj ki fresh order:`,
        `*${productName}* — ${quantityNeeded || 'usual quantity'}`,
        '',
        'Subah 8 baje tak delivery kar dein please.',
        '',
        shopName ? `- ${shopName}` : '',
      ].filter(Boolean).join('\n'),
    },
    {
      id: 'urgent-meat',
      label: 'Urgent Meat/Dairy Order',
      emoji: '🥩',
      template: ({ supplierName, productName, currentStock, unit }) => [
        `${supplierName || 'Bhai'} URGENT:`,
        '',
        `${productName} khatam hone wala hai (${currentStock} ${unit} left)`,
        'Aaj hi 2 hours mein deliver karo — customers wait kar rahay hain.',
      ].join('\n'),
    },
    {
      id: 'ramzan-bulk',
      label: 'Ramzan Bulk Order',
      emoji: '🌙',
      template: ({ supplierName, productName, quantityNeeded, shopName }) => [
        `Assalam-o-Alaikum ${supplierName || 'sir'},`,
        '',
        `Ramzan ke liye bulk order:`,
        `${productName} — *${quantityNeeded || 'quantity TBD'}*`,
        '',
        'Iftar rush ke pehle stock chahiye. Kindly quote rate.',
        '',
        shopName ? `- ${shopName}` : '',
      ].filter(Boolean).join('\n'),
    },
  ],
  adjustmentReasons: [
    'Expired batch removed',
    'Staff meal deduction',
    'Complimentary serving',
    'Kitchen prep waste',
    'Recipe test batch',
    'Fresh delivery received',
    'Freezer damage loss',
    'Portion size correction',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💎 JEWELRY
// ═══════════════════════════════════════════════════════════════
export const JEWELRY_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: 'Setting Loose / Stone Fall', emoji: '💎', category: 'DAMAGE', color: '#f59e0b', severity: 'major' },
    { reason: 'Melting Loss (in refining)', emoji: '🔥', category: 'ADJUSTMENT_OUT', color: '#dc2626' },
    { reason: 'Polishing Wear', emoji: '✨', category: 'DAMAGE', color: '#a855f7', severity: 'minor' },
    { reason: 'Scratch / Dent', emoji: '⚡', category: 'DAMAGE', color: '#f97316', severity: 'minor' },
    { reason: 'Broken Chain / Clasp', emoji: '⛓️', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: 'Vault Audit Difference', emoji: '🔐', category: 'ADJUSTMENT_OUT', color: '#dc2626' },
    { reason: 'Theft / Robbery', emoji: '🚨', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: 'Karigar Repair', emoji: '👨‍🎨', category: 'ADJUSTMENT_OUT', color: '#8b5cf6' },
    { reason: 'Melting for Rework', emoji: '🔨', category: 'ADJUSTMENT_OUT', color: '#f59e0b' },
    { reason: 'New Design Received', emoji: '🆕', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: 'Customer Exchange (old)', emoji: '🔄', category: 'ADJUSTMENT_IN', color: '#3b82f6' },
  ],
  transferPurposes: [
    { name: 'Safe → Showcase', emoji: '💼', color: '#eab308', description: 'Daily display setup' },
    { name: 'Showcase → Safe', emoji: '🔐', color: '#dc2626', description: 'End-of-day security' },
    { name: 'Send to Karigar', emoji: '👨‍🎨', color: '#8b5cf6', description: 'Craftsman repair/rework' },
    { name: 'Exhibition Loan', emoji: '🎪', color: '#ec4899', description: 'Trade show/exhibition' },
    { name: 'Branch Balance', emoji: '⚖️', color: '#3b82f6', description: 'Inter-branch weight balance' },
  ],
  restockRules: [
    { label: 'Popular Design Out', emoji: '🚨', color: '#dc2626', daysToStockOut: 0, description: 'Bestseller not available' },
    { label: 'Bridal Season Low', emoji: '👰', color: '#ec4899', daysToStockOut: 7, description: 'Wedding season stock' },
    { label: 'Slow Rotation', emoji: '🐢', color: '#8b5cf6', daysToStockOut: 90, description: 'Consider design refresh' },
  ],
  supplierReminders: [
    {
      id: 'karigar-followup',
      label: 'Karigar Follow-up',
      emoji: '👨‍🎨',
      template: ({ supplierName, productName, shopName }) => [
        `${supplierName || 'Master ji'},`,
        '',
        `${productName} ka kaam kab tak ready hoga?`,
        'Customer wait kar raha hai — please expedite.',
        '',
        shopName ? `- ${shopName}` : '',
      ].filter(Boolean).join('\n'),
    },
    {
      id: 'gold-rate-inquiry',
      label: 'Gold Rate Inquiry',
      emoji: '🟡',
      template: ({ supplierName, productName }) => [
        `${supplierName || 'Sir'} SA,`,
        '',
        `Aaj ki 24K/22K rate kya hai?`,
        `${productName} ke liye advance booking karna chahte hain.`,
      ].join('\n'),
    },
  ],
  adjustmentReasons: [
    'Melting refining loss',
    'Karigar repair sent',
    'Design rework melted',
    'Customer exchange in',
    'Vault audit adjustment',
    'Polish wear correction',
    'Weight recalibration',
    'Insurance claim processed',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💊 PHARMACY
// ═══════════════════════════════════════════════════════════════
export const PHARMACY_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: 'Expired Medicine', emoji: '⏰', category: 'LOSS', color: '#ef4444', severity: 'major' },
    { reason: 'Broken Bottle / Blister', emoji: '💊', category: 'DAMAGE', color: '#f59e0b', severity: 'minor' },
    { reason: 'Cold Chain Breakdown', emoji: '❄️', category: 'DAMAGE', color: '#0ea5e9', severity: 'critical' },
    { reason: 'DRAP Recall', emoji: '🚫', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: 'Damaged in Transit', emoji: '📦', category: 'DAMAGE', color: '#8b5cf6', severity: 'major' },
    { reason: 'Sample to Doctor', emoji: '👨‍⚕️', category: 'ADJUSTMENT_OUT', color: '#3b82f6' },
    { reason: 'Charity Donation', emoji: '🤲', category: 'ADJUSTMENT_OUT', color: '#22c55e' },
    { reason: 'Batch Recall Returned', emoji: '↩️', category: 'ADJUSTMENT_OUT', color: '#f97316' },
    { reason: 'Distributor Delivery', emoji: '🚚', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: 'Wholesale Return In', emoji: '📥', category: 'ADJUSTMENT_IN', color: '#84cc16' },
  ],
  transferPurposes: [
    { name: 'Warehouse → Branch', emoji: '🏥', color: '#3b82f6', description: 'Stock replenishment' },
    { name: 'Cold Room Transfer', emoji: '❄️', color: '#0ea5e9', description: 'Temperature-sensitive move' },
    { name: 'Hospital Emergency Supply', emoji: '🚨', color: '#dc2626', description: 'Urgent medicine to hospital' },
    { name: 'Expired Return to Distributor', emoji: '↩️', color: '#f59e0b', description: 'Expiry return' },
  ],
  restockRules: [
    { label: 'Life-Saving OOS', emoji: '🚨', color: '#dc2626', daysToStockOut: 0, description: 'Critical medicine unavailable' },
    { label: 'Chronic Care Low', emoji: '💊', color: '#f59e0b', daysToStockOut: 7, description: 'Regular patients waiting' },
    { label: 'Expiring in 30 Days', emoji: '⏰', color: '#f97316', daysToStockOut: 30, description: 'Discount / return needed' },
    { label: 'Seasonal (Flu/Ramzan)', emoji: '🌡️', color: '#a855f7', daysToStockOut: 14, description: 'Seasonal demand spike' },
  ],
  supplierReminders: [
    {
      id: 'urgent-life-saving',
      label: 'Urgent Life-Saving Med',
      emoji: '🚨',
      template: ({ supplierName, productName, currentStock, shopName }) => [
        `Assalam-o-Alaikum ${supplierName || 'sir'},`,
        '',
        `*EMERGENCY — Life-saving medicine shortage*`,
        '',
        `Product: *${productName}*`,
        `Stock: ${currentStock} left`,
        '',
        'Patients wait kar rahe hain — aaj hi arrange karein please.',
        '',
        shopName ? `Regards,\n${shopName}` : '',
      ].filter(Boolean).join('\n'),
    },
    {
      id: 'expiry-return',
      label: 'Expiry Return Request',
      emoji: '⏰',
      template: ({ supplierName, productName, quantityNeeded }) => [
        `${supplierName || 'Sir'},`,
        '',
        `Expiry return process karna hai:`,
        `${productName} — ${quantityNeeded || 'quantity attached'}`,
        '',
        'Kindly arrange pickup and credit note.',
      ].join('\n'),
    },
  ],
  adjustmentReasons: [
    'Expired batch removed',
    'Cold chain damage',
    'Doctor sample given',
    'Charity donation',
    'DRAP recall',
    'Distributor delivery',
    'Batch inspection loss',
    'Compounding waste',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🚗 AUTO PARTS
// ═══════════════════════════════════════════════════════════════
export const AUTOPARTS_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: 'Rust / Corrosion', emoji: '🦀', category: 'DAMAGE', color: '#f97316', severity: 'major' },
    { reason: 'Wrong Fit / Return', emoji: '↩️', category: 'ADJUSTMENT_OUT', color: '#3b82f6' },
    { reason: 'Manufacturing Defect', emoji: '⚠️', category: 'DAMAGE', color: '#dc2626', severity: 'major' },
    { reason: 'Damaged in Fitting', emoji: '🔧', category: 'DAMAGE', color: '#f59e0b', severity: 'minor' },
    { reason: 'Warranty Return to Supplier', emoji: '🔄', category: 'ADJUSTMENT_OUT', color: '#8b5cf6' },
    { reason: 'Workshop Test Fit', emoji: '⚙️', category: 'ADJUSTMENT_OUT', color: '#ec4899' },
    { reason: 'New Stock Received', emoji: '📦', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: 'Old Part Traded In', emoji: '♻️', category: 'ADJUSTMENT_IN', color: '#84cc16' },
  ],
  transferPurposes: [
    { name: 'Warehouse → Workshop', emoji: '🔧', color: '#3b82f6', description: 'Parts for immediate job' },
    { name: 'Branch → Branch', emoji: '🏪', color: '#8b5cf6', description: 'Inter-branch fulfillment' },
    { name: 'Wholesale → Retail', emoji: '📦', color: '#f59e0b', description: 'Bulk to display' },
    { name: 'Warranty Return', emoji: '↩️', color: '#dc2626', description: 'Defective back to supplier' },
  ],
  restockRules: [
    { label: 'Fast-Moving Out', emoji: '🚨', color: '#dc2626', daysToStockOut: 0, description: 'Popular part missing' },
    { label: 'Filter/Oil Low', emoji: '🛢️', color: '#f59e0b', daysToStockOut: 7, description: 'Common consumable' },
    { label: 'Slow Mover', emoji: '🐢', color: '#8b5cf6', daysToStockOut: 90, description: 'Slow-moving stock — review demand' },
  ],
  supplierReminders: [
    {
      id: 'mechanic-urgent',
      label: 'Mechanic Urgent Need',
      emoji: '🔧',
      template: ({ supplierName, productName, quantityNeeded }) => [
        `${supplierName || 'Bhai'} URGENT:`,
        '',
        `Workshop mein customer ki gaari khadi hai — need *${productName}*${quantityNeeded ? ` (${quantityNeeded})` : ''}`,
        'Aaj hi chahiye — 2 hours mein possible?',
      ].join('\n'),
    },
  ],
  adjustmentReasons: [
    'Wrong fit returned',
    'Warranty return',
    'Test fit damage',
    'New stock in',
    'Old part trade-in',
    'Workshop damage',
    'Rust damage removed',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 👗 GARMENTS
// ═══════════════════════════════════════════════════════════════
export const GARMENTS_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: 'Fabric Tear', emoji: '🧵', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: 'Colour Fading', emoji: '🌈', category: 'DAMAGE', color: '#f59e0b', severity: 'minor' },
    { reason: 'Stitching Defect', emoji: '🪡', category: 'DAMAGE', color: '#8b5cf6', severity: 'minor' },
    { reason: 'Stain (unremovable)', emoji: '🎨', category: 'DAMAGE', color: '#a855f7', severity: 'major' },
    { reason: 'Moth Damage', emoji: '🪲', category: 'DAMAGE', color: '#dc2626', severity: 'major' },
    { reason: 'Sample / Display Piece', emoji: '👗', category: 'ADJUSTMENT_OUT', color: '#ec4899' },
    { reason: 'Alteration Test Cut', emoji: '✂️', category: 'ADJUSTMENT_OUT', color: '#3b82f6' },
    { reason: 'New Collection Received', emoji: '📦', category: 'ADJUSTMENT_IN', color: '#22c55e' },
  ],
  transferPurposes: [
    { name: 'Warehouse → Showroom', emoji: '🏬', color: '#3b82f6', description: 'Display stocking' },
    { name: 'Season Refresh', emoji: '🍂', color: '#f59e0b', description: 'Seasonal collection swap' },
    { name: 'Sale Branch Transfer', emoji: '🏷️', color: '#dc2626', description: 'Move to sale outlet' },
    { name: 'Bridal Studio Loan', emoji: '👰', color: '#ec4899', description: 'For bridal appointments' },
  ],
  restockRules: [
    { label: 'Bestseller Out', emoji: '🚨', color: '#dc2626', daysToStockOut: 0, description: 'Bestseller is out — restock urgently' },
    { label: 'Popular Size Missing', emoji: '📏', color: '#f59e0b', daysToStockOut: 7, description: 'Popular size missing — reorder soon' },
    { label: 'Wedding Season Low', emoji: '👰', color: '#ec4899', daysToStockOut: 30, description: 'Wedding season low stock — plan ahead' },
  ],
  supplierReminders: [
    {
      id: 'bestseller-restock',
      label: 'Bestseller Restock',
      emoji: '⭐',
      template: ({ supplierName, productName, quantityNeeded }) => [
        `${supplierName || 'Sir'},`,
        '',
        `${productName} bahot chal raha hai — urgently restock chahiye.`,
        quantityNeeded ? `Quantity: *${quantityNeeded}*` : '',
        '',
        'All sizes chahiye. Kindly confirm.',
      ].filter(Boolean).join('\n'),
    },
  ],
  adjustmentReasons: [
    'Sample piece taken',
    'Display damage',
    'Alteration cutoff',
    'Fabric moth damage',
    'New collection in',
    'Stain damage removed',
    'Size exchange',
  ],
};

// ═══════════════════════════════════════════════════════════════
// GENERIC FALLBACK
// ═══════════════════════════════════════════════════════════════
export const GENERIC_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: 'Physical Damage', emoji: '💥', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: 'Water Damage', emoji: '💧', category: 'DAMAGE', color: '#0ea5e9', severity: 'major' },
    { reason: 'Expired', emoji: '⏰', category: 'LOSS', color: '#f59e0b', severity: 'major' },
    { reason: 'Theft / Shoplifting', emoji: '🚨', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: 'Sample / Giveaway', emoji: '🎁', category: 'ADJUSTMENT_OUT', color: '#ec4899' },
    { reason: 'Counting Correction', emoji: '✅', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: 'Opening Balance', emoji: '📦', category: 'ADJUSTMENT_IN', color: '#3b82f6' },
    { reason: 'Return In', emoji: '↩️', category: 'ADJUSTMENT_IN', color: '#84cc16' },
  ],
  transferPurposes: [
    { name: 'Main → Branch', emoji: '🏪', color: '#3b82f6', description: 'Standard stock transfer' },
    { name: 'Emergency Restock', emoji: '🚨', color: '#dc2626', description: 'Urgent supply' },
    { name: 'Seasonal Move', emoji: '📅', color: '#f59e0b', description: 'Seasonal reallocation' },
  ],
  restockRules: [
    { label: 'Out of Stock', emoji: '🚨', color: '#dc2626', daysToStockOut: 0, description: 'Order immediately' },
    { label: 'Low Stock', emoji: '⚠️', color: '#f59e0b', daysToStockOut: 7, description: 'Order this week' },
  ],
  supplierReminders: [
    {
      id: 'standard-reorder',
      label: 'Standard Reorder',
      emoji: '📦',
      template: ({ supplierName, productName, currentStock, quantityNeeded, shopName }) => [
        `Assalam-o-Alaikum ${supplierName || 'sir'},`,
        '',
        `Reorder request:`,
        `Product: *${productName}*`,
        `Current: ${currentStock}`,
        quantityNeeded ? `Need: *${quantityNeeded}*` : '',
        '',
        'Kindly confirm delivery.',
        '',
        shopName ? `- ${shopName}` : '',
      ].filter(Boolean).join('\n'),
    },
  ],
  adjustmentReasons: [
    'Counting correction',
    'Opening balance',
    'Damaged goods',
    'Physical count',
    'Return received',
    'Sample given',
    'Promotional giveaway',
  ],
};

// ═══════════════════════════════════════════════════════════════
// MASTER MAP
// ═══════════════════════════════════════════════════════════════
export const INDUSTRY_STOCK_PRESETS: Record<string, IndustryStockPresets> = {
  carpet: CARPET_STOCK,
  mobile: MOBILE_STOCK,
  restaurant: RESTAURANT_STOCK,
  jewelry: JEWELRY_STOCK,
  autoparts: AUTOPARTS_STOCK,
  pharmacy: PHARMACY_STOCK,
  garments: GARMENTS_STOCK,
};

export function getIndustryStockPresets(industryId?: string | null): IndustryStockPresets {
  if (industryId && INDUSTRY_STOCK_PRESETS[industryId]) {
    return INDUSTRY_STOCK_PRESETS[industryId];
  }
  return GENERIC_STOCK;
}
