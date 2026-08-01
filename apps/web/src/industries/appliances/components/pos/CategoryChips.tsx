interface Props {
  value: string;
  onChange: (v: string) => void;
  productCount: number;
}

const CATEGORIES = [
  { v: 'REFRIGERATOR', l: 'Fridge', e: '🧊' },
  { v: 'AIR_CONDITIONER_SPLIT', l: 'AC', e: '❄️' },
  { v: 'WASHING_MACHINE_FRONT_LOAD', l: 'Washing', e: '👔' },
  { v: 'LED_TV', l: 'TV', e: '📺' },
  { v: 'MICROWAVE_OVEN', l: 'Microwave', e: '📡' },
  { v: 'WATER_DISPENSER', l: 'Water', e: '💧' },
  { v: 'GEYSER_ELECTRIC', l: 'Geyser', e: '♨️' },
  { v: 'FAN_CEILING', l: 'Fan', e: '🌀' },
];

export function CategoryChips({ value, onChange, productCount }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      <Chip active={!value} onClick={() => onChange('')} label="All" emoji="📦" count={productCount} />
      {CATEGORIES.map((c) => (
        <Chip key={c.v} active={value === c.v}
          onClick={() => onChange(value === c.v ? '' : c.v)}
          label={c.l} emoji={c.e} />
      ))}
    </div>
  );
}

function Chip({ active, onClick, label, emoji, count }: any) {
  return (
    <button onClick={onClick}
      className={['shrink-0 h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border-2 transition',
        active ? 'bg-cyan-600 text-white border-cyan-600 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-300'].join(' ')}>
      <span>{emoji}</span>
      {label}
      {count !== undefined && (
        <span className={['px-1.5 rounded-md text-[10px]', active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'].join(' ')}>{count}</span>
      )}
    </button>
  );
}
