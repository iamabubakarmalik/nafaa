import { apiClient } from '@core/api/client';

export interface ToyBirthdayReminder {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  childName: string;
  childBirthDate: string;
  childGender?: string;
  childInterests: string[];
  parentRelation?: string;
  favoriteCategories: string[];
  budgetRange?: string;
  reminderDaysBefore: number;
  isActive: boolean;
  lastReminderSent?: string;
  lastPurchaseDate?: string;
  lastGiftGiven?: string;
  totalPurchases: number;
  totalSpent: number;
  notes?: string;
  computed?: {
    currentAge: number;
    daysUntilBirthday: number;
    turningAge: number;
    shouldRemindNow?: boolean;
    avgSpend?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GiftSuggestions {
  child: { name: string; turningAge: number; gender?: string; interests: string[] };
  budgetCeiling: number | null;
  lastGiftGiven?: string;
  matchedAgeGroups: string[];
  products: any[];
  giftPacks: any[];
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const toyBirthdaysApi = {
  create: (data: Partial<ToyBirthdayReminder>) =>
    apiClient.post('/toystore/birthday-reminders', data).then(unwrap<ToyBirthdayReminder>),

  list: (params?: { active?: boolean; customerId?: string; gender?: string; search?: string }) =>
    apiClient.get('/toystore/birthday-reminders', { params }).then(unwrap<ToyBirthdayReminder[]>),

  upcoming: (days = 30) =>
    apiClient.get('/toystore/birthday-reminders/upcoming', { params: { days } }).then(unwrap<ToyBirthdayReminder[]>),

  summary: () => apiClient.get('/toystore/birthday-reminders/summary').then(unwrap<any>),

  getOne: (id: string) =>
    apiClient.get('/toystore/birthday-reminders/' + id).then(unwrap<ToyBirthdayReminder>),

  giftSuggestions: (id: string, limit = 12) =>
    apiClient.get('/toystore/birthday-reminders/' + id + '/gift-suggestions', { params: { limit } }).then(unwrap<GiftSuggestions>),

  update: (id: string, data: Partial<ToyBirthdayReminder>) =>
    apiClient.patch('/toystore/birthday-reminders/' + id, data).then(unwrap<ToyBirthdayReminder>),

  recordPurchase: (id: string, data: { giftDescription: string; amount: number; purchaseDate?: string }) =>
    apiClient.post('/toystore/birthday-reminders/' + id + '/record-purchase', data).then(unwrap<ToyBirthdayReminder>),

  markReminderSent: (id: string) =>
    apiClient.post('/toystore/birthday-reminders/' + id + '/mark-reminder-sent').then(unwrap<ToyBirthdayReminder>),

  remove: (id: string) =>
    apiClient.delete('/toystore/birthday-reminders/' + id).then(unwrap),
};
