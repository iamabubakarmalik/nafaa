import { useRef, useState } from 'react';
import {
  Mic, X, RotateCcw, AlertTriangle, ShoppingCart,
  Banknote, BookOpen, Tag, Trash2, Volume2, CheckCircle2,
} from 'lucide-react';

/* ═════════════════════════════════════════════════════════════
   🎤 NAfaa VOICE SALE — CORE REUSABLE COMPONENT
   ─────────────────────────────────────────────────────────────
   ✅ NO backend • NO API key • 100% FREE (Web Speech API)
   🗣️  ur-PK (اردو) + Roman Urdu dono samajhta hai
   🛒 "2 kilo chini" • "sau ka doodh" • "dedh kilo aata"
   💰 "udhaar" • "nagad" • "bill banao"
   🏷️  "5 percent discount" • "sau rupay discount"
   🧹 "cart clear karo"
   📍 Kisi bhi page pe use karo: <VoiceSaleButton onCommand={fn} />
   ═════════════════════════════════════════════════════════════ */

export type VoiceCommand =
  | { kind: 'add'; productQuery: string; qty: number; unit?: string; byMoney?: number }
  | { kind: 'checkout'; mode?: 'cash' | 'credit'; }
  | { kind: 'discount'; pct?: number; rs?: number }
  | { kind: 'clear' }
  | { kind: 'unknown'; text: string };

/* ─── Number words (Roman + اردو script) ─────────────────── */
const NUM: Record<string, number> = {
  ek: 1, do: 2, teen: 3, tin: 3, char: 4, chaar: 4, paanch: 5, panch: 5,
  chay: 6, chhe: 6, cheh: 6, saat: 7, aath: 8, ath: 8, nau: 9, das: 10,
  giyarah: 11, gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15,
  solah: 16, satrah: 17, atharah: 18, unnis: 19, bees: 20, pachees: 25,
  tees: 30, chalees: 40, paintalees: 45, pachaas: 50, saath: 60, sattar: 70,
  assi: 80, navey: 90, sau: 100, so: 100, hazaar: 1000, hazar: 1000,
  dedh: 1.5, dhai: 2.5, adha: 0.5, aadha: 0.5, pauna: 0.75, pone: 0.75, sawa: 1.25,
  // اردو
  'ایک': 1, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5, 'چھ': 6, 'چھے': 6,
  'سات': 7, 'آٹھ': 8, 'نو': 9, 'دس': 10, 'گیارہ': 11, 'بارہ': 12,
  'تیرہ': 13, 'چودہ': 14, 'پندرہ': 15, 'سولہ': 16, 'سترہ': 17,
  'اٹھارہ': 18, 'انیس': 19, 'بیس': 20, 'پچیس': 25, 'تیس': 30,
  'چالیس': 40, 'پنتالیس': 45, 'پچاس': 50, 'ساٹھ': 60, 'ستر': 70,
  'اسی': 80, 'نوے': 90, 'سو': 100, 'ہزار': 1000,
  'ڈیڑھ': 1.5, 'ڈھائی': 2.5, 'آدھا': 0.5, 'پونے': 0.75, 'پونا': 0.75, 'سوا': 1.25,
};

/* ─── Unit words → unit key ──────────────────────────────── */
const UNIT_WORDS: Record<string, string> = {
  kilo: 'kg', kilogram: 'kg', kg: 'kg', 'کلو': 'kg', 'کلوگرام': 'kg', 'کيلو': 'kg',
  gram: 'gram', grams: 'gram', 'گرام': 'gram',
  liter: 'liter', litre: 'liter', 'لیٹر': 'liter',
  ml: 'ml', 'ایم ایل': 'ml',
  dozen: 'dozen', 'درجن': 'dozen',
  packet: 'packet', pack: 'packet', 'پیکٹ': 'packet', 'پیک': 'packet',
  box: 'box', dabba: 'box', 'ڈبہ': 'box', 'ڈبے': 'box', 'باکس': 'box',
  carton: 'carton', 'کارٹون': 'carton', 'کارتون': 'carton',
  piece: 'pcs', pieces: 'pcs', pcs: 'pcs', 'پیس': 'pcs', 'عدد': 'pcs',
  bag: 'bag', bori: 'bag', 'بوری': 'bag', 'تھیلا': 'bag',
  bottle: 'bottle', 'بوتل': 'bottle',
  meter: 'meter', metre: 'meter', 'میٹر': 'meter',
};

const MONEY_WORDS = new Set(['rupee', 'rupees', 'rupay', 'rupaya', 'rs', 'rs.', 'روپے', 'روپیہ', 'روپے کا']);
const KA_WORDS = new Set(['ka', 'ki', 'ke', 'کا', 'کی', 'کے']);
const FILLER = new Set(['de', 'do', 'dena', 'mujhe', 'bhai', 'jana', 'janab', 'plz', 'please',
  'دے', 'دو', 'دینا', 'مجھے', 'بھائی', 'لاو', 'لاؤ', 'لا', 'چاہیے', 'دکھاو']);
const CREDIT_WORDS = ['udhaar', 'udhar', 'khata', 'ادھار', 'کھاتا', 'کتاب', 'باقی'];
const CASH_WORDS = ['nagad', 'naqd', 'cash', 'نقد', 'کیش'];
const CHECKOUT_WORDS = ['bill', 'payment', 'paisay', 'paise', 'بل', 'بِل', 'پیمنٹ', 'پیسے'];
const CLEAR_WORDS = ['clear', 'khali', 'khaali', 'saaf', 'خالی', 'صاف'];
const DISCOUNT_WORDS = ['discount', 'chhoot', 'raayat', 'رعایت', 'چھوٹ', 'ڈسکاؤنٹ'];

/* اردو digits → latin */
const URDU_DIGITS: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

function normalize(text: string): string[] {
  let t = text;
  Object.entries(URDU_DIGITS).forEach(([u, l]) => { t = t.split(u).join(l); });
  return t
    .replace(/[،,۔.؟?!]/g, ' ')
    .replace(/%/g, ' percent ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Token sequence se number nikalo: "do sau pachaas" → 250, "ڈیڑھ" → 1.5 */
function wordsToNumber(tokens: string[], startAt: number): { value: number; consumed: number } {
  let total = 0, current = 0, i = startAt;
  for (; i < tokens.length; i++) {
    const tok = tokens[i];
    const low = tok.toLowerCase();
    if (/^\d+(\.\d+)?$/.test(tok)) { current += Number(tok); continue; }
    const n = NUM[low];
    if (n === undefined) break;
    if (n === 100) current = (current || 1) * 100;
    else if (n === 1000) { total += (current || 1) * 1000; current = 0; }
    else current += n;
  }
  return { value: total + current, consumed: i - startAt };
}

/* ═══════════════════════════════════════════════════════════
   🧠 parseVoiceCommand — raw text → structured command
   ═══════════════════════════════════════════════════════════ */
export function parseVoiceCommand(text: string): VoiceCommand {
  const tokens = normalize(text);
  const lows = tokens.map((t) => t.toLowerCase());
  if (tokens.length === 0) return { kind: 'unknown', text };

  /* 🧹 CLEAR */
  if (lows.some((t) => CLEAR_WORDS.includes(t))) return { kind: 'clear' };

  /* 🏷️ DISCOUNT — "5 percent discount" / "sau rupay chhoot" / "رعایت ۵٪" */
  const dIdx = lows.findIndex((t) => DISCOUNT_WORDS.includes(t));
  if (dIdx >= 0) {
    for (let i = 0; i < tokens.length; i++) {
      const { value, consumed } = wordsToNumber(tokens, i);
      if (consumed > 0 && value > 0) {
        const after = lows[i + consumed] || '';
        const isPct = after === 'percent' || after === 'فیصد' || after === 'feesad' || after === 'فیسد';
        const isRs = MONEY_WORDS.has(after);
        if (isPct || (!isRs && value <= 100)) return { kind: 'discount', pct: value };
        return { kind: 'discount', rs: value };
      }
    }
    return { kind: 'unknown', text };
  }

  /* 💰 CHECKOUT — udhaar / nagad / bill */
  if (lows.some((t) => CREDIT_WORDS.includes(t))) return { kind: 'checkout', mode: 'credit' };
  if (lows.some((t) => CASH_WORDS.includes(t))) return { kind: 'checkout', mode: 'cash' };
  if (lows.some((t) => CHECKOUT_WORDS.includes(t))) return { kind: 'checkout' };

  /* 🛒 ADD ITEM */
  // Pattern A (money): "sau rupay ka doodh" / "۱۰۰ روپے کا دودھ" / "100 ka chini"
  for (let i = 0; i < tokens.length; i++) {
    const { value, consumed } = wordsToNumber(tokens, i);
    if (consumed === 0 || value <= 0) continue;
    const next = lows[i + consumed];
    if (next && (MONEY_WORDS.has(next))) {
      let rest = tokens.slice(i + consumed + 1);
      if (rest.length && KA_WORDS.has(rest[0].toLowerCase())) rest = rest.slice(1);
      const product = rest.filter((t) => !FILLER.has(t.toLowerCase())).join(' ').trim();
      if (product) return { kind: 'add', productQuery: product, qty: 0, byMoney: value };
    }
    // "100 ka doodh" (rupay word missing)
    if (next && KA_WORDS.has(next)) {
      const rest = tokens.slice(i + consumed + 1).filter((t) => !FILLER.has(t.toLowerCase()) && !UNIT_WORDS[t.toLowerCase()]);
      const product = rest.join(' ').trim();
      if (product && value >= 10) return { kind: 'add', productQuery: product, qty: 0, byMoney: value };
    }
    break; // sirf pehla number check
  }

  // Pattern B (qty + unit): "2 kilo chini" / "دو درجن انڈے" / "chini 2"
  let qty = 1, unit: string | undefined, startIdx = 0;
  const first = wordsToNumber(tokens, 0);
  if (first.consumed > 0 && first.value > 0) {
    qty = first.value;
    startIdx = first.consumed;
    const maybeUnit = UNIT_WORDS[lows[startIdx]];
    if (maybeUnit) { unit = maybeUnit; startIdx += 1; }
  } else {
    // Trailing number: "chini do kilo"
    const last = wordsToNumber(tokens, Math.max(0, tokens.length - 2));
    if (last.consumed > 0 && last.value > 0) {
      qty = last.value;
      const maybeUnit = UNIT_WORDS[lows[tokens.length - 1]];
      if (maybeUnit) unit = maybeUnit;
      const product = tokens.slice(0, tokens.length - last.consumed - (unit ? 1 : 0))
        .filter((t) => !FILLER.has(t.toLowerCase())).join(' ').trim();
      if (product) return { kind: 'add', productQuery: product, qty, unit };
    }
  }
  const productTokens = tokens.slice(startIdx)
    .filter((t) => !FILLER.has(t.toLowerCase()) && !KA_WORDS.has(t.toLowerCase()));
  // Unit kahin beech mein bhi ho sakta hai: "2 chini kilo"
  const unitIdx = productTokens.findIndex((t) => UNIT_WORDS[t.toLowerCase()]);
  if (!unit && unitIdx >= 0) {
    unit = UNIT_WORDS[productTokens[unitIdx].toLowerCase()];
    productTokens.splice(unitIdx, 1);
  }
  const product = productTokens.join(' ').trim();
  if (product) return { kind: 'add', productQuery: product, qty, unit };

  return { kind: 'unknown', text };
}

/* ─── Human-readable description ─────────────────────────── */
export function describeCommand(cmd: VoiceCommand): { icon: any; text: string; tone: string } {
  switch (cmd.kind) {
    case 'add':
      return cmd.byMoney
        ? { icon: ShoppingCart, text: `⚖️ Rs ${cmd.byMoney} ka "${cmd.productQuery}"`, tone: 'emerald' }
        : { icon: ShoppingCart, text: `➕ ${cmd.qty} ${cmd.unit || ''} × "${cmd.productQuery}"`, tone: 'emerald' };
    case 'checkout':
      return cmd.mode === 'credit'
        ? { icon: BookOpen, text: '📔 Udhaar — checkout khol raha', tone: 'amber' }
        : { icon: Banknote, text: '💵 Cash checkout khol raha', tone: 'emerald' };
    case 'discount':
      return { icon: Tag, text: cmd.pct ? `🏷️ ${cmd.pct}% discount` : `🏷️ Rs ${cmd.rs} discount`, tone: 'amber' };
    case 'clear':
      return { icon: Trash2, text: '🧹 Cart clear', tone: 'rose' };
    default:
      return { icon: AlertTriangle, text: `❓ Samjha nahi: "${cmd.text}"`, tone: 'rose' };
  }
}

/* ═══════════════════════════════════════════════════════════
   🎤 VoiceSaleButton — reusable mic button + overlay
   ═══════════════════════════════════════════════════════════ */
const EXAMPLES = [
  '"2 kilo chini"', '"sau ka doodh"', '"dedh kilo aata"',
  '"ek dozen anday"', '"udhaar"', '"5 percent discount"',
];

export function VoiceSaleButton({
  onCommand,
  lang = 'ur-PK',
  className = '',
}: {
  onCommand: (cmd: VoiceCommand) => void;
  lang?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState('');
  const recRef = useRef<any>(null);

  const supported = typeof window !== 'undefined' &&
    (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);

  const stop = () => { try { recRef.current?.stop(); } catch {} setListening(false); };
  const close = () => { stop(); setOpen(false); setTranscript(''); setResult(null); setError(''); };

  const start = () => {
    if (!supported) { setError('Is browser mein voice nahi — Chrome ya Edge use karo'); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => { setListening(true); setError(''); setTranscript(''); setResult(null); };
    rec.onresult = (e: any) => {
      let final = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      const text = (final || interim).trim();
      if (text) setTranscript(text);
      if (final) {
        const cmd = parseVoiceCommand(final);
        setResult(cmd);
        setListening(false);
        setTimeout(() => { onCommand(cmd); close(); }, cmd.kind === 'unknown' ? 1500 : 700);
      }
    };
    rec.onerror = (e: any) => {
      setListening(false);
      setError(
        e.error === 'not-allowed' ? '🎤 Mic ki ijazat chahiye — browser mein Allow dabao'
        : e.error === 'no-speech' ? 'Kuch sunai nahi diya — dobara bolo'
        : 'Voice error — dobara try karo'
      );
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); } catch { setError('Mic start nahi hua'); }
  };

  const openAndStart = () => { setOpen(true); setTimeout(start, 150); };

  const preview = result ? describeCommand(result) : null;

  return (
    <>
      <button
        onClick={openAndStart}
        title="Voice Sale (bol ke becho)"
        className={className || 'h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 transition'}
      >
        <Mic className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4" onClick={close}>
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                <h3 className="font-extrabold text-lg">🎤 Bol Ke Becho</h3>
              </div>
              <button onClick={close} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Mic visual */}
              <div className="flex justify-center">
                <div className="relative">
                  {listening && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />
                      <span className="absolute -inset-4 rounded-full bg-rose-500/20 animate-ping [animation-delay:300ms]" />
                    </>
                  )}
                  <button
                    onClick={listening ? stop : start}
                    className={[
                      'relative h-24 w-24 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-2xl',
                      listening
                        ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-rose-500/50 scale-110'
                        : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-slate-500/40 hover:scale-105',
                    ].join(' ')}
                  >
                    <Mic className="h-10 w-10" />
                  </button>
                </div>
              </div>

              <div className="text-center">
                <div className={[
                  'text-xs font-extrabold uppercase tracking-widest',
                  listening ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400',
                ].join(' ')}>
                  {listening ? '🔴 Sun raha hoon... bolo!' : error ? '⚠️ Masla hua' : result ? '✓ Samajh gaya!' : 'Mic dabao aur bolo'}
                </div>

                {/* Transcript */}
                {(transcript || error) && (
                  <div className={[
                    'mt-3 rounded-2xl border-2 p-4 min-h-[60px] flex items-center justify-center',
                    error
                      ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
                  ].join(' ')}>
                    <p className={[
                      'text-lg font-extrabold',
                      error ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white',
                    ].join(' ')}>
                      {error || transcript}
                    </p>
                  </div>
                )}

                {/* Parsed preview */}
                {preview && !error && (
                  <div className={[
                    'mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-extrabold border-2',
                    preview.tone === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                    : preview.tone === 'amber' ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
                    : 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300',
                  ].join(' ')}>
                    <preview.icon className="h-4 w-4" />
                    {preview.text}
                  </div>
                )}
              </div>

              {/* Retry */}
              {(error || (result && result.kind === 'unknown')) && (
                <button
                  onClick={start}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-rose-500/40 active:scale-95 transition"
                >
                  <RotateCcw className="h-4 w-4" /> Dobara Bolo
                </button>
              )}

              {/* Examples */}
              <div>
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Aise bolo
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {EXAMPLES.map((ex) => (
                    <span key={ex} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
