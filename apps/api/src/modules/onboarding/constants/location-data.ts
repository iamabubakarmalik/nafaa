export interface CityInfo {
  name: string;
  province: string;
  provinceLabel: string;
  timezone: string;
  isMajor: boolean;
}

export const PAKISTAN_CITIES: CityInfo[] = [
  // Punjab
  { name: 'Lahore', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Faisalabad', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Rawalpindi', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Gujranwala', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Multan', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Sialkot', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Bahawalpur', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Sargodha', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Sheikhupura', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Jhang', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Gujrat', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Kasur', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Rahim Yar Khan', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Sahiwal', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Okara', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Dera Ghazi Khan', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Chiniot', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Kamoke', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Attock', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Muzaffargarh', province: 'PUNJAB', provinceLabel: 'Punjab', timezone: 'Asia/Karachi', isMajor: false },

  // Sindh
  { name: 'Karachi', province: 'SINDH', provinceLabel: 'Sindh', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Hyderabad', province: 'SINDH', provinceLabel: 'Sindh', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Sukkur', province: 'SINDH', provinceLabel: 'Sindh', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Larkana', province: 'SINDH', provinceLabel: 'Sindh', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Mirpur Khas', province: 'SINDH', provinceLabel: 'Sindh', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Nawabshah', province: 'SINDH', provinceLabel: 'Sindh', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Jacobabad', province: 'SINDH', provinceLabel: 'Sindh', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Shikarpur', province: 'SINDH', provinceLabel: 'Sindh', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Khairpur', province: 'SINDH', provinceLabel: 'Sindh', timezone: 'Asia/Karachi', isMajor: false },

  // KPK
  { name: 'Peshawar', province: 'KPK', provinceLabel: 'Khyber Pakhtunkhwa', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Mardan', province: 'KPK', provinceLabel: 'Khyber Pakhtunkhwa', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Mingora', province: 'KPK', provinceLabel: 'Khyber Pakhtunkhwa', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Abbottabad', province: 'KPK', provinceLabel: 'Khyber Pakhtunkhwa', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Kohat', province: 'KPK', provinceLabel: 'Khyber Pakhtunkhwa', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Dera Ismail Khan', province: 'KPK', provinceLabel: 'Khyber Pakhtunkhwa', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Swabi', province: 'KPK', provinceLabel: 'Khyber Pakhtunkhwa', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Nowshera', province: 'KPK', provinceLabel: 'Khyber Pakhtunkhwa', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Charsadda', province: 'KPK', provinceLabel: 'Khyber Pakhtunkhwa', timezone: 'Asia/Karachi', isMajor: false },

  // Balochistan
  { name: 'Quetta', province: 'BALOCHISTAN', provinceLabel: 'Balochistan', timezone: 'Asia/Karachi', isMajor: true },
  { name: 'Turbat', province: 'BALOCHISTAN', provinceLabel: 'Balochistan', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Khuzdar', province: 'BALOCHISTAN', provinceLabel: 'Balochistan', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Gwadar', province: 'BALOCHISTAN', provinceLabel: 'Balochistan', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Chaman', province: 'BALOCHISTAN', provinceLabel: 'Balochistan', timezone: 'Asia/Karachi', isMajor: false },

  // ICT
  { name: 'Islamabad', province: 'ICT', provinceLabel: 'Islamabad Capital Territory', timezone: 'Asia/Karachi', isMajor: true },

  // AJK
  { name: 'Muzaffarabad', province: 'AJK', provinceLabel: 'Azad Jammu & Kashmir', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Mirpur', province: 'AJK', provinceLabel: 'Azad Jammu & Kashmir', timezone: 'Asia/Karachi', isMajor: false },

  // GB
  { name: 'Gilgit', province: 'GB', provinceLabel: 'Gilgit-Baltistan', timezone: 'Asia/Karachi', isMajor: false },
  { name: 'Skardu', province: 'GB', provinceLabel: 'Gilgit-Baltistan', timezone: 'Asia/Karachi', isMajor: false },

  // Fallback
  { name: 'Other', province: '', provinceLabel: '', timezone: 'Asia/Karachi', isMajor: false },
];

/** Get province from city name (case-insensitive) */
export function getCityInfo(cityName: string): CityInfo | null {
  const normalized = cityName.trim().toLowerCase();
  return PAKISTAN_CITIES.find((c) => c.name.toLowerCase() === normalized) || null;
}

/** Get all cities in a province */
export function getCitiesByProvince(province: string): CityInfo[] {
  return PAKISTAN_CITIES.filter((c) => c.province === province);
}

/** Get major cities only (for quick selection) */
export function getMajorCities(): CityInfo[] {
  return PAKISTAN_CITIES.filter((c) => c.isMajor);
}
