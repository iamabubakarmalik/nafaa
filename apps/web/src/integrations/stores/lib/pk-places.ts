/**
 * Pakistan provinces and their main cities, for the shipping zone editor.
 * Names are written the way couriers and customers spell them; the storefront
 * checkout uses the same spelling so a zone matches the city a buyer picks.
 */

export interface Province {
  code: string;
  name: string;
  cities: string[];
}

export const PROVINCES: Province[] = [
  {
    code: 'PB', name: 'Punjab', cities: [
      'Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 'Bahawalpur', 'Sargodha', 'Sheikhupura',
      'Jhang', 'Rahim Yar Khan', 'Gujrat', 'Kasur', 'Sahiwal', 'Okara', 'Wah Cantt', 'Dera Ghazi Khan', 'Chiniot',
      'Kamoke', 'Mandi Bahauddin', 'Jhelum', 'Sadiqabad', 'Khanewal', 'Hafizabad', 'Muzaffargarh', 'Khanpur',
      'Attock', 'Chakwal', 'Mianwali', 'Bhakkar', 'Vehari', 'Pakpattan', 'Narowal', 'Toba Tek Singh', 'Layyah',
      'Lodhran', 'Burewala', 'Kharian', 'Murree', 'Taxila',
    ],
  },
  {
    code: 'SD', name: 'Sindh', cities: [
      'Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Mirpur Khas', 'Jacobabad', 'Shikarpur', 'Khairpur',
      'Dadu', 'Thatta', 'Badin', 'Tando Allahyar', 'Tando Adam', 'Umerkot', 'Ghotki', 'Sanghar', 'Kotri',
    ],
  },
  {
    code: 'KP', name: 'Khyber Pakhtunkhwa', cities: [
      'Peshawar', 'Mardan', 'Abbottabad', 'Mingora', 'Kohat', 'Dera Ismail Khan', 'Mansehra', 'Swabi', 'Nowshera',
      'Charsadda', 'Bannu', 'Haripur', 'Chitral', 'Batkhela', 'Timergara', 'Karak',
    ],
  },
  {
    code: 'BA', name: 'Balochistan', cities: [
      'Quetta', 'Turbat', 'Khuzdar', 'Hub', 'Chaman', 'Gwadar', 'Sibi', 'Zhob', 'Loralai', 'Dera Murad Jamali',
    ],
  },
  { code: 'IS', name: 'Islamabad', cities: ['Islamabad'] },
  { code: 'GB', name: 'Gilgit-Baltistan', cities: ['Gilgit', 'Skardu', 'Hunza', 'Ghizer'] },
  { code: 'AJK', name: 'Azad Kashmir', cities: ['Muzaffarabad', 'Mirpur', 'Kotli', 'Bhimber', 'Rawalakot', 'Bagh'] },
];

export const ALL_CITIES: string[] = PROVINCES.flatMap((p) => p.cities).sort((a, b) => a.localeCompare(b));

export const provinceName = (code: string) => PROVINCES.find((p) => p.code === code)?.name ?? code;
