import { useMemo, useState } from 'react';
import { Search, MapPin, Sparkles } from 'lucide-react';

interface CityInfo {
  name: string;
  province: string;
  provinceLabel: string;
  isMajor: boolean;
}

interface Props {
  cities: CityInfo[];
  value: string;
  detectedCity?: string;
  onChange: (city: string, province: string) => void;
  color: string;
  borderColor: string;
  bgColor: string;
}

export function CitySelector({ cities, value, detectedCity, onChange, color, borderColor, bgColor }: Props) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return showAll ? cities : cities.filter((c) => c.isMajor);
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, search, showAll]);

  return (
    <div className="space-y-3">
      {/* Auto-detected banner */}
      {detectedCity && !value && (
        <button
          type="button"
          onClick={() => {
            const info = cities.find((c) => c.name === detectedCity);
            if (info) onChange(info.name, info.province);
          }}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 hover:shadow-md transition group"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow group-hover:scale-110 transition">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <div className="text-xs font-bold text-emerald-700">Auto-detected from your location</div>
            <div className="font-black text-slate-900">{detectedCity}</div>
          </div>
          <div className="text-xs font-black text-emerald-700 px-3 py-1.5 rounded-lg bg-white shadow-sm">
            Use this →
          </div>
        </button>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Apna shahar dhoondein..."
          className={`h-12 w-full rounded-2xl border-2 border-slate-200 pl-10 pr-3 text-sm font-medium focus:outline-none focus:${borderColor} transition`}
        />
      </div>

      {/* Cities */}
      <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto p-1">
        {filtered.map((city) => {
          const active = value === city.name;
          return (
            <button
              key={city.name}
              type="button"
              onClick={() => onChange(city.name, city.province)}
              className={`px-4 h-10 rounded-xl border-2 text-sm font-bold transition flex items-center gap-1.5 ${
                active
                  ? `bg-gradient-to-r ${bgColor.replace('bg-', 'from-')} to-white ${borderColor} ${color} shadow-md`
                  : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {city.isMajor && !active && <MapPin className="h-3 w-3 text-slate-400" />}
              {city.name}
              {active && <span className="text-lg">✓</span>}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="w-full text-center py-8 text-sm text-slate-500 font-medium">
            "{search}" ke liye koi shahar nahi mila
          </div>
        )}
      </div>

      {!showAll && !search && cities.length > filtered.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
        >
          Show all {cities.length} cities →
        </button>
      )}
    </div>
  );
}
