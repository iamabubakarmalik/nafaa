/** Industry: Hotel & Guest House (/industries/hotel). Imported from apps/marketing and checked against the app. */
import { industry } from './_industry';

export default industry({
  slug: "hotel",
  title: "Hotel & Guest House",
  shortName: "Hotel",
  shopNoun: "hotels and guest houses",
  romanUrduName: "Hotel / guest house",
  group: "service",
  icon: "hotel",
  color: "#4f46e5",
  appIndustryKey: "hotel",
  businessType: "HOTEL",
  sortOrder: 15,
  summary:
    "Nafaa runs hotels, guest houses, motels and resorts: a room board, bookings and guests, housekeeping, room types, seasonal and weekend rates, extra charges posted to the room bill, and a night audit report, with billing and khata built in. It runs in the browser on a phone, tablet or computer.",
  builtFor: "Hotels, guest houses, motels and resorts",
  romanUrdu:
    "Hotel aur guest house ke liye: room board, booking, guests, housekeeping, season ke rate, room bill par extra charges aur night audit.",
  features: [
    { icon: "bed", title: "Room board", body: "Every room's status at a glance." },
    { icon: "calendar-check", title: "Bookings", body: "Take and change bookings." },
    { icon: "users", title: "Guests", body: "Guest records and stays." },
    { icon: "sparkles", title: "Housekeeping", body: "Cleaning and maintenance of rooms." },
    { icon: "calendar-clock", title: "Seasonal rates", body: "Seasonal, weekend and peak rates." },
    { icon: "receipt-text", title: "Room bill", body: "Post food, laundry and minibar charges to the room bill." },
  ],
  faqKeys: ["offline","pricing"],
  evidence: ["apps/web/src/industries/hotel/HotelPack.tsx"],
  dropped: [
  ],
});
