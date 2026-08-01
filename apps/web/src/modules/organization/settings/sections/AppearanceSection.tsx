import { Palette, Sun, Moon, Monitor } from 'lucide-react';
import { ChoiceGroup, Field, Toggle, SectionCard } from '../components/UI';

const BRAND_COLORS = [
  '#16a34a', '#2563eb', '#7c3aed', '#ec4899', '#f59e0b',
  '#dc2626', '#0891b2', '#ea580c', '#0f172a', '#059669',
];

export default function AppearanceSection({ s, set }: any) {
  return (
    <div className="space-y-5">
      <SectionCard title="Theme" desc="Dashboard ka appearance" icon={Palette} color="cyan">
        <ChoiceGroup value={s.theme} onChange={(v: boolean) => set('theme', v)} columns={3} options={[
          { value: 'light', label: 'Light', desc: 'Always light', emoji: '☀️' },
          { value: 'dark', label: 'Dark', desc: 'Always dark', emoji: '🌙' },
          { value: 'auto', label: 'Auto', desc: 'System ke saath', emoji: '🔄' },
        ]} />
      </SectionCard>

      <SectionCard title="Brand Color" desc="Buttons aur accents ka color" icon={Palette} color="cyan">
        <div className="flex flex-wrap gap-2">
          {BRAND_COLORS.map((c) => {
            const active = s.brandColor === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => set('brandColor', c)}
                className={`h-14 w-14 rounded-2xl border-4 transition ${active ? 'border-slate-900 scale-110 shadow-lg' : 'border-white shadow'}`}
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="color"
            value={s.brandColor}
            onChange={(e) => set('brandColor', e.target.value)}
            className="h-11 w-20 rounded-xl cursor-pointer border-2 border-slate-200"
          />
          <span className="text-sm font-black text-slate-700">Custom color: <span className="font-mono text-slate-900">{s.brandColor}</span></span>
        </div>
      </SectionCard>

      <SectionCard title="Layout" desc="Density options" icon={Palette} color="cyan">
        <Toggle checked={s.compactMode} onChange={(v: boolean) => set('compactMode', v)} label="Compact mode" desc="UI ko chhota karo, zyada content fit karne ke liye" />
      </SectionCard>
    </div>
  );
}
