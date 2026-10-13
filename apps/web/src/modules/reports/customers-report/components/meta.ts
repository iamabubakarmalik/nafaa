/** Names, colours, rules and WhatsApp wording for customer segments and khata age bands. */

import { Crown, Heart, Hourglass, Moon, Sparkles, TriangleAlert, UserX, type LucideIcon } from 'lucide-react';
import type { AgeKey, SegmentKey } from '../api';

interface SegmentMeta {
  label: string;
  color: string;
  icon: LucideIcon;
  /** The rule, in plain words. */
  rule: string;
  /** What to do about it. */
  action: string;
  /** WhatsApp text; {name} and {shop} are filled per customer. */
  message: string;
}

export const SEGMENT_META: Record<SegmentKey, SegmentMeta> = {
  champions: {
    label: 'Behtareen', color: '#16a34a', icon: Crown,
    rule: 'Pichle 30 din me aaye, aur saal me 6 ya zyada din khareeda',
    action: 'Shukriya kahein, VIP banayein, naya maal sab se pehle inhein dikhayein',
    message: 'Assalam-o-Alaikum {name}! {shop} ki taraf se dil se shukriya — aap hamare sab se ache customers me se hain. Agli dafa aayein to aap ke liye khaas chhoot hai. 🙏',
  },
  loyal: {
    label: 'Wafadar', color: '#2563eb', icon: Heart,
    rule: 'Pichle 60 din me aaye, aur saal me 3 ya zyada din khareeda',
    action: 'Inhein Behtareen banayein: loyalty points, bundle offer',
    message: 'Assalam-o-Alaikum {name}! {shop} par aap ka hamesha intezar rehta hai. Is hafte aap ke liye khaas offer hai — zaroor tashreef layein. 😊',
  },
  promising: {
    label: 'Naye / umeed wale', color: '#0891b2', icon: Sparkles,
    rule: 'Pichle 30 din me aaye, magar saal me sirf 1–2 din',
    action: 'Doosri dafa bulayein — pehli khareedari ke baad ka shukriya kaam karta hai',
    message: 'Assalam-o-Alaikum {name}! {shop} se khareedari ka shukriya. Dobara aayein to aap ke liye chhoti si chhoot rakhi hai. 🙏',
  },
  attention: {
    label: 'Dhyan chahiye', color: '#d97706', icon: Hourglass,
    rule: '31–60 din pehle aakhri dafa aaye, saal me 1–2 din',
    action: 'Yaad dilayein, naya maal ya offer bhejein — warna kho jayenge',
    message: 'Assalam-o-Alaikum {name}! Kaafi din ho gaye {shop} par aap ko dekhe. Naya maal aa gaya hai — waqt mile to zaroor chakkar lagayein. 😊',
  },
  atRisk: {
    label: 'Khatre me', color: '#ea580c', icon: TriangleAlert,
    rule: '60 din se zyada se nahi aaye, magar pehle saal me 3+ din aate thay',
    action: 'Abhi rabta karein: phone, WhatsApp, khaas chhoot — yeh ache customer thay',
    message: 'Assalam-o-Alaikum {name}! {shop} ko aap ki kami mehsoos ho rahi hai. Aap ke liye khaas wapsi offer hai — is hafte tashreef layein. 🙏',
  },
  lost: {
    label: 'Kho gaye', color: '#e11d48', icon: Moon,
    rule: '60 din se zyada se nahi aaye, aur saal me sirf 1–2 din',
    action: 'Ek dafa bara offer bhej kar dekhein; jawab na aaye to rehne dein',
    message: 'Assalam-o-Alaikum {name}! Bohat din ho gaye. {shop} me ab bohat kuch naya hai — aap ke liye wapsi par khaas chhoot hai. 😊',
  },
  never: {
    label: 'Kabhi nahi khareeda', color: '#64748b', icon: UserX,
    rule: 'Naam likha gaya magar koi bill nahi bana',
    action: 'Pehli khareedari par chhoot de kar bulayein',
    message: 'Assalam-o-Alaikum {name}! {shop} me khush-aamdeed. Pehli khareedari par aap ke liye khaas chhoot hai — zaroor aayein. 🙏',
  },
};

export const SEGMENT_ORDER: SegmentKey[] = ['champions', 'loyal', 'promising', 'attention', 'atRisk', 'lost', 'never'];

export const AGE_COLORS: Record<AgeKey, string> = { d30: '#16a34a', d60: '#65a30d', d90: '#d97706', d180: '#ea580c', old: '#e11d48' };

/** Fills {name} and {shop}; the name gets "bhai"/"baji" when it is clear. */
export const fillMessage = (text: string, name: string, shop: string, salutation = '') =>
  text.replace(/\{name\}/g, salutation ? `${name} ${salutation}` : name).replace(/\{shop\}/g, shop);
