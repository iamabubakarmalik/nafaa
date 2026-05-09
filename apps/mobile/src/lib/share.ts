import { Share, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://nafaa.pk';

export interface ShareConfig {
  title?: string;
  message: string;
  url?: string;
}

export async function shareNative(cfg: ShareConfig) {
  try {
    const message = cfg.url ? `${cfg.message}\n\n${cfg.url}` : cfg.message;
    await Share.share({
      title: cfg.title || 'Nafaa',
      message,
      ...(Platform.OS === 'ios' && cfg.url ? { url: cfg.url } : {}),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e: any) {
    Toast.show({ type: 'error', text1: 'Share failed', text2: e.message });
  }
}

export async function shareToWhatsApp(message: string, phone?: string) {
  const encoded = encodeURIComponent(message);
  const url = phone
    ? `whatsapp://send?phone=${phone.replace(/[^0-9]/g, '')}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;

  const can = await Linking.canOpenURL(url);
  if (can) {
    await Linking.openURL(url);
  } else {
    // Fallback to web WhatsApp
    await Linking.openURL(`https://wa.me/${phone || ''}?text=${encoded}`);
  }
}

export async function copyToClipboard(text: string) {
  await Clipboard.setStringAsync(text);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  Toast.show({ type: 'success', text1: 'Copied!' });
}

export const shareTemplates = {
  appPromo: () => ({
    title: 'Nafaa POS',
    message: `Mein Nafaa POS use kar raha hoon — Pakistan ka best shop management software! Aap bhi try karein:`,
    url: APP_URL,
  }),
  referral: (code: string) => ({
    title: 'Nafaa Referral',
    message: `Nafaa POS try karein aur 7 din free trial paayein! Mera code use karein: ${code}`,
    url: `${APP_URL}/register?ref=${code}`,
  }),
  receipt: (saleNumber: string, total: number, shopName: string) => ({
    title: `Receipt ${saleNumber}`,
    message: `${shopName}\nReceipt: ${saleNumber}\nTotal: Rs ${total.toLocaleString()}\n\nPowered by Nafaa POS`,
    url: APP_URL,
  }),
  khataReminder: (customerName: string, balance: number, shopName: string) => ({
    title: 'Payment Reminder',
    message: `As-salam-o-alaikum ${customerName} bhai,\n\n${shopName} se yaad dahaani: aap ka udhaar Rs ${balance.toLocaleString()} hai. Jab waqt ho, please pay kar dein.\n\nShukriya!`,
  }),
  invoice: (invoiceNumber: string, amount: number, dueDate: string) => ({
    title: `Invoice ${invoiceNumber}`,
    message: `Nafaa Invoice\n#${invoiceNumber}\nAmount: Rs ${amount.toLocaleString()}\nDue: ${dueDate}`,
    url: `${APP_URL}/billing`,
  }),
};
