import {
  LayoutDashboard,
  Bed,
  Home,
  Calendar,
  Sparkles,
  Users,
  Sparkle,
  Award,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { useIsHotelBusiness } from './hooks/useIsHotelBusiness';

// ── Pages ─────────────────────────────────────────────────────
import HotelDashboardPage from './pages/HotelDashboardPage';
import RoomTypesPage from './pages/RoomTypesPage';
import RoomsPage from './pages/RoomsPage';
import GuestsPage from './pages/GuestsPage';
import BookingsPage from './pages/BookingsPage';
import NewBookingPage from './pages/NewBookingPage';
import HotelBookingDetailPage from './pages/HotelBookingDetailPage';
import HousekeepingPage from './pages/HousekeepingPage';
import HotelRoomTypeWizardPage from './pages/HotelRoomTypeWizardPage';
import HotelRoomTypeDetailPage from './pages/HotelRoomTypeDetailPage';

// ── Extensions ────────────────────────────────────────────────
import { HotelPosCheckoutExtension } from './pos-extensions/HotelPosCheckoutExtension';
import { HotelGuestExtension } from './customer-form/HotelGuestExtension';

/**
 * Hotel / Guest House / Motel / Resort industry pack.
 */
export const HotelPack: IndustryPack = {
  id: 'hotel',
  name: 'Hotel / Guest House',
  shortName: 'Hotel',
  emoji: '🏨',
  themeColor: '#4f46e5',
  description:
    'Rooms, bookings, guests, housekeeping, folio & rate plans — for hotels, guest houses, motels & resorts.',
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
      label: 'Hotel',
      icon: Bed,
      emoji: '🏨',
      color: '#4f46e5',
      order: 20,
      items: [
        { to: '/hotel-room-types/new', label: '+ Add Room Type', icon: Sparkles, badge: 'FAST' },
        { to: '/hotel/dashboard', label: 'Hotel Dashboard', icon: LayoutDashboard },
        { to: '/hotel/room-types', label: 'Room Types', icon: Bed },
        { to: '/hotel/rooms', label: 'Rooms', icon: Home },
        { to: '/hotel/bookings', label: 'Bookings', icon: Calendar },
        { to: '/hotel/bookings/new', label: 'New Booking', icon: Sparkles },
        { to: '/hotel/guests', label: 'Guests', icon: Users },
        { to: '/hotel/housekeeping', label: 'Housekeeping', icon: Sparkle },
        { to: '/hotel/rate-plans', label: 'Rate Plans', icon: Award },
      ],
    },
  ],

  // Order matters — put more specific paths BEFORE dynamic ones.
  routes: [
    // Wizard + Detail — highest priority room-type routes
    { path: '/hotel-room-types/new', element: HotelRoomTypeWizardPage },
    { path: '/hotel-room-types/:id/edit', element: HotelRoomTypeWizardPage },
    { path: '/hotel-room-types/:id', element: HotelRoomTypeDetailPage },

    // Existing pages
    { path: '/hotel', element: HotelDashboardPage },
    { path: '/hotel/dashboard', element: HotelDashboardPage },
    { path: '/hotel/room-types', element: RoomTypesPage },
    { path: '/hotel/rooms', element: RoomsPage },
    { path: '/hotel/guests', element: GuestsPage },
    { path: '/hotel/bookings/new', element: NewBookingPage },
    { path: '/hotel/bookings/:id', element: HotelBookingDetailPage },
    { path: '/hotel/bookings', element: BookingsPage },
    { path: '/hotel/housekeeping', element: HousekeepingPage },
  ],

  dashboardComponent: HotelDashboardPage,

  pos: {
    checkoutExtension: HotelPosCheckoutExtension,
  },

  customerForm: {
    extraFields: HotelGuestExtension,
  },

  featureFlags: [
    {
      key: 'hotelHousekeeping',
      label: 'Housekeeping Tasks',
      description: 'Enable room cleaning & maintenance workflow',
      defaultEnabled: true,
    },
    {
      key: 'hotelFolio',
      label: 'Folio Charges',
      description: 'Post extra charges to room bills (F&B, laundry, minibar)',
      defaultEnabled: true,
    },
    {
      key: 'hotelRatePlans',
      label: 'Rate Plans',
      description: 'Seasonal / weekend / peak pricing rules',
      defaultEnabled: false,
    },
  ],
};

export { useIsHotelBusiness };
