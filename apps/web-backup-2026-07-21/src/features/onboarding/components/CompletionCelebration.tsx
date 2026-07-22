import { useEffect, useState } from 'react';
import { PartyPopper, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  onContinue: () => void;
  stats: {
    products: number;
    team: number;
    categories: number;
  };
}

export function CompletionCelebration({ onContinue, stats }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-lg flex items-center justify-center p-4">
      {/* Confetti pieces */}
      {show && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-3 animate-confetti-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                backgroundColor: ['#f59e0b', '#ec4899', '#8b5cf6', '#22c55e', '#3b82f6', '#ef4444'][i % 6],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2.5 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes confetti-fall {
          to { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall { animation: confetti-fall linear forwards; }
      `}</style>

      <div
        className={`max-w-lg w-full rounded-[2rem] bg-gradient-to-br from-fuchsia-600 via-pink-600 to-orange-500 text-white p-8 shadow-2xl relative overflow-hidden transition-all duration-500 ${
          show ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative text-center">
          <div className="inline-flex h-24 w-24 rounded-3xl bg-white/20 backdrop-blur-xl border-2 border-white/30 items-center justify-center shadow-2xl mb-4">
            <PartyPopper className="h-12 w-12" strokeWidth={2} />
          </div>

          <h1 className="text-4xl font-black">Mubarak ho! 🎉</h1>
          <p className="text-white/90 text-lg mt-2 font-bold">Aap ka shop ready hai</p>

          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-3">
              <div className="text-2xl font-black">{stats.products}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">Products</div>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-3">
              <div className="text-2xl font-black">{stats.categories}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">Categories</div>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur border border-white/20 p-3">
              <div className="text-2xl font-black">{stats.team}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-80">Team</div>
            </div>
          </div>

          <button
            onClick={onContinue}
            className="mt-6 w-full h-14 rounded-2xl bg-white text-fuchsia-700 font-black text-lg flex items-center justify-center gap-2 shadow-2xl hover:shadow-white/30 hover:scale-[1.02] transition"
          >
            <Sparkles className="h-5 w-5" />
            Dashboard pe jayen
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
