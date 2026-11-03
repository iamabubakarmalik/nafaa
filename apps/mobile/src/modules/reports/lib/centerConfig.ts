/** What each industry adds to the report centre: its own tab and renamed sections. Same set as the web report centre. */

import { msg } from '@/core/i18n';
import type { SectionId } from '../api/center';

export interface CenterConfig { industry?: { kind: string; label: string }; labels?: Partial<Record<SectionId, string>> }

export const CENTER_CONFIG: Record<string, CenterConfig> = {
  restaurant: { labels: { items: msg('Dishes') }, industry: { kind: 'restaurant', label: msg('Restaurant') } },
  clinic: { labels: { items: msg('Services') }, industry: { kind: 'clinic', label: msg('Clinic') } },
  gym: { industry: { kind: 'gym', label: msg('Gym') } },
  jewelry: { industry: { kind: 'jewelry', label: msg('Sona chandi') } },
  mobile: { industry: { kind: 'mobile', label: msg('Mobile') } },
  carpet: { industry: { kind: 'carpet', label: msg('Carpet') } },
  pharmacy: { labels: { items: msg('Dawaiyan') }, industry: { kind: 'pharmacy', label: msg('Pharmacy') } },
  bakery: { industry: { kind: 'bakery', label: msg('Bakery') } },
  agri: { industry: { kind: 'agri', label: msg('Kheti') } },
  garments: { industry: { kind: 'garments', label: msg('Kapre') } },
  electronics: { industry: { kind: 'electronics', label: msg('Electronics') } },
  appliances: { industry: { kind: 'appliances', label: msg('Appliances') } },
  hardware: { industry: { kind: 'hardware', label: msg('Projects') } },
  dairy: { industry: { kind: 'dairy', label: msg('Dairy') } },
  meat: { industry: { kind: 'meat', label: msg('Gosht') } },
  autoparts: { industry: { kind: 'autoparts', label: msg('Workshop') } },
  bookstore: { industry: { kind: 'bookstore', label: msg('Kitabein') } },
  'services-biz': { labels: { items: msg('Services') }, industry: { kind: 'services-biz', label: msg('Jobs') } },
};
