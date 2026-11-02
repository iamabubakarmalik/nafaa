import { Award, BarChart3, Bed, CalendarDays, CalendarPlus, Home, LayoutDashboard, Sparkle, Users } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { useIsHotelBusiness } from './hooks/useIsHotelBusiness';

import HotelDashboard from './dashboard/HotelDashboard';
import RoomTypesPage from './pages/RoomTypesPage';
import RoomsPage from './pages/RoomsPage';
import GuestsPage from './pages/GuestsPage';
import GuestDetailPage from './pages/GuestDetailPage';
import BookingsPage from './pages/BookingsPage';
import NewBookingPage from './pages/NewBookingPage';
import HotelBookingDetailPage from './pages/HotelBookingDetailPage';
import HousekeepingPage from './pages/HousekeepingPage';
import HotelRoomTypeWizardPage from './pages/HotelRoomTypeWizardPage';
import HotelRoomTypeDetailPage from './pages/HotelRoomTypeDetailPage';
import RatePlansPage from './pages/RatePlansPage';
import HotelReportsPage from './pages/HotelReportsPage';
import { t } from '@core/i18n';

/**
 * Hotel / Guest House / Motel / Resort industry pack.
 */
export const HotelPack: IndustryPack = {
  id: 'hotel',
  name: 'Hotel / Guest House',
  shortName: t('Hotel'),
  emoji: '🏨',
  description:
    t('Rooms, bookings, guests, housekeeping, folio & rate plans — for hotels, guest houses, motels & resorts.'),
  priority: 75,

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    if (type) {
      return (
        type.includes('HOTEL') ||
        type.includes('GUEST_HOUSE') ||
        type.includes('GUESTHOUSE') ||
        type.includes('MOTEL') ||
        type.includes('RESORT') ||
        type.includes('LODGE') ||
        type.includes('INN') ||
        type.includes('HOSTEL')
      );
    }
    const features = (tenant.businessFeatures ?? {}) as Record<string, boolean>;
    return features.hotelMode === true || features.rooms === true;
  },

  navGroups: [
    {
      label: t('Hotel'),
      icon: Bed,
      emoji: '🏨',
      color: '#4f46e5',
      order: 20,
      items: [
        { to: '/hotel/bookings/new', label: t('New booking'), icon: CalendarPlus, badge: t('FAST') },
        { to: '/hotel/dashboard', label: t('Hotel dashboard'), icon: LayoutDashboard },
        { to: '/hotel/rooms', label: t('Room board'), icon: Home },
        { to: '/hotel/bookings', label: t('Bookings'), icon: CalendarDays },
        { to: '/hotel/guests', label: t('Guests'), icon: Users },
        { to: '/hotel/housekeeping', label: t('Housekeeping'), icon: Sparkle },
        { to: '/hotel/room-types', label: t('Room types'), icon: Bed },
        { to: '/hotel/rate-plans', label: t('Season rates'), icon: Award },
        { to: '/hotel/reports', label: t('Night audit'), icon: BarChart3 },
      ],
    },
  ],

  // Specific paths before dynamic ones.
  routes: [
    { path: '/hotel-room-types/new', element: HotelRoomTypeWizardPage },
    { path: '/hotel-room-types/:id/edit', element: HotelRoomTypeWizardPage },
    { path: '/hotel-room-types/:id', element: HotelRoomTypeDetailPage },
    { path: '/hotel', element: HotelDashboard },
    { path: '/hotel/dashboard', element: HotelDashboard },
    { path: '/hotel/room-types', element: RoomTypesPage },
    { path: '/hotel/rooms', element: RoomsPage },
    { path: '/hotel/guests/:id', element: GuestDetailPage },
    { path: '/hotel/guests', element: GuestsPage },
    { path: '/hotel/bookings/new', element: NewBookingPage },
    { path: '/hotel/bookings/:id', element: HotelBookingDetailPage },
    { path: '/hotel/bookings', element: BookingsPage },
    { path: '/hotel/housekeeping', element: HousekeepingPage },
    { path: '/hotel/rate-plans', element: RatePlansPage },
    { path: '/hotel/reports', element: HotelReportsPage },
  ],

  dashboardComponent: HotelDashboard,

  featureFlags: [
    {
      key: 'hotelHousekeeping',
      label: t('Housekeeping Tasks'),
      description: t('Enable room cleaning & maintenance workflow'),
      defaultEnabled: true,
    },
    {
      key: 'hotelFolio',
      label: t('Folio Charges'),
      description: t('Post extra charges to room bills (F&B, laundry, minibar)'),
      defaultEnabled: true,
    },
    {
      key: 'hotelRatePlans',
      label: t('Rate Plans'),
      description: t('Seasonal / weekend / peak pricing rules'),
      defaultEnabled: false,
    },
  ],
};

export { useIsHotelBusiness };
