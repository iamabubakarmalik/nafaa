import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Mic } from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t as tr } from '@core/i18n';

/**
 * Voice billing on the Web Speech API (no server, no key). Understands
 * Urdu script and Roman Urdu: "2 kilo cheeni", "sau ka doodh",
 * "dedh kilo aata", "udhaar", "5 percent discount", "bill saaf karo".
 */

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

/** Several commands in one breath: "do kilo cheeni aur ek doodh". */
export function parseVoiceCommands(text: string): VoiceCommand[] {
  const parts = text.split(/\s+(?:aur|or|phir|and|اور|پھر)\s+|[،,]/i).map((p) => p.trim()).filter(Boolean);
  return parts.map(parseVoiceCommand);
}

export function describeCommand(cmd: VoiceCommand): string {
  switch (cmd.kind) {
    case 'add': return cmd.byMoney ? tr('Rs {{byMoney}} ka {{productQuery}}', { byMoney: cmd.byMoney, productQuery: cmd.productQuery }) : `${cmd.qty} ${cmd.unit ?? ''} ${cmd.productQuery}`.replace(/\s+/g, ' ');
    case 'checkout': return cmd.mode === 'credit' ? tr('Udhaar — checkout') : tr('Checkout');
    case 'discount': return cmd.pct ? tr('{{pct}}% discount', { pct: cmd.pct }) : tr('Rs {{rs}} discount', { rs: cmd.rs });
    case 'clear': return tr('Bill saaf');
    default: return tr('Samjha nahi: "{{text}}"', { text: cmd.text });
  }
}

/** What the page did with a command: shown in the voice panel. */
export interface VoiceFeedback { ok: boolean; text: string }

type Lang = 'ur-PK' | 'en-IN';
const LANG_KEY = 'nafaa-voice-lang';
const EXAMPLES = ['2 kilo cheeni', 'sau ka doodh', 'dedh kilo aata', 'ek dozen anday aur ek bread', '5 percent discount', 'nagad'];

/**
 * Mic button and voice panel. Each phrase is parsed (several items joined by
 * "aur"), handed to `onCommand` with the recogniser's alternative hearings,
 * and the panel keeps listening for the next item until the user is done.
 */
export function VoiceSaleButton({ onCommand, className = '' }: {
  onCommand: (cmd: VoiceCommand, alternatives: VoiceCommand[]) => VoiceFeedback | Promise<VoiceFeedback> | void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [log, setLog] = useState<VoiceFeedback[]>([]);
  const [error, setError] = useState('');
  const [lang, setLangState] = useState<Lang>(() => { try { return (localStorage.getItem(LANG_KEY) as Lang) || 'ur-PK'; } catch { return 'ur-PK'; } });
  const recRef = useRef<any>(null);
  const keepRef = useRef(false);

  const supported = typeof window !== 'undefined' && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);

  const stop = () => { keepRef.current = false; try { recRef.current?.abort(); } catch { /* not started */ } setListening(false); };
  const close = () => { stop(); setOpen(false); setHeard(''); setError(''); setLog([]); };
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem(LANG_KEY, l); } catch { /* private window */ } if (listening) { stop(); setTimeout(() => start(l), 200); } };

  const handle = async (texts: string[]) => {
    const [first, ...rest] = texts;
    const cmds = parseVoiceCommands(first);
    const altCmds = rest.map(parseVoiceCommand);
    for (const cmd of cmds) {
      const fb = await onCommand(cmd, cmds.length === 1 ? altCmds : []);
      const entry = fb ?? { ok: cmd.kind !== 'unknown', text: describeCommand(cmd) };
      setLog((l) => [entry, ...l].slice(0, 8));
      if (cmd.kind === 'checkout' || cmd.kind === 'clear') { close(); return; }
    }
  };

  const start = (l: Lang = lang) => {
    if (!supported) { setError(tr('Is browser mein awaaz ka feature nahi — Chrome ya Edge istemal karein')); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = l;
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.continuous = false;
    keepRef.current = true;
    rec.onstart = () => { setListening(true); setError(''); setHeard(''); };
    rec.onresult = (e: any) => {
      const r = e.results[e.results.length - 1];
      setHeard(r[0].transcript);
      if (r.isFinal) {
        const texts = Array.from({ length: r.length }, (_, i) => String(r[i].transcript)).filter(Boolean);
        void handle(texts);
      }
    };
    rec.onerror = (e: any) => {
      if (e.error === 'aborted') return;
      if (e.error === 'no-speech') return; // keep listening quietly
      keepRef.current = false;
      setError(e.error === 'not-allowed' ? tr('Mic ki permission chahiye — browser mein Allow dabayein') : tr('Awaaz nahi suni ja saki — dobara koshish karein'));
    };
    // Keep the session going: start again after each phrase until the user stops.
    rec.onend = () => { setListening(false); if (keepRef.current) setTimeout(() => { if (keepRef.current) { try { rec.start(); } catch { /* already running */ } } }, 250); };
    recRef.current = rec;
    try { rec.start(); } catch { setError(tr('Mic shuru nahi hua')); }
  };

  useEffect(() => () => { keepRef.current = false; try { recRef.current?.abort(); } catch { /* */ } }, []);

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setTimeout(() => start(), 150); }} title={tr('Awaaz se bill (F6)')} aria-label={tr('Awaaz se bill')}
        className={className || 'flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-brand-fg shadow-sm transition hover:bg-brand-700'}>
        <Mic className="h-5 w-5" />
      </button>

      <Modal open={open} onClose={close} size="md" title={tr('Awaaz se bill')} description={tr('Bolte jayein — har cheez bill mein judti jayegi')}>
        <div className="space-y-5">
          <div className="flex justify-center">
            <Segmented label={tr('Zabaan')} value={lang} onChange={setLang}
              items={[{ value: 'ur-PK', label: tr('اردو / Urdu') }, { value: 'en-IN', label: tr('English / Roman') }]} />
          </div>

          <div className="flex flex-col items-center">
            <button type="button" onClick={() => (listening ? stop() : start())} aria-label={listening ? tr('Rokein') : tr('Sunna shuru karein')}
              className={cn('relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-xl transition',
                listening ? 'bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand-600/40' : 'bg-slate-800 hover:bg-slate-700')}>
              {listening && <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/30" aria-hidden />}
              {listening && <span className="absolute -inset-3 rounded-full border-2 border-brand-300/60" aria-hidden />}
              <Mic className="relative h-10 w-10" />
            </button>
            <p className={cn('mt-4 text-[0.875rem] font-medium', listening ? 'text-brand-700' : 'text-slate-500')}>
              {listening ? tr('Sun raha hoon…') : error ? tr('Ruk gaya') : tr('Mic dabayein aur bolein')}
            </p>
            <div className="mt-2 min-h-[3rem] w-full rounded-xl bg-slate-50 px-4 py-3 text-center text-lg font-semibold text-slate-900" dir="auto">
              {error ? <span className="text-[0.875rem] font-medium text-rose-700">{error}</span> : heard || <span className="text-[0.875rem] font-normal text-slate-400">{tr('Jo aap bolenge woh yahan likha aayega')}</span>}
            </div>
          </div>

          {log.length > 0 && (
            <ul className="space-y-1.5">
              {log.map((f, i) => (
                <li key={i} className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-[0.8125rem] font-medium', f.ok ? 'bg-success-50 text-success-800' : 'bg-rose-50 text-rose-800')}>
                  {f.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}{f.text}
                </li>
              ))}
            </ul>
          )}

          <div>
            <p className="mb-2 text-[0.75rem] font-medium text-slate-500">{tr('Aise bolein')}</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => <span key={ex} className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.75rem] text-slate-600">“{ex}”</span>)}
            </div>
          </div>
          <Button fullWidth variant="secondary" onClick={close}>{tr('Ho gaya')}</Button>
        </div>
      </Modal>
    </>
  );
}
