import { Plus, Trash2, Crown, User, Mail, Lock, Phone } from 'lucide-react';
import { STEP_CONFIG } from '../constants/step-config';

interface TeamMember {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: 'MANAGER' | 'CASHIER' | 'STAFF';
}

interface Props {
  data: { teamMembers: TeamMember[] };
  onChange: (data: any) => void;
  options: any;
}

export function Step7Team({ data, onChange, options }: Props) {
  const cfg = STEP_CONFIG[7];

  const addMember = () => onChange({
    teamMembers: [...data.teamMembers, { fullName: '', email: '', password: '', phone: '', role: 'CASHIER' }],
  });
  const removeMember = (idx: number) => onChange({ teamMembers: data.teamMembers.filter((_, i) => i !== idx) });
  const updateMember = (idx: number, patch: Partial<TeamMember>) => {
    const next = [...data.teamMembers];
    next[idx] = { ...next[idx], ...patch };
    onChange({ teamMembers: next });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 p-5">
        <div className="flex items-start gap-3">
          <Crown className="h-6 w-6 text-rose-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-black text-slate-900">Team Members Add Karein</h3>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed font-medium">
              Apne staff (cashier / manager) ko add karein taake wo bhi POS use kar saken.
              Skip bhi kar sakte hain — baad mein Staff section se add ho jayenge.
            </p>
          </div>
        </div>
      </div>

      {data.teamMembers.length === 0 ? (
        <button
          onClick={addMember}
          className="w-full rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 flex flex-col items-center gap-2 font-black text-slate-500 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50/50 transition"
        >
          <div className="h-12 w-12 rounded-2xl bg-rose-100 flex items-center justify-center">
            <User className="h-6 w-6 text-rose-600" />
          </div>
          <div>Add your first team member</div>
          <div className="text-xs font-medium text-slate-400">Or skip and add later</div>
        </button>
      ) : (
        <>
          {data.teamMembers.map((m, idx) => (
            <div key={idx} className="rounded-3xl border-2 border-slate-200 p-4 space-y-2.5 bg-gradient-to-br from-white to-rose-50/30">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-rose-100 flex items-center justify-center text-xs font-black text-rose-700">
                  #{idx + 1}
                </div>
                <span className="flex-1 font-black text-slate-700">Member {idx + 1}</span>
                <button
                  onClick={() => removeMember(idx)}
                  className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                </button>
              </div>

              <InputWithIcon icon={User}  value={m.fullName} onChange={(v: string) => updateMember(idx, { fullName: v })} placeholder="Full Name" />
              <InputWithIcon icon={Mail}  value={m.email}    onChange={(v: string) => updateMember(idx, { email: v })}    placeholder="Email" type="email" />
              <InputWithIcon icon={Phone} value={m.phone}    onChange={(v: string) => updateMember(idx, { phone: v })}    placeholder="Phone (optional)" type="tel" />
              <InputWithIcon icon={Lock}  value={m.password} onChange={(v: string) => updateMember(idx, { password: v })} placeholder="Set password (min 6)" type="password" />

              <div className="grid grid-cols-3 gap-1.5">
                {options.teamRoles.map((r: any) => {
                  const active = m.role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => updateMember(idx, { role: r.value })}
                      className={`h-11 rounded-xl border-2 text-xs font-black transition flex flex-col items-center justify-center ${
                        active
                          ? `bg-gradient-to-br ${cfg.gradientFrom} ${cfg.gradientTo} ${cfg.borderColor} text-white shadow-md`
                          : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-base">{r.icon}</span>
                      <span className="text-[10px] mt-0.5">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            onClick={addMember}
            className="w-full rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 p-4 flex items-center justify-center gap-2 font-black text-rose-700 hover:bg-rose-100 transition"
          >
            <Plus className="h-4 w-4" /> Add another member
          </button>
        </>
      )}
    </div>
  );
}

interface InputWithIconProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}

function InputWithIcon({ icon: Icon, value, onChange, placeholder, type = 'text' }: InputWithIconProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-3 h-11 bg-white focus-within:border-rose-500 transition">
      <Icon className="h-4 w-4 text-slate-400" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm font-medium"
      />
    </div>
  );
}
