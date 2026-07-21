/**
 * Industry-specific Khata (Customer Ledger) presets.
 *
 * Each industry has unique credit patterns:
 *   • Restaurant → Corporate accounts, monthly settlements, event catering
 *   • Mobile → EMI plans, phone finance, warranty deposits
 *   • Carpet → Wedding orders, installation advances, wholesale
 *   • Jewelry → Gold booking, layaway, bridal set advances
 *   • Pharmacy → Monthly medicine, hospital accounts
 *   • Dairy → Daily milk khata, household monthly bills
 *   • Meat → Qurbani advance, restaurant supply
 *   • Hardware → Contractor credit, project payments
 */

export interface KhataReminderTemplate {
  id: string;
  label: string;
  tone: 'polite' | 'firm' | 'friendly' | 'urgent';
  emoji: string;
  daysOverdue?: number;
  template: (params: {
    customerName: string;
    balance: string;
    shopName?: string;
    daysOverdue?: number;
  }) => string;
}

export interface CreditTermPreset {
  name: string;
  description: string;
  emoji: string;
  color: string;
  daysAllowed: number;
  isRecurring?: boolean;
}

export interface IndustryKhataPresets {
  reminders: KhataReminderTemplate[];
  creditTerms: CreditTermPreset[];
  paymentNotes: string[];  // Common payment notes for quick-fill
}

// ═══════════════════════════════════════════════════════════════
// 🌐 COMMON REMINDER TEMPLATES
// ═══════════════════════════════════════════════════════════════
const POLITE_REMINDER: KhataReminderTemplate = {
  id: 'polite',
  label: 'Polite Reminder',
  tone: 'polite',
  emoji: '🙏',
  template: ({ customerName, balance, shopName }) => [
    `Assalam-o-Alaikum *${customerName}*,`,
    '',
    `Aap ke account mein *${balance}* ka udhaar baqi hai.`,
    'Jab aap ke liye asaan ho to please clear kar dijiye ga.',
    '',
    shopName ? `Shukriya\n${shopName} 🙏` : 'Shukriya 🙏',
  ].join('\n'),
};

const FRIENDLY_REMINDER: KhataReminderTemplate = {
  id: 'friendly',
  label: 'Friendly Nudge',
  tone: 'friendly',
  emoji: '😊',
  template: ({ customerName, balance }) => [
    `Hi ${customerName}! 👋`,
    '',
    `Just a friendly reminder — aap ka *${balance}* baqi hai.`,
    'Whenever convenient, please settle kar dijiye 😊',
    '',
    'Thanks!',
  ].join('\n'),
};

const FIRM_REMINDER: KhataReminderTemplate = {
  id: 'firm',
  label: 'Firm Reminder',
  tone: 'firm',
  emoji: '⚠️',
  daysOverdue: 30,
  template: ({ customerName, balance, daysOverdue }) => [
    `*${customerName}*,`,
    '',
    `Aap ke account mein *${balance}* ka udhaar baqi hai${daysOverdue ? ` (${daysOverdue} din se pending)` : ''}.`,
    'Iski clearance zaroori hai. Bharai ki tareekh confirm karein.',
    '',
    'Please respond as soon as possible.',
  ].join('\n'),
};

const URGENT_REMINDER: KhataReminderTemplate = {
  id: 'urgent',
  label: 'Urgent Notice',
  tone: 'urgent',
  emoji: '🚨',
  daysOverdue: 60,
  template: ({ customerName, balance, daysOverdue }) => [
    `*URGENT — ${customerName}*`,
    '',
    `Balance: *${balance}*`,
    daysOverdue ? `Overdue: ${daysOverdue} days` : '',
    '',
    'Kindly clear at your earliest. Iske baad hum contact karne majboor honge.',
    '',
    'Please respond today.',
  ].filter(Boolean).join('\n'),
};

// ═══════════════════════════════════════════════════════════════
// 🍽️ RESTAURANT
// ═══════════════════════════════════════════════════════════════
export const RESTAURANT_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FRIENDLY_REMINDER,
    FIRM_REMINDER,
    URGENT_REMINDER,
    {
      id: 'monthly-corporate',
      label: 'Corporate Monthly Bill',
      tone: 'polite',
      emoji: '🏢',
      template: ({ customerName, balance, shopName }) => [
        `Dear *${customerName}*,`,
        '',
        `Monthly billing for your corporate lunch account:`,
        `Total: *${balance}*`,
        '',
        'Kindly process the payment as per our credit terms.',
        'Invoice details available on request.',
        '',
        shopName ? `Regards,\n${shopName}` : 'Regards',
      ].join('\n'),
    },
    {
      id: 'event-catering',
      label: 'Event Catering Reminder',
      tone: 'polite',
      emoji: '🎉',
      template: ({ customerName, balance }) => [
        `*${customerName}*,`,
        '',
        `Aap ke event ki catering ka balance *${balance}* hai.`,
        'Event khubsurat raha, ummeed hai aap mutmain honge!',
        '',
        'Balance clear karne ki guzarish hai.',
      ].join('\n'),
    },
    {
      id: 'delivery-cod-pending',
      label: 'Delivery COD Pending',
      tone: 'firm',
      emoji: '🏍️',
      template: ({ customerName, balance }) => [
        `Assalam-o-Alaikum ${customerName},`,
        '',
        `Aap ke delivery order ka amount *${balance}* rider ko paid nahi hua tha.`,
        'Please clear kar dein ta ke aap ke aage ke orders mein masla na ho.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Same Day Payment', description: 'Bill khaana ke turant baad', emoji: '⚡', color: '#22c55e', daysAllowed: 0 },
    { name: 'Weekly Settlement', description: 'Har Jumma ko clear', emoji: '📅', color: '#3b82f6', daysAllowed: 7, isRecurring: true },
    { name: 'Monthly Corporate', description: '30 days credit (companies)', emoji: '🏢', color: '#8b5cf6', daysAllowed: 30, isRecurring: true },
    { name: 'Event Catering', description: '50% advance, 50% on event', emoji: '🎉', color: '#f59e0b', daysAllowed: 15 },
    { name: 'Delivery COD Later', description: 'COD collect after 24h', emoji: '🏍️', color: '#ec4899', daysAllowed: 2 },
  ],
  paymentNotes: [
    'Table pe khaane ka bill',
    'Delivery order payment',
    'Corporate monthly bill',
    'Event catering payment',
    'Advance for booking',
    'Ramzan iftar deal',
    'Family dinner settlement',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 📱 MOBILE
// ═══════════════════════════════════════════════════════════════
export const MOBILE_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FRIENDLY_REMINDER,
    FIRM_REMINDER,
    URGENT_REMINDER,
    {
      id: 'emi-due',
      label: 'EMI Installment Due',
      tone: 'firm',
      emoji: '💳',
      template: ({ customerName, balance }) => [
        `Assalam-o-Alaikum *${customerName}*,`,
        '',
        `Aap ki EMI installment *${balance}* due hai.`,
        'Time pe payment karna zaroori hai warna phone lock/repossess ho sakta hai.',
        '',
        'Aaj hi bharai karein please.',
      ].join('\n'),
    },
    {
      id: 'repair-completed',
      label: 'Repair Ready for Pickup',
      tone: 'friendly',
      emoji: '🔧',
      template: ({ customerName, balance }) => [
        `Hi ${customerName}!`,
        '',
        `Aap ka phone repair ho gaya hai — pickup ke liye ready hai.`,
        `Total bill: *${balance}*`,
        '',
        'Aaj hi collect kar lein shukriya!',
      ].join('\n'),
    },
    {
      id: 'imei-warranty-deposit',
      label: 'Warranty Deposit Pending',
      tone: 'polite',
      emoji: '🛡️',
      template: ({ customerName, balance }) => [
        `*${customerName}*,`,
        '',
        `IMEI-tracked phone ka warranty deposit *${balance}* baqi hai.`,
        'Please jaldi settle karein taake warranty active rahe.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Cash on Purchase', description: 'Turant full payment', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'EMI 3 Months', description: 'IMEI locked, 3 installments', emoji: '💳', color: '#3b82f6', daysAllowed: 90, isRecurring: true },
    { name: 'EMI 6 Months', description: 'IMEI locked, 6 installments', emoji: '📅', color: '#8b5cf6', daysAllowed: 180, isRecurring: true },
    { name: 'EMI 12 Months', description: 'Long-term phone finance', emoji: '🗓️', color: '#a855f7', daysAllowed: 365, isRecurring: true },
    { name: 'Post-Repair Payment', description: 'Repair pickup pe pay', emoji: '🔧', color: '#f97316', daysAllowed: 3 },
    { name: 'Trade-in Balance', description: 'Old phone value adjustment', emoji: '🔄', color: '#14b8a6', daysAllowed: 7 },
  ],
  paymentNotes: [
    'EMI installment payment',
    'Phone finance monthly',
    'Repair bill clearance',
    'Warranty deposit',
    'Trade-in balance payment',
    'Accessories credit',
    'Screen replacement bill',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🧶 CARPET
// ═══════════════════════════════════════════════════════════════
export const CARPET_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FIRM_REMINDER,
    URGENT_REMINDER,
    {
      id: 'installation-balance',
      label: 'Post-Installation Balance',
      tone: 'polite',
      emoji: '🔨',
      template: ({ customerName, balance }) => [
        `Dear *${customerName}*,`,
        '',
        `Installation mukammal ho gayi hai — hope you love your new carpet!`,
        `Balance amount: *${balance}*`,
        '',
        'Please settle kar dein shukriya.',
      ].join('\n'),
    },
    {
      id: 'wedding-order',
      label: 'Wedding Order Balance',
      tone: 'polite',
      emoji: '💒',
      template: ({ customerName, balance }) => [
        `Mubarakbaad *${customerName}*!`,
        '',
        `Aap ki shaadi ke liye carpets ready hain.`,
        `Baqaya: *${balance}*`,
        '',
        'Balance clear kar ke delivery schedule confirm karein.',
      ].join('\n'),
    },
    {
      id: 'wholesale-monthly',
      label: 'Wholesale Monthly Settlement',
      tone: 'firm',
      emoji: '📊',
      template: ({ customerName, balance }) => [
        `*${customerName}* — Wholesale Account`,
        '',
        `Monthly settlement due: *${balance}*`,
        'Payment terms ke mutabiq clearance zaroori hai.',
        '',
        'Kindly process at earliest.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: '50% Advance Booking', description: 'Order pe half advance', emoji: '💰', color: '#f59e0b', daysAllowed: 30 },
    { name: 'Post-Installation', description: 'Install ke baad clear', emoji: '🔨', color: '#3b82f6', daysAllowed: 7 },
    { name: 'Wholesale 30 Days', description: 'Bulk buyers ke liye', emoji: '📦', color: '#8b5cf6', daysAllowed: 30, isRecurring: true },
    { name: 'Wedding Package', description: 'Shaadi ke event tak', emoji: '💒', color: '#ec4899', daysAllowed: 45 },
    { name: 'Contractor Credit', description: 'Project-based credit', emoji: '👷', color: '#a855f7', daysAllowed: 60 },
    { name: 'Cash on Delivery', description: 'Delivery pe full pay', emoji: '🚚', color: '#22c55e', daysAllowed: 0 },
  ],
  paymentNotes: [
    'Roll advance booking',
    'Installation balance',
    'Wedding order payment',
    'Wholesale monthly',
    'Cut piece purchase',
    'Contractor project payment',
    'Custom size order',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💎 JEWELRY
// ═══════════════════════════════════════════════════════════════
export const JEWELRY_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FIRM_REMINDER,
    {
      id: 'layaway-installment',
      label: 'Layaway Installment',
      tone: 'polite',
      emoji: '💎',
      template: ({ customerName, balance }) => [
        `Assalam-o-Alaikum *${customerName}*,`,
        '',
        `Aap ke layaway plan ki installment *${balance}* due hai.`,
        'Regular installments se aap ka ordered jewelry safe rahega.',
        '',
        'Kindly deposit karein shukriya.',
      ].join('\n'),
    },
    {
      id: 'bridal-set-advance',
      label: 'Bridal Set Advance',
      tone: 'polite',
      emoji: '👰',
      template: ({ customerName, balance }) => [
        `Mubarakbaad *${customerName}*!`,
        '',
        `Aap ka bridal set tayyar ho raha hai.`,
        `Baqaya advance: *${balance}*`,
        '',
        'Shaadi se pehle full payment zaroori hai.',
      ].join('\n'),
    },
    {
      id: 'gold-booking',
      label: 'Gold Booking Balance',
      tone: 'firm',
      emoji: '🟡',
      template: ({ customerName, balance }) => [
        `*${customerName}*,`,
        '',
        `Gold booking ka balance *${balance}* baqi hai.`,
        'Rate lock aap ke advance pe hai — settlement zaroori hai.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Full Cash Purchase', description: 'Turant full payment', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'Layaway 3 Months', description: '3 installments plan', emoji: '📅', color: '#3b82f6', daysAllowed: 90, isRecurring: true },
    { name: 'Layaway 6 Months', description: '6 monthly deposits', emoji: '💎', color: '#8b5cf6', daysAllowed: 180, isRecurring: true },
    { name: 'Wedding Advance', description: '50% advance, rest on delivery', emoji: '👰', color: '#ec4899', daysAllowed: 60 },
    { name: 'Gold Rate Lock', description: 'Advance se rate fix', emoji: '🟡', color: '#eab308', daysAllowed: 15 },
    { name: 'Custom Order', description: 'Made-to-order advance', emoji: '✨', color: '#a855f7', daysAllowed: 30 },
    { name: 'Exchange Balance', description: 'Old jewelry exchange', emoji: '🔄', color: '#14b8a6', daysAllowed: 7 },
  ],
  paymentNotes: [
    'Layaway installment',
    'Bridal set advance',
    'Gold booking payment',
    'Wedding order balance',
    'Custom design advance',
    'Diamond ring installment',
    'Gold exchange balance',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💊 PHARMACY
// ═══════════════════════════════════════════════════════════════
export const PHARMACY_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FIRM_REMINDER,
    {
      id: 'monthly-medicine',
      label: 'Monthly Medicine Bill',
      tone: 'polite',
      emoji: '💊',
      template: ({ customerName, balance }) => [
        `Assalam-o-Alaikum *${customerName}*,`,
        '',
        `Is mahine ki medicine ka bill *${balance}* hai.`,
        'Regular medicines ke liye timely payment zaroori hai.',
        '',
        'Shukriya.',
      ].join('\n'),
    },
    {
      id: 'hospital-account',
      label: 'Hospital Account Settlement',
      tone: 'firm',
      emoji: '🏥',
      template: ({ customerName, balance }) => [
        `Dear *${customerName}*,`,
        '',
        `Hospital account settlement: *${balance}*`,
        'Please process as per agreed terms.',
      ].join('\n'),
    },
    {
      id: 'prescription-partial',
      label: 'Prescription Partial Payment',
      tone: 'polite',
      emoji: '📝',
      template: ({ customerName, balance }) => [
        `${customerName},`,
        '',
        `Prescription ka baqi amount *${balance}* hai.`,
        'Please jab aayen to clear kar dein.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Cash on Purchase', description: 'Turant payment', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'Monthly Household', description: 'Regular family customers', emoji: '🏠', color: '#3b82f6', daysAllowed: 30, isRecurring: true },
    { name: 'Hospital Contract', description: 'Institutional accounts', emoji: '🏥', color: '#dc2626', daysAllowed: 30, isRecurring: true },
    { name: 'Doctor Account', description: 'Clinic supplies', emoji: '👨‍⚕️', color: '#8b5cf6', daysAllowed: 30, isRecurring: true },
    { name: 'Chronic Patient', description: 'Long-term medication plans', emoji: '💊', color: '#0ea5e9', daysAllowed: 30, isRecurring: true },
    { name: 'Insurance Reimbursement', description: 'Wait for insurance claim', emoji: '📋', color: '#a855f7', daysAllowed: 45 },
  ],
  paymentNotes: [
    'Monthly medicine bill',
    'Chronic care payment',
    'Hospital account settlement',
    'Prescription clearance',
    'Insurance reimbursement',
    'Doctor account payment',
    'Emergency medicine credit',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🚗 AUTO PARTS
// ═══════════════════════════════════════════════════════════════
export const AUTOPARTS_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FIRM_REMINDER,
    {
      id: 'workshop-completed',
      label: 'Workshop Job Ready',
      tone: 'friendly',
      emoji: '🔧',
      template: ({ customerName, balance }) => [
        `Assalam-o-Alaikum ${customerName},`,
        '',
        `Aap ki gaari repair ho gayi — pickup ke liye ready hai!`,
        `Total bill: *${balance}*`,
        '',
        'Aaj hi aa kar receive karein.',
      ].join('\n'),
    },
    {
      id: 'fleet-account',
      label: 'Fleet Account Monthly',
      tone: 'firm',
      emoji: '🚛',
      template: ({ customerName, balance }) => [
        `*${customerName}* — Fleet Account`,
        '',
        `Monthly settlement: *${balance}*`,
        'Please process as per fleet terms.',
      ].join('\n'),
    },
    {
      id: 'mechanic-account',
      label: 'Mechanic Wholesale',
      tone: 'polite',
      emoji: '🔧',
      template: ({ customerName, balance }) => [
        `${customerName} bhai,`,
        '',
        `Wholesale account balance *${balance}* hai.`,
        'Weekly settlement kar dein taake account clear rahe.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Cash Payment', description: 'Turant cash', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'Post-Repair Payment', description: 'Job complete ke baad', emoji: '🔧', color: '#f59e0b', daysAllowed: 3 },
    { name: 'Fleet Account Monthly', description: 'Fleet owners', emoji: '🚛', color: '#3b82f6', daysAllowed: 30, isRecurring: true },
    { name: 'Mechanic Weekly', description: 'Small workshops', emoji: '🔧', color: '#8b5cf6', daysAllowed: 7, isRecurring: true },
    { name: 'Corporate Fleet', description: 'Company vehicles', emoji: '🏢', color: '#dc2626', daysAllowed: 30, isRecurring: true },
    { name: 'Insurance Claim', description: 'Wait for insurance', emoji: '📋', color: '#a855f7', daysAllowed: 45 },
  ],
  paymentNotes: [
    'Workshop repair bill',
    'Parts purchase',
    'Fleet monthly settlement',
    'Insurance reimbursement',
    'Emergency repair payment',
    'Oil change bill',
    'Body work balance',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 👗 GARMENTS
// ═══════════════════════════════════════════════════════════════
export const GARMENTS_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FRIENDLY_REMINDER,
    FIRM_REMINDER,
    {
      id: 'tailoring-ready',
      label: 'Tailoring Ready',
      tone: 'friendly',
      emoji: '✂️',
      template: ({ customerName, balance }) => [
        `Hi ${customerName}!`,
        '',
        `Aap ki tailoring order ready hai for pickup.`,
        `Balance: *${balance}*`,
        '',
        'Aaj hi collect karein!',
      ].join('\n'),
    },
    {
      id: 'bridal-order',
      label: 'Bridal Order Balance',
      tone: 'polite',
      emoji: '👰',
      template: ({ customerName, balance }) => [
        `Mubarakbaad *${customerName}*!`,
        '',
        `Aap ka bridal dress tayyar ho raha hai.`,
        `Baqaya: *${balance}*`,
        '',
        'Please settle kar dein taake trials aur delivery smoothly ho.',
      ].join('\n'),
    },
    {
      id: 'layaway-plan',
      label: 'Layaway Plan Installment',
      tone: 'polite',
      emoji: '📅',
      template: ({ customerName, balance }) => [
        `${customerName},`,
        '',
        `Layaway plan ki installment *${balance}* due hai.`,
        'Timely installments se aap ki reservation active rahegi.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Cash on Sale', description: 'Immediate payment', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'Tailoring Deposit', description: '50% advance for stitching', emoji: '✂️', color: '#f59e0b', daysAllowed: 15 },
    { name: 'Bridal Layaway', description: 'Wedding season plans', emoji: '👰', color: '#ec4899', daysAllowed: 90 },
    { name: 'Reservation Hold', description: 'Dress reservation deposit', emoji: '🔒', color: '#8b5cf6', daysAllowed: 30 },
    { name: 'Alterations Later', description: 'Pay on pickup', emoji: '🪡', color: '#a855f7', daysAllowed: 7 },
    { name: 'Wholesale Boutique', description: 'B2B monthly', emoji: '🏪', color: '#3b82f6', daysAllowed: 30, isRecurring: true },
  ],
  paymentNotes: [
    'Tailoring balance',
    'Bridal order deposit',
    'Reservation payment',
    'Alterations bill',
    'Layaway installment',
    'Wholesale monthly',
    'Custom stitching',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🔨 HARDWARE
// ═══════════════════════════════════════════════════════════════
export const HARDWARE_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FIRM_REMINDER,
    URGENT_REMINDER,
    {
      id: 'project-milestone',
      label: 'Project Milestone Payment',
      tone: 'firm',
      emoji: '🏗️',
      template: ({ customerName, balance }) => [
        `*${customerName}* — Project Account`,
        '',
        `Milestone payment due: *${balance}*`,
        'Please clear taake next phase supplies smoothly ho.',
      ].join('\n'),
    },
    {
      id: 'contractor-account',
      label: 'Contractor Account',
      tone: 'polite',
      emoji: '👷',
      template: ({ customerName, balance }) => [
        `${customerName} bhai,`,
        '',
        `Contractor account balance *${balance}* hai.`,
        'Payment terms ke mutabiq clearance zaroori hai.',
      ].join('\n'),
    },
    {
      id: 'quotation-followup',
      label: 'Quotation Follow-up',
      tone: 'polite',
      emoji: '📋',
      template: ({ customerName, balance }) => [
        `Dear *${customerName}*,`,
        '',
        `Aap ki quotation ke against *${balance}* baqi hai.`,
        'Please advance clear kar dein delivery ke liye.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Cash on Purchase', description: 'Immediate payment', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'Contractor 30 Days', description: 'Trade credit', emoji: '👷', color: '#3b82f6', daysAllowed: 30, isRecurring: true },
    { name: 'Project Milestone', description: 'Phase-based payments', emoji: '🏗️', color: '#8b5cf6', daysAllowed: 60 },
    { name: 'Delivery Advance', description: '50% advance for delivery', emoji: '🚚', color: '#f59e0b', daysAllowed: 15 },
    { name: 'Corporate Account', description: 'B2B monthly', emoji: '🏢', color: '#dc2626', daysAllowed: 30, isRecurring: true },
    { name: 'Government Tender', description: 'Long payment cycles', emoji: '🏛️', color: '#a855f7', daysAllowed: 90 },
  ],
  paymentNotes: [
    'Project payment',
    'Contractor monthly',
    'Delivery advance',
    'Quotation clearance',
    'Bulk order payment',
    'Corporate account',
    'Government tender payment',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🐄 DAIRY
// ═══════════════════════════════════════════════════════════════
export const DAIRY_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FIRM_REMINDER,
    {
      id: 'monthly-milk-bill',
      label: 'Monthly Milk Bill',
      tone: 'polite',
      emoji: '🥛',
      template: ({ customerName, balance, shopName }) => [
        `Assalam-o-Alaikum *${customerName}*,`,
        '',
        `Is mahine ka doodh ka bill *${balance}* hai.`,
        'Please clear kar dein shukriya.',
        '',
        shopName ? `- ${shopName}` : '',
      ].filter(Boolean).join('\n'),
    },
    {
      id: 'household-daily',
      label: 'Household Daily Khata',
      tone: 'friendly',
      emoji: '🏠',
      template: ({ customerName, balance }) => [
        `${customerName} bhai/behen,`,
        '',
        `Daily doodh ka khata *${balance}* hai.`,
        'Jab convenient ho settle kar dein.',
      ].join('\n'),
    },
    {
      id: 'tea-hotel-supply',
      label: 'Tea/Hotel Supply Bill',
      tone: 'firm',
      emoji: '🏨',
      template: ({ customerName, balance }) => [
        `*${customerName}* — Supply Account`,
        '',
        `Weekly/Monthly bill: *${balance}*`,
        'Please settle taake regular supply chalti rahe.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Cash Daily', description: 'Har din cash', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'Weekly Settlement', description: 'Har hafta clear', emoji: '📅', color: '#3b82f6', daysAllowed: 7, isRecurring: true },
    { name: 'Monthly Household', description: 'Regular family bill', emoji: '🏠', color: '#8b5cf6', daysAllowed: 30, isRecurring: true },
    { name: 'Hotel/Cafe Supply', description: 'B2B supply account', emoji: '🏨', color: '#f97316', daysAllowed: 30, isRecurring: true },
    { name: 'Sweet Shop Bulk', description: 'Wholesale to mithai shops', emoji: '🍬', color: '#ec4899', daysAllowed: 15, isRecurring: true },
    { name: 'Ramzan Special', description: 'Extended credit for Ramzan', emoji: '🌙', color: '#a855f7', daysAllowed: 30 },
  ],
  paymentNotes: [
    'Monthly milk bill',
    'Daily khata clearance',
    'Weekly settlement',
    'Hotel supply payment',
    'Sweet shop bulk payment',
    'Yogurt/butter bill',
    'Ramzan special',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🥩 MEAT
// ═══════════════════════════════════════════════════════════════
export const MEAT_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FIRM_REMINDER,
    {
      id: 'qurbani-advance',
      label: 'Qurbani Advance',
      tone: 'polite',
      emoji: '🐄',
      template: ({ customerName, balance }) => [
        `Assalam-o-Alaikum *${customerName}*,`,
        '',
        `Qurbani ka advance balance *${balance}* hai.`,
        'Eid se pehle payment complete karna zaroori hai.',
        '',
        'Baraka Allahu feekum.',
      ].join('\n'),
    },
    {
      id: 'restaurant-supply',
      label: 'Restaurant Supply Bill',
      tone: 'firm',
      emoji: '🍽️',
      template: ({ customerName, balance }) => [
        `*${customerName}* — Supply Account`,
        '',
        `Weekly meat supply bill: *${balance}*`,
        'Please clear taake supply continue rahe.',
      ].join('\n'),
    },
    {
      id: 'wholesale-bulk',
      label: 'Wholesale Bulk Order',
      tone: 'polite',
      emoji: '📦',
      template: ({ customerName, balance }) => [
        `${customerName} bhai,`,
        '',
        `Bulk order ka baqi *${balance}* hai.`,
        'Weekly settlement karein taake account clear rahe.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Cash on Purchase', description: 'Turant payment', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'Weekly Regular', description: 'Regular household weekly', emoji: '📅', color: '#3b82f6', daysAllowed: 7, isRecurring: true },
    { name: 'Restaurant Supply', description: 'Restaurant supply weekly', emoji: '🍽️', color: '#f97316', daysAllowed: 7, isRecurring: true },
    { name: 'Qurbani Advance', description: 'Eid-ul-Azha booking', emoji: '🐄', color: '#dc2626', daysAllowed: 60 },
    { name: 'Wholesale Butcher', description: 'B2B butcher accounts', emoji: '🔪', color: '#8b5cf6', daysAllowed: 15, isRecurring: true },
    { name: 'Event Catering', description: 'Wedding/event supply', emoji: '🎉', color: '#ec4899', daysAllowed: 30 },
  ],
  paymentNotes: [
    'Qurbani advance',
    'Restaurant supply',
    'Weekly household',
    'Bulk order payment',
    'Event supply',
    'Wholesale butcher',
    'Wedding catering',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🛒 RETAIL / GROCERY
// ═══════════════════════════════════════════════════════════════
export const RETAIL_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FRIENDLY_REMINDER,
    FIRM_REMINDER,
    {
      id: 'monthly-family-khata',
      label: 'Monthly Family Khata',
      tone: 'polite',
      emoji: '🏠',
      template: ({ customerName, balance, shopName }) => [
        `Assalam-o-Alaikum *${customerName}*,`,
        '',
        `Is mahine ka khata *${balance}* hai.`,
        'Salary aayi ho to please clear kar dein.',
        '',
        shopName ? `Shukriya\n${shopName}` : 'Shukriya',
      ].join('\n'),
    },
    {
      id: 'ramzan-eid',
      label: 'Ramzan/Eid Special',
      tone: 'polite',
      emoji: '🌙',
      template: ({ customerName, balance }) => [
        `Ramzan Mubarak *${customerName}*,`,
        '',
        `Aap ka khata *${balance}* hai.`,
        'Eid se pehle clearance karne ki guzarish hai.',
        '',
        'Baraka Allahu feekum!',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Cash Only', description: 'No credit', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'Weekly Regular', description: 'Salaried customers', emoji: '📅', color: '#3b82f6', daysAllowed: 7, isRecurring: true },
    { name: 'Monthly Family', description: 'Trusted families', emoji: '🏠', color: '#8b5cf6', daysAllowed: 30, isRecurring: true },
    { name: 'Salary Day Clear', description: '1st ya 5th tak', emoji: '💰', color: '#f97316', daysAllowed: 30, isRecurring: true },
    { name: 'Ramzan Special', description: 'Extended for Ramzan', emoji: '🌙', color: '#a855f7', daysAllowed: 30 },
    { name: 'Emergency Only', description: 'Case-by-case', emoji: '🆘', color: '#ef4444', daysAllowed: 15 },
  ],
  paymentNotes: [
    'Monthly grocery khata',
    'Salary day clearance',
    'Weekly settlement',
    'Ramzan special',
    'Eid clearance',
    'Emergency credit',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🌾 AGRI
// ═══════════════════════════════════════════════════════════════
export const AGRI_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FIRM_REMINDER,
    {
      id: 'harvest-payment',
      label: 'Post-Harvest Payment',
      tone: 'polite',
      emoji: '🌾',
      template: ({ customerName, balance }) => [
        `Assalam-o-Alaikum *${customerName}*,`,
        '',
        `Fasal ki katayi hone ke baad *${balance}* clear karein.`,
        'Allah aap ki fasal mein barkat de.',
      ].join('\n'),
    },
    {
      id: 'seasonal-advance',
      label: 'Seasonal Advance',
      tone: 'polite',
      emoji: '☀️',
      template: ({ customerName, balance }) => [
        `${customerName} bhai,`,
        '',
        `Season advance ka baqi *${balance}* hai.`,
        'Kharif/Rabi ke shuru mein clear karein.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Cash on Purchase', description: 'Immediate', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'Post-Harvest', description: 'Fasal cutting ke baad', emoji: '🌾', color: '#f59e0b', daysAllowed: 120 },
    { name: 'Kharif Season', description: 'Kharif season credit', emoji: '☀️', color: '#22c55e', daysAllowed: 180 },
    { name: 'Rabi Season', description: 'Rabi season credit', emoji: '❄️', color: '#0ea5e9', daysAllowed: 180 },
    { name: 'Subsidy Wait', description: 'Government subsidy ke sath', emoji: '🏛️', color: '#8b5cf6', daysAllowed: 90 },
    { name: 'Cooperative Bulk', description: 'Farmer cooperatives', emoji: '👥', color: '#3b82f6', daysAllowed: 60 },
  ],
  paymentNotes: [
    'Post-harvest payment',
    'Kharif season credit',
    'Rabi season credit',
    'Fertilizer bulk payment',
    'Seed advance',
    'Subsidy reimbursement',
    'Cooperative settlement',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 📚 BOOKSTORE
// ═══════════════════════════════════════════════════════════════
export const BOOKSTORE_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FRIENDLY_REMINDER,
    {
      id: 'school-monthly',
      label: 'School Account Monthly',
      tone: 'firm',
      emoji: '🏫',
      template: ({ customerName, balance }) => [
        `Dear *${customerName}* — School Account`,
        '',
        `Monthly settlement: *${balance}*`,
        'Kindly process at earliest for continued supply.',
      ].join('\n'),
    },
    {
      id: 'rental-return',
      label: 'Book Rental Return',
      tone: 'polite',
      emoji: '📖',
      template: ({ customerName, balance }) => [
        `Hi ${customerName},`,
        '',
        `Rental balance *${balance}* is due.`,
        'Books return karke deposit refund lein ya balance clear karein.',
      ].join('\n'),
    },
    {
      id: 'session-start',
      label: 'Session Start Books',
      tone: 'polite',
      emoji: '🎒',
      template: ({ customerName, balance }) => [
        `*${customerName}*,`,
        '',
        `Naya session ke books ka balance *${balance}* hai.`,
        'Please jaldi clear kar dein taake session start ho sake.',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Cash Only', description: 'Immediate payment', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'School Monthly', description: 'School book supply', emoji: '🏫', color: '#3b82f6', daysAllowed: 30, isRecurring: true },
    { name: 'Session Start Plan', description: 'Session shuru pe payment', emoji: '🎒', color: '#8b5cf6', daysAllowed: 60 },
    { name: 'Rental Deposit', description: 'Book rental deposit', emoji: '📖', color: '#f59e0b', daysAllowed: 90 },
    { name: 'College Account', description: 'College bookstore accounts', emoji: '🎓', color: '#a855f7', daysAllowed: 45 },
    { name: 'Bulk Institution', description: 'Institution bulk orders', emoji: '🏛️', color: '#dc2626', daysAllowed: 60 },
  ],
  paymentNotes: [
    'School monthly bill',
    'Session start books',
    'Book rental clearance',
    'College account payment',
    'Bulk institution order',
    'Stationery credit',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🏨 HOTEL
// ═══════════════════════════════════════════════════════════════
export const HOTEL_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FIRM_REMINDER,
    {
      id: 'corporate-account',
      label: 'Corporate Account',
      tone: 'firm',
      emoji: '🏢',
      template: ({ customerName, balance }) => [
        `Dear *${customerName}* — Corporate Account`,
        '',
        `Outstanding balance: *${balance}*`,
        'Please process as per corporate agreement.',
      ].join('\n'),
    },
    {
      id: 'event-balance',
      label: 'Event Function Balance',
      tone: 'polite',
      emoji: '🎉',
      template: ({ customerName, balance }) => [
        `*${customerName}*,`,
        '',
        `Aap ke event ki hosting ka balance *${balance}* hai.`,
        'Function successful raha, ummeed hai aap khush hain!',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Checkout Payment', description: 'Room checkout pe pay', emoji: '💳', color: '#22c55e', daysAllowed: 0 },
    { name: 'Corporate Monthly', description: 'Companies ke liye', emoji: '🏢', color: '#3b82f6', daysAllowed: 30, isRecurring: true },
    { name: 'Event Advance', description: 'Wedding/event 50% advance', emoji: '🎉', color: '#ec4899', daysAllowed: 60 },
    { name: 'Travel Agency', description: 'Agent-booked stays', emoji: '✈️', color: '#8b5cf6', daysAllowed: 30, isRecurring: true },
    { name: 'OTA Settlement', description: 'Booking.com etc payouts', emoji: '💻', color: '#a855f7', daysAllowed: 45 },
  ],
  paymentNotes: [
    'Room checkout balance',
    'Corporate monthly',
    'Event function balance',
    'Travel agency settlement',
    'OTA payout wait',
    'Long-stay guest',
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💇 SALON
// ═══════════════════════════════════════════════════════════════
export const SALON_KHATA: IndustryKhataPresets = {
  reminders: [
    POLITE_REMINDER,
    FRIENDLY_REMINDER,
    {
      id: 'bridal-package',
      label: 'Bridal Package Balance',
      tone: 'polite',
      emoji: '👰',
      template: ({ customerName, balance }) => [
        `Mubarakbaad *${customerName}*!`,
        '',
        `Bridal package ka baqi *${balance}* hai.`,
        'Shaadi ke din se pehle settle kar dein taake sab smoothly ho.',
      ].join('\n'),
    },
    {
      id: 'membership-renewal',
      label: 'Membership Renewal',
      tone: 'friendly',
      emoji: '💳',
      template: ({ customerName, balance }) => [
        `Hi ${customerName}!`,
        '',
        `Aap ki membership renewal ke liye *${balance}* pending hai.`,
        'Renew karein aur exclusive discounts enjoy karein!',
      ].join('\n'),
    },
  ],
  creditTerms: [
    { name: 'Cash on Service', description: 'Service ke baad turant', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: 'Bridal Advance', description: '50% advance booking', emoji: '👰', color: '#ec4899', daysAllowed: 60 },
    { name: 'Membership Plan', description: 'Monthly/quarterly', emoji: '💳', color: '#8b5cf6', daysAllowed: 30, isRecurring: true },
    { name: 'VIP Client Monthly', description: 'Regular VIP customers', emoji: '👑', color: '#f59e0b', daysAllowed: 30, isRecurring: true },
    { name: 'Party Package', description: 'Family event bookings', emoji: '🎊', color: '#a855f7', daysAllowed: 15 },
  ],
  paymentNotes: [
    'Bridal package balance',
    'Membership renewal',
    'VIP monthly',
    'Party package',
    'Service package advance',
    'Product purchase',
  ],
};

// ═══════════════════════════════════════════════════════════════
// GENERIC FALLBACK
// ═══════════════════════════════════════════════════════════════
export const GENERIC_KHATA: IndustryKhataPresets = {
  reminders: [POLITE_REMINDER, FRIENDLY_REMINDER, FIRM_REMINDER, URGENT_REMINDER],
  creditTerms: [
    { name: 'Cash Only', description: 'No credit', emoji: '💵', color: '#22c55e', daysAllowed: 0 },
    { name: '7 Days Credit', description: 'Weekly settlement', emoji: '📅', color: '#3b82f6', daysAllowed: 7, isRecurring: true },
    { name: '15 Days Credit', description: 'Bi-weekly', emoji: '📆', color: '#8b5cf6', daysAllowed: 15, isRecurring: true },
    { name: '30 Days Credit', description: 'Monthly', emoji: '🗓️', color: '#f59e0b', daysAllowed: 30, isRecurring: true },
    { name: 'Custom Terms', description: 'Special arrangement', emoji: '📋', color: '#a855f7', daysAllowed: 60 },
  ],
  paymentNotes: [
    'Payment received',
    'Monthly clearance',
    'Weekly settlement',
    'Advance payment',
    'Balance clearance',
    'Full payment',
  ],
};

// ═══════════════════════════════════════════════════════════════
// MASTER MAP
// ═══════════════════════════════════════════════════════════════
export const INDUSTRY_KHATA_PRESETS: Record<string, IndustryKhataPresets> = {
  restaurant: RESTAURANT_KHATA,
  mobile: MOBILE_KHATA,
  carpet: CARPET_KHATA,
  jewelry: JEWELRY_KHATA,
  autoparts: AUTOPARTS_KHATA,
  pharmacy: PHARMACY_KHATA,
  garments: GARMENTS_KHATA,
  hardware: HARDWARE_KHATA,
  dairy: DAIRY_KHATA,
  meat: MEAT_KHATA,
  retail: RETAIL_KHATA,
  agri: AGRI_KHATA,
  bookstore: BOOKSTORE_KHATA,
  hotel: HOTEL_KHATA,
  salon: SALON_KHATA,
};

/**
 * Get khata presets for the current industry, with fallback to generic.
 */
export function getIndustryKhataPresets(industryId?: string | null): IndustryKhataPresets {
  if (industryId && INDUSTRY_KHATA_PRESETS[industryId]) {
    return INDUSTRY_KHATA_PRESETS[industryId];
  }
  return GENERIC_KHATA;
}
