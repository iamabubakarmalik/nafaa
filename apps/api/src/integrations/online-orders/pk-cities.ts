/**
 * Pakistani cities with their position, and a matcher that turns what a
 * customer, a channel or a courier writes ("Lhr", "LHE", "Lahore Cantt",
 * "DHA Phase 5, Karachi", "Peshawer") into one city. Used by the parcel
 * map, the courier scorecard and the automation city condition.
 *
 * Positions are city centres rounded to two decimals; good enough to place a
 * bubble on a country map, not for routing.
 */

export type Province = 'PB' | 'SD' | 'KP' | 'BA' | 'IS' | 'GB' | 'AJK';

export interface PkCity {
  name: string;
  lat: number;
  lng: number;
  province: Province;
}

type Row = [name: string, lat: number, lng: number, province: Province, aliases?: string];

// Larger cities first: when a fuzzy match ties, the bigger city wins.
const ROWS: Row[] = [
  ['Karachi', 24.86, 67.01, 'SD', 'khi|krachi|karachi city|karanchi|khi south|khi east|khi west|khi central'],
  ['Lahore', 31.55, 74.34, 'PB', 'lhr|lhe|lahor|lahoure|lhore'],
  ['Faisalabad', 31.42, 73.08, 'PB', 'fsd|lyp|lyallpur|faisal abad|faislabad|fbd'],
  ['Rawalpindi', 33.6, 73.04, 'PB', 'rwp|pindi|rawal pindi|rawlpindi|rwl'],
  ['Islamabad', 33.69, 73.05, 'IS', 'isb|isl|islambad|islamabad capital territory|ict'],
  ['Gujranwala', 32.16, 74.19, 'PB', 'grw|gujranwal|gujrawala|gjw'],
  ['Multan', 30.2, 71.47, 'PB', 'mux|mltn|mul'],
  ['Hyderabad', 25.4, 68.37, 'SD', 'hyd|hdd|hyderabad sindh'],
  ['Peshawar', 34.01, 71.58, 'KP', 'psh|pew|pesh|peshawer|pishawar|pesawar'],
  ['Quetta', 30.18, 66.98, 'BA', 'qta|uet|queta|kwetta'],
  ['Sialkot', 32.49, 74.53, 'PB', 'skt|sialkoot|sial kot'],
  ['Bahawalpur', 29.4, 71.68, 'PB', 'bwp|bhv|bahawal pur|bhawalpur'],
  ['Sargodha', 32.08, 72.67, 'PB', 'sgd|sargoda'],
  ['Sukkur', 27.7, 68.86, 'SD', 'skz|sukker|sakhar'],
  ['Larkana', 27.56, 68.21, 'SD', 'lrk|larkano'],
  ['Sheikhupura', 31.71, 73.98, 'PB', 'skp|shekhupura|sheikhpura'],
  ['Rahim Yar Khan', 28.42, 70.3, 'PB', 'ryk|rahimyar khan|r y khan|rahim yaar khan'],
  ['Jhang', 31.27, 72.32, 'PB', 'jhang sadar'],
  ['Dera Ghazi Khan', 30.05, 70.63, 'PB', 'dgk|dg khan|d g khan|dera ghazi|dea'],
  ['Gujrat', 32.57, 74.08, 'PB', 'gjt|gujrat city'],
  ['Sahiwal', 30.66, 73.11, 'PB', 'swl|montgomery'],
  ['Wah Cantt', 33.8, 72.7, 'PB', 'wah|wah cantonment'],
  ['Mardan', 34.2, 72.04, 'KP', 'mdn'],
  ['Kasur', 31.12, 74.45, 'PB', 'qasur'],
  ['Okara', 30.81, 73.45, 'PB'],
  ['Mingora', 34.78, 72.36, 'KP', 'swat|saidu sharif|saidu|mingawara'],
  ['Nawabshah', 26.25, 68.41, 'SD', 'shaheed benazirabad|benazirabad|nawab shah|sbd'],
  ['Chiniot', 31.72, 72.98, 'PB'],
  ['Kotri', 25.37, 68.31, 'SD'],
  ['Kamoke', 31.97, 74.22, 'PB', 'kamoki'],
  ['Hafizabad', 32.07, 73.69, 'PB'],
  ['Sadiqabad', 28.31, 70.13, 'PB', 'sadiq abad'],
  ['Mirpur Khas', 25.53, 69.01, 'SD', 'mirpurkhas|mpk'],
  ['Burewala', 30.17, 72.65, 'PB'],
  ['Kohat', 33.58, 71.44, 'KP'],
  ['Khanewal', 30.3, 71.93, 'PB'],
  ['Dera Ismail Khan', 31.83, 70.9, 'KP', 'dik|di khan|d i khan|dera ismail|dsk'],
  ['Turbat', 26.0, 63.04, 'BA', 'kech|tuk'],
  ['Muzaffargarh', 30.07, 71.19, 'PB', 'muzafargarh|mzg'],
  ['Abbottabad', 34.15, 73.21, 'KP', 'abbotabad|abtabad|atd|abbottabad city'],
  ['Mandi Bahauddin', 32.58, 73.49, 'PB', 'mbdin|m b din|mandi bahaudin|mandi baha ud din'],
  ['Shikarpur', 27.96, 68.64, 'SD'],
  ['Jacobabad', 28.28, 68.44, 'SD', 'jacob abad'],
  ['Jhelum', 32.93, 73.73, 'PB', 'jhlm'],
  ['Khanpur', 28.65, 70.66, 'PB', 'khan pur'],
  ['Khairpur', 27.53, 68.76, 'SD', 'khairpur mirs'],
  ['Khuzdar', 27.8, 66.61, 'BA'],
  ['Pakpattan', 30.34, 73.39, 'PB', 'pak pattan'],
  ['Hub', 25.05, 66.89, 'BA', 'hub chowki|hub city'],
  ['Daska', 32.32, 74.35, 'PB'],
  ['Gojra', 31.15, 72.69, 'PB'],
  ['Dadu', 26.73, 67.78, 'SD'],
  ['Muridke', 31.8, 74.26, 'PB'],
  ['Bahawalnagar', 29.99, 73.25, 'PB', 'bahawal nagar'],
  ['Samundri', 31.06, 72.95, 'PB', 'samundari'],
  ['Tando Allahyar', 25.46, 68.72, 'SD', 'tando allah yar'],
  ['Tando Adam', 25.77, 68.66, 'SD'],
  ['Jaranwala', 31.33, 73.42, 'PB'],
  ['Chishtian', 29.8, 72.86, 'PB'],
  ['Muzaffarabad', 34.37, 73.47, 'AJK', 'mzd|muzafarabad'],
  ['Attock', 33.77, 72.36, 'PB', 'campbellpur'],
  ['Vehari', 30.04, 72.35, 'PB'],
  ['Kot Addu', 30.47, 70.97, 'PB'],
  ['Wazirabad', 32.44, 74.12, 'PB'],
  ['Mianwali', 32.58, 71.54, 'PB'],
  ['Kamalia', 30.73, 72.65, 'PB'],
  ['Chakwal', 32.93, 72.86, 'PB'],
  ['Nowshera', 34.02, 71.98, 'KP', 'nowshehra|naushera'],
  ['Swabi', 34.12, 72.47, 'KP'],
  ['Charsadda', 34.15, 71.73, 'KP'],
  ['Mansehra', 34.33, 73.2, 'KP', 'manshera'],
  ['Bannu', 32.99, 70.6, 'KP'],
  ['Haripur', 33.99, 72.93, 'KP'],
  ['Toba Tek Singh', 30.97, 72.48, 'PB', 'tts|toba|toba tek sing'],
  ['Narowal', 32.1, 74.87, 'PB'],
  ['Layyah', 30.96, 70.94, 'PB', 'leiah'],
  ['Lodhran', 29.54, 71.63, 'PB'],
  ['Bhakkar', 31.63, 71.07, 'PB'],
  ['Rajanpur', 29.1, 70.33, 'PB'],
  ['Nankana Sahib', 31.45, 73.71, 'PB', 'nankana'],
  ['Arifwala', 30.29, 73.07, 'PB'],
  ['Mian Channu', 30.44, 72.35, 'PB', 'mianchannu'],
  ['Taxila', 33.75, 72.8, 'PB'],
  ['Murree', 33.91, 73.39, 'PB', 'mari'],
  ['Pattoki', 31.02, 73.85, 'PB'],
  ['Kharian', 32.81, 73.86, 'PB'],
  ['Khushab', 32.3, 72.35, 'PB'],
  ['Gujar Khan', 33.25, 73.3, 'PB', 'gujjar khan'],
  ['Hasilpur', 29.69, 72.55, 'PB'],
  ['Chichawatni', 30.53, 72.69, 'PB'],
  ['Ahmedpur East', 29.14, 71.26, 'PB', 'ahmadpur east|ahmedpur sharqia|ahmed pur east'],
  ['Shakargarh', 32.26, 75.16, 'PB'],
  ['Talagang', 32.93, 72.42, 'PB'],
  ['Pind Dadan Khan', 32.59, 73.04, 'PB', 'pd khan'],
  ['Fateh Jang', 33.56, 72.64, 'PB'],
  ['Renala Khurd', 30.88, 73.6, 'PB', 'renala'],
  ['Depalpur', 30.67, 73.65, 'PB', 'dipalpur'],
  ['Jauharabad', 32.29, 72.28, 'PB'],
  ['Shorkot', 30.83, 72.07, 'PB'],
  ['Haroonabad', 29.61, 73.14, 'PB'],
  ['Fort Abbas', 29.19, 72.85, 'PB'],
  ['Yazman', 29.12, 71.74, 'PB'],
  ['Liaquatpur', 28.93, 70.95, 'PB', 'liaqatpur|liaquat pur'],
  ['Jampur', 29.64, 70.6, 'PB'],
  ['Taunsa', 30.7, 70.65, 'PB', 'taunsa sharif'],
  ['Alipur', 29.38, 70.91, 'PB'],
  ['Bhalwal', 32.27, 72.9, 'PB'],
  ['Sambrial', 32.48, 74.35, 'PB'],
  ['Pasrur', 32.26, 74.66, 'PB'],
  ['Phalia', 32.43, 73.58, 'PB'],
  ['Raiwind', 31.25, 74.22, 'PB'],
  ['Sangla Hill', 31.72, 73.38, 'PB'],
  ['Tandlianwala', 31.03, 73.13, 'PB'],
  ['Chunian', 30.96, 73.98, 'PB'],
  ['Kot Momin', 32.19, 73.03, 'PB'],
  ['Badin', 24.66, 68.84, 'SD'],
  ['Thatta', 24.75, 67.92, 'SD'],
  ['Umerkot', 25.36, 69.74, 'SD', 'umarkot'],
  ['Ghotki', 28.01, 69.32, 'SD'],
  ['Kandhkot', 28.24, 69.18, 'SD'],
  ['Kashmore', 28.43, 69.58, 'SD'],
  ['Sanghar', 26.05, 68.95, 'SD'],
  ['Matiari', 25.6, 68.45, 'SD'],
  ['Jamshoro', 25.43, 68.28, 'SD'],
  ['Tando Muhammad Khan', 25.12, 68.54, 'SD', 'tando mohammad khan|tmk'],
  ['Mithi', 24.74, 69.8, 'SD', 'tharparkar'],
  ['Moro', 26.66, 68.0, 'SD'],
  ['Mehar', 27.18, 67.82, 'SD'],
  ['Hala', 25.81, 68.42, 'SD'],
  ['Shahdadpur', 25.93, 68.62, 'SD'],
  ['Daharki', 28.04, 69.7, 'SD'],
  ['Sehwan', 26.42, 67.86, 'SD', 'sehwan sharif'],
  ['Kambar', 27.59, 68.0, 'SD', 'qambar'],
  ['Rohri', 27.69, 68.9, 'SD'],
  ['Timergara', 34.83, 71.84, 'KP', 'lower dir'],
  ['Batkhela', 34.62, 71.97, 'KP', 'malakand'],
  ['Chitral', 35.85, 71.79, 'KP'],
  ['Karak', 33.12, 71.09, 'KP'],
  ['Lakki Marwat', 32.61, 70.91, 'KP'],
  ['Tank', 32.22, 70.38, 'KP'],
  ['Hangu', 33.53, 71.06, 'KP'],
  ['Parachinar', 33.9, 70.1, 'KP', 'kurram'],
  ['Battagram', 34.68, 73.02, 'KP'],
  ['Dir', 35.21, 71.88, 'KP', 'upper dir'],
  ['Daggar', 34.5, 72.48, 'KP', 'buner'],
  ['Alpuri', 34.9, 72.65, 'KP', 'shangla'],
  ['Landi Kotal', 34.1, 71.15, 'KP', 'khyber'],
  ['Risalpur', 34.06, 71.99, 'KP'],
  ['Takht-i-Bahi', 34.29, 71.95, 'KP', 'takht bhai|takhtbhai'],
  ['Topi', 34.07, 72.62, 'KP'],
  ['Havelian', 34.05, 73.16, 'KP'],
  ['Gwadar', 25.12, 62.33, 'BA', 'gwd'],
  ['Chaman', 30.92, 66.45, 'BA'],
  ['Sibi', 29.54, 67.88, 'BA'],
  ['Zhob', 31.34, 69.45, 'BA'],
  ['Loralai', 30.37, 68.6, 'BA'],
  ['Dera Murad Jamali', 28.55, 68.22, 'BA', 'dm jamali|nasirabad'],
  ['Dera Allah Yar', 28.37, 68.35, 'BA', 'jhatpat|jaffarabad'],
  ['Usta Mohammad', 28.18, 68.04, 'BA', 'usta muhammad'],
  ['Kalat', 29.03, 66.59, 'BA'],
  ['Mastung', 29.8, 66.85, 'BA'],
  ['Pishin', 30.58, 67.0, 'BA'],
  ['Nushki', 29.55, 66.02, 'BA'],
  ['Kharan', 28.58, 65.42, 'BA'],
  ['Panjgur', 26.97, 64.1, 'BA'],
  ['Pasni', 25.26, 63.47, 'BA'],
  ['Ormara', 25.21, 64.64, 'BA'],
  ['Uthal', 25.81, 66.62, 'BA', 'lasbela'],
  ['Bela', 26.23, 66.31, 'BA'],
  ['Dalbandin', 28.89, 64.41, 'BA', 'chagai'],
  ['Qila Saifullah', 30.7, 68.36, 'BA', 'killa saifullah'],
  ['Ziarat', 30.38, 67.73, 'BA'],
  ['Kohlu', 29.9, 69.25, 'BA'],
  ['Dera Bugti', 29.03, 69.15, 'BA'],
  ['Barkhan', 29.9, 69.52, 'BA'],
  ['Gilgit', 35.92, 74.31, 'GB', 'gil'],
  ['Skardu', 35.3, 75.63, 'GB', 'kdu|baltistan'],
  ['Aliabad', 36.32, 74.67, 'GB', 'hunza|karimabad'],
  ['Chilas', 35.42, 74.1, 'GB', 'diamer'],
  ['Gahkuch', 36.17, 73.77, 'GB', 'ghizer'],
  ['Khaplu', 35.15, 76.33, 'GB', 'ghanche'],
  ['Astore', 35.37, 74.86, 'GB'],
  ['Mirpur', 33.15, 73.75, 'AJK', 'mirpur ajk|new mirpur|mirpur azad kashmir'],
  ['Kotli', 33.52, 73.9, 'AJK'],
  ['Bhimber', 32.97, 74.08, 'AJK'],
  ['Rawalakot', 33.86, 73.76, 'AJK', 'poonch'],
  ['Bagh', 33.98, 73.78, 'AJK'],
  ['Pallandri', 33.71, 73.69, 'AJK', 'sudhnoti'],
  ['Hattian Bala', 34.17, 73.74, 'AJK', 'hattian'],
  ['Athmuqam', 34.58, 73.91, 'AJK', 'neelum'],
  ['Dadyal', 33.4, 73.68, 'AJK'],
];

export const PK_CITIES: PkCity[] = ROWS.map(([name, lat, lng, province]) => ({ name, lat, lng, province }));

/** Words that say nothing about which city: areas, cantonments, provinces, the country. */
const NOISE = new Set([
  'city', 'cantt', 'cant', 'cantonment', 'district', 'distt', 'dist', 'tehsil', 'pakistan', 'pk', 'pak',
  'punjab', 'sindh', 'sind', 'kpk', 'kp', 'khyber pakhtunkhwa', 'balochistan', 'baluchistan', 'gpo', 'main', 'sadar', 'saddar',
]);

/** Lowercase words, dots and punctuation gone ("D.I. Khan" → "d i khan"). */
/** City names that are also everyday words ("water tank", "Shalimar Bagh"); they count only as a whole part, never inside a longer text. */
const PLAIN_WORDS = new Set(['tank', 'bagh', 'hub', 'dir', 'hala', 'moro', 'bela', 'topi', 'mari', 'wah', 'toba', 'kalat', 'karak', 'swat']);

const words = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
const keyOf = (s: string) => words(s).join('');

const EXACT = new Map<string, PkCity>();
const LONG: Array<{ key: string; city: PkCity }> = [];
ROWS.forEach(([name, , , , aliases], i) => {
  const city = PK_CITIES[i];
  for (const a of [name, ...(aliases ? aliases.split('|') : [])]) {
    const k = keyOf(a);
    if (k && !EXACT.has(k)) EXACT.set(k, city);
    if (k.length >= 5) LONG.push({ key: k, city });
  }
});

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function exactOrFuzzy(k: string): PkCity | null {
  if (!k) return null;
  const hit = EXACT.get(k);
  if (hit) return hit;
  if (k.length < 5) return null;
  // "lahorecantt" style leftovers: a known name at the start.
  const head = LONG.find((x) => k.startsWith(x.key) && x.key.length >= 6);
  if (head) return head.city;
  const max = k.length >= 8 ? 2 : 1;
  let best: { city: PkCity; d: number } | null = null;
  for (const x of LONG) {
    const d = editDistance(k, x.key, max);
    if (d <= max && (!best || d < best.d)) best = { city: x.city, d };
  }
  return best?.city ?? null;
}

const cache = new Map<string, PkCity | null>();

/**
 * The city a free-text place names, or null. Tries the whole text, then each
 * comma/dash part from the end (addresses end with the city), then runs of
 * up to three words, each exact first and then with one or two typos.
 */
export function matchCity(raw?: string | null): PkCity | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const memo = cache.get(text);
  if (memo !== undefined) return memo;
  const found = findCity(text);
  if (cache.size > 5000) cache.clear();
  cache.set(text, found);
  return found;
}

function findCity(text: string): PkCity | null {
  const clean = (s: string) => words(s).filter((w) => !NOISE.has(w));
  const whole = keyOf(text);
  const wholeHit = EXACT.get(whole) ?? EXACT.get(clean(text).join(''));
  if (wholeHit) return wholeHit;
  const parts = text.split(/[,\-/|()]+/).map((p) => p.trim()).filter(Boolean).reverse();
  for (const p of parts) {
    const hit = exactOrFuzzy(clean(p).join(''));
    if (hit) return hit;
  }
  // Word runs, longest first, from the end of the text.
  const w = clean(text);
  for (let size = Math.min(3, w.length); size >= 1; size--) {
    for (let i = w.length - size; i >= 0; i--) {
      const k = w.slice(i, i + size).join('');
      if (PLAIN_WORDS.has(k)) continue;
      const hit = size === 1 && k.length < 5 ? EXACT.get(k) ?? null : exactOrFuzzy(k);
      if (hit) return hit;
    }
  }
  return null;
}

/** One key per city for grouping: the matched city's name, else the raw text squeezed. */
export function cityGroupKey(raw?: string | null): string {
  const c = matchCity(raw);
  return c ? keyOf(c.name) : keyOf(String(raw ?? ''));
}

/** Display name: the matched city, else the text as written (trimmed), else null. */
export function cityLabel(raw?: string | null): string | null {
  const c = matchCity(raw);
  if (c) return c.name;
  const s = String(raw ?? '').trim();
  return s ? s.slice(0, 40) : null;
}

/** Do two place texts name the same city? */
export const sameCity = (a?: string | null, b?: string | null) => {
  const ka = cityGroupKey(a);
  return !!ka && ka === cityGroupKey(b);
};
