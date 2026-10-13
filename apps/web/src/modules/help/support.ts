/** Nafaa support contacts, shared by Help, Referrals and the legal pages. */

export const SUPPORT = {
  phone: '0324-1772933',
  phoneIntl: '+923241772933',
  whatsapp: '923241772933',
  email: 'support@nafaa.pk',
  website: 'https://nafaa.pk',
};

/** WhatsApp chat with support, with the message typed in. */
export const supportWhatsapp = (message: string) => `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(message)}`;
