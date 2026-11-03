/** WhatsApp texts for optical customers, in the shop's bill language. */

import type { MessageLang } from '../../customers/messages';

const hi = (lang: MessageLang, name: string) => (lang === 'en' ? `Hello ${name},` : lang === 'ur' ? `السلام علیکم ${name}،` : `Assalam o alaikum ${name},`);

/** Order ready for pickup, or the promised date while it is still being made. */
export function orderMessage(o: { customer: string; number: string; repair: boolean; ready: boolean; date: string; due?: string | null }, lang: MessageLang): string {
  const due = o.due ? ({ en: ` Balance: ${o.due}.`, ur: ` باقی: ${o.due}۔`, roman: ` Baqi: ${o.due}.` })[lang] : '';
  if (o.ready) {
    const what = ({ en: o.repair ? 'glasses are repaired and' : 'glasses are', ur: o.repair ? 'چشمہ ٹھیک ہو کر' : 'چشمہ', roman: o.repair ? 'chashma repair ho kar' : 'chashma' })[lang];
    return ({
      en: `${hi(lang, o.customer)} your ${what} ready (${o.number}).${due} Thank you.`,
      ur: `${hi(lang, o.customer)} آپ کا ${what} تیار ہے (${o.number})۔${due} شکریہ۔`,
      roman: `${hi(lang, o.customer)} aap ka ${what} tayyar hai (${o.number}).${due} Shukriya.`,
    })[lang];
  }
  return ({
    en: `${hi(lang, o.customer)} your order ${o.number} will be ready by ${o.date}.`,
    ur: `${hi(lang, o.customer)} آپ کا آرڈر ${o.number} ${o.date} تک تیار ہو گا۔`,
    roman: `${hi(lang, o.customer)} aap ka order ${o.number} ${o.date} tak tayyar hoga.`,
  })[lang];
}

/** Call-back for a prescription that is about to run out. */
export function rxRecallMessage(o: { customer: string; date: string }, lang: MessageLang): string {
  return ({
    en: `${hi(lang, o.customer)} your eye power was checked on ${o.date}. Book a new eye test with us. Thank you.`,
    ur: `${hi(lang, o.customer)} آپ کی آنکھ کا نمبر ${o.date} کو چیک ہوا تھا۔ نیا آئی ٹیسٹ کروا لیں، ہم سے وقت لے لیں۔ شکریہ۔`,
    roman: `${hi(lang, o.customer)} aap ki aankh ka number ${o.date} ko check hua tha. Naya eye test karwa lein, ham se waqt le lein. Shukriya.`,
  })[lang];
}

export function rxShareMessage(o: { customer: string; number: string; date: string }, lang: MessageLang): string {
  return ({
    en: `${hi(lang, o.customer)} your prescription ${o.number}: ${o.date}. Thank you.`,
    ur: `${hi(lang, o.customer)} آپ کا نسخہ ${o.number}: ${o.date}۔ شکریہ۔`,
    roman: `${hi(lang, o.customer)} aap ka nuskha ${o.number}: ${o.date}. Shukriya.`,
  })[lang];
}

export function testBookedMessage(o: { customer: string; date: string; slot?: string | null }, lang: MessageLang): string {
  const at = o.slot ? ({ en: ` at ${o.slot}`, ur: ` ${o.slot} بجے`, roman: ` ${o.slot} baje` })[lang] : '';
  return ({
    en: `${hi(lang, o.customer)} your eye test is booked for ${o.date}${at}. Thank you.`,
    ur: `${hi(lang, o.customer)} آپ کا آئی ٹیسٹ ${o.date}${at} بک ہے۔ شکریہ۔`,
    roman: `${hi(lang, o.customer)} aap ka eye test ${o.date}${at} book hai. Shukriya.`,
  })[lang];
}
