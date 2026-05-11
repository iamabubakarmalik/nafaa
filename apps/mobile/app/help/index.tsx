import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, HelpCircle, Sparkles, MessageCircle, Mail, Phone,
  Globe, BookOpen, ChevronRight, ChevronDown, Video, FileText,
  ShoppingCart, Package, Users, Wallet, BarChart3, Star, Send,
  ExternalLink, Headphones,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { useTranslation } from '@/i18n/useTranslation';
interface FAQ {
  id: string;
  question: string;
  answer: string;
  icon: any;
  color: string;
  bg: string;
}

const faqs: FAQ[] = [
  {
    id: '1',
    question: 'POS pe sale kaise karein?',
    answer:
      'POS tab mein jaayen → Products select karein (tap karke cart mein add karein) → Checkout press karein → Customer select karein (optional) → Payment method choose karein → Complete Sale dabayen. Sale automatic save ho jaayegi aur receipt bhi mil jaayegi.',
    icon: ShoppingCart,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    id: '2',
    question: 'Udhaar (Khata) kaise track karein?',
    answer:
      'Sale ke time customer select karein aur "Full Udhaar" ya "Partial" mode choose karein. Khata Book section mein jaa ke har customer ka pura ledger dekh sakte hain — kitne ka udhaar hai, kab paid kiya, etc. Payment receive karne ke liye customer ke khata mein jaa kar "Payment" button dabayen.',
    icon: BookOpen,
    color: '#dc2626',
    bg: '#fee2e2',
  },
  {
    id: '3',
    question: 'Product kaise add karein?',
    answer:
      'Products tab → "New" button dabayen → Multi-step form fill karein: Basic Info (name, category, brand) → Pricing (sell + cost price) → Stock → Tags → "Create Product" dabayen. Baad mein edit screen se images, variants, batches add kar sakte hain.',
    icon: Package,
    color: '#2563eb',
    bg: '#dbeafe',
  },
  {
    id: '4',
    question: 'Customer kaise add karein?',
    answer:
      'Customers tab → "+ New" → Name (required), phone, email, address fill karein → Credit limit set karein agar udhaar dena hai → Save. Customer fauran POS aur Khata mein available ho jaayega.',
    icon: Users,
    color: '#8b5cf6',
    bg: '#ede9fe',
  },
  {
    id: '5',
    question: 'Cash Register kya hai?',
    answer:
      'Cash Register se aap din ke shuru aur akhir mein drawer cash count track karte hain. Subah Open karte waqt opening balance enter karein, raat ko close karte waqt actual cash count karein — system difference automatic calculate karega. Discrepancies fauran detect ho jaati hain.',
    icon: Wallet,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    id: '6',
    question: 'Reports kahaan se dekhein?',
    answer:
      'More tab → Reports section. Yahan aapko sales trend, top products, profit margins, payment method breakdown, category breakdown sab milega. Profit by Product report bhi alag se hai jo har product ka profit margin show karta hai.',
    icon: BarChart3,
    color: '#2563eb',
    bg: '#dbeafe',
  },
  {
    id: '7',
    question: 'Stock kaise update karein?',
    answer:
      'Stock 3 tareeqon se update hota hai: (1) Purchase record karne par automatic increase, (2) Sale par automatic decrease, (3) Manual adjustment ke liye "Stock Adjustments" mein jaa kar Add/Remove/Damage/Loss record karein. Sab changes Stock Movements mein audit log hota hai.',
    icon: Package,
    color: '#f59e0b',
    bg: '#fef3c7',
  },
  {
    id: '8',
    question: 'Team member kaise add karein?',
    answer:
      'Sirf Owner role wala user team manage kar sakta hai. Team Members section mein jaayen → "+ Add" → Name, email, password set karein → Role choose karein (Manager / Cashier / Staff). Member fauran login kar sakega. Owner ke ilawa kisi ko bhi deactivate ya delete kiya jaa sakta hai.',
    icon: Users,
    color: '#7c3aed',
    bg: '#ede9fe',
  },
  {
    id: '9',
    question: 'Backup kaise lein?',
    answer:
      'More tab → Backup → "Download Full Backup" press karein. Pura tenant data JSON file mein download ho jaayega. Is file ko Google Drive, iCloud ya email pe save karna recommended hai. Backup mein products, sales, customers, expenses sab kuch hota hai.',
    icon: FileText,
    color: '#2563eb',
    bg: '#dbeafe',
  },
  {
    id: '10',
    question: 'Plan upgrade kaise karein?',
    answer:
      'More tab → "Plans & Pricing" → Apni zaroorat ke mutabiq plan choose karein → "Upgrade" dabayen → Payment method select karke complete karein. Plan Usage section mein dekha jaa sakta hai abhi kitna use ho raha hai aur limit kya hai.',
    icon: Star,
    color: '#f59e0b',
    bg: '#fef3c7',
  },
];

const SUPPORT_PHONE = '+923001234567';
const SUPPORT_EMAIL = 'support@nafaa.pk';
const SUPPORT_WEBSITE = 'https://nafaa.pk';
const WHATSAPP_NUMBER = '923001234567';

export default function HelpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    Haptics.selectionAsync();
    setExpanded(expanded === id ? null : id);
  };

  const openLink = async (url: string, errorMsg: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
      } else {
        Toast.show({ type: 'error', text1: errorMsg });
      }
    } catch {
      Toast.show({ type: 'error', text1: errorMsg });
    }
  };

  const callSupport = () => openLink(`tel:${SUPPORT_PHONE}`, 'Phone app unavailable');
  const emailSupport = () =>
    openLink(
      `mailto:${SUPPORT_EMAIL}?subject=Nafaa Support Request`,
      'Email app unavailable',
    );
  const whatsappSupport = () =>
    openLink(
      `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=Hi, I need help with Nafaa app`,
      'WhatsApp not installed',
    );
  const openWebsite = () => openLink(SUPPORT_WEBSITE, 'Browser unavailable');

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.help_center')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color="#2563eb" />
            <Text className="text-xs text-neutral-500">{t('auto.index.faqs_24_7_support')}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: '#2563eb',
              shadowColor: '#2563eb',
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <Headphones size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">{t('auto.index.hum_hain_aap_ke_saath')}</Text>
                <Text className="text-2xl font-extrabold text-white mt-0.5">{t('auto.index.24_7_support')}</Text>
                <Text className="text-xs text-white/80 mt-0.5">{t('auto.index.urdu_english_mein_madad')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Contact */}
        <View className="px-5 mb-4">
          <Text className="text-xs font-bold uppercase text-neutral-500 mb-2 tracking-wider">{t('auto.index.contact_support')}</Text>
          <View className="flex-row flex-wrap -m-1">
            <View className="w-1/2 p-1">
              <Pressable
                onPress={whatsappSupport}
                className="rounded-2xl p-4 active:opacity-80"
                style={{
                  backgroundColor: '#25D366',
                  shadowColor: '#25D366',
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="h-11 w-11 rounded-2xl bg-white/20 items-center justify-center">
                  <MessageCircle size={20} color="#ffffff" />
                </View>
                <Text className="mt-3 text-white font-extrabold">{t('auto.section.whatsapp')}</Text>
                <Text className="text-white/80 text-[10px] mt-0.5">{t('auto.index.fastest_reply')}</Text>
              </Pressable>
            </View>

            <View className="w-1/2 p-1">
              <Pressable
                onPress={callSupport}
                className="rounded-2xl p-4 active:opacity-80"
                style={{
                  backgroundColor: '#16a34a',
                  shadowColor: '#16a34a',
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="h-11 w-11 rounded-2xl bg-white/20 items-center justify-center">
                  <Phone size={20} color="#ffffff" />
                </View>
                <Text className="mt-3 text-white font-extrabold">{t('auto.index.call_us')}</Text>
                <Text className="text-white/80 text-[10px] mt-0.5">{t('auto.index.9_am_9_pm_pkt')}</Text>
              </Pressable>
            </View>

            <View className="w-1/2 p-1">
              <Pressable
                onPress={emailSupport}
                className="rounded-2xl p-4 active:opacity-80"
                style={{
                  backgroundColor: '#7c3aed',
                  shadowColor: '#7c3aed',
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="h-11 w-11 rounded-2xl bg-white/20 items-center justify-center">
                  <Mail size={20} color="#ffffff" />
                </View>
                <Text className="mt-3 text-white font-extrabold">{t('auto.section.email')}</Text>
                <Text className="text-white/80 text-[10px] mt-0.5">{t('auto.index.24h_response')}</Text>
              </Pressable>
            </View>

            <View className="w-1/2 p-1">
              <Pressable
                onPress={openWebsite}
                className="rounded-2xl p-4 active:opacity-80"
                style={{
                  backgroundColor: '#0891b2',
                  shadowColor: '#0891b2',
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="h-11 w-11 rounded-2xl bg-white/20 items-center justify-center">
                  <Globe size={20} color="#ffffff" />
                </View>
                <Text className="mt-3 text-white font-extrabold">{t('auto.index.website')}</Text>
                <Text className="text-white/80 text-[10px] mt-0.5">{t('auto.index.nafaa_pk')}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Contact Info Card */}
        <View className="px-5 mb-4">
          <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Send size={14} color="#16a34a" />
              <Text className="text-sm font-extrabold text-neutral-900 dark:text-white">{t('auto.index.contact_details')}</Text>
            </View>
            <View className="gap-2.5">
              <Pressable onPress={callSupport} className="flex-row items-center gap-3 active:opacity-70">
                <View className="h-8 w-8 rounded-lg bg-emerald-100 items-center justify-center">
                  <Phone size={14} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.section.phone')}</Text>
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                    {SUPPORT_PHONE}
                  </Text>
                </View>
                <ExternalLink size={14} color="#9ca3af" />
              </Pressable>

              <Pressable onPress={emailSupport} className="flex-row items-center gap-3 active:opacity-70">
                <View className="h-8 w-8 rounded-lg bg-violet-100 items-center justify-center">
                  <Mail size={14} color="#7c3aed" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.section.email')}</Text>
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                    {SUPPORT_EMAIL}
                  </Text>
                </View>
                <ExternalLink size={14} color="#9ca3af" />
              </Pressable>

              <Pressable onPress={openWebsite} className="flex-row items-center gap-3 active:opacity-70">
                <View className="h-8 w-8 rounded-lg bg-cyan-100 items-center justify-center">
                  <Globe size={14} color="#0891b2" />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] text-neutral-500 font-bold uppercase">{t('auto.index.website')}</Text>
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">{t('auto.index.nafaa_pk')}</Text>
                </View>
                <ExternalLink size={14} color="#9ca3af" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* FAQs */}
        <View className="px-5">
          <View className="flex-row items-center gap-2 mb-3">
            <HelpCircle size={18} color="#2563eb" />
            <Text className="text-base font-extrabold text-neutral-900 dark:text-white">{t('auto.index.frequently_asked_questions')}</Text>
          </View>

          <View className="gap-2">
            {faqs.map((faq) => {
              const Icon = faq.icon;
              const isOpen = expanded === faq.id;
              return (
                <Pressable
                  key={faq.id}
                  onPress={() => toggleFaq(faq.id)}
                  className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden active:opacity-80"
                >
                  <View className="p-3.5 flex-row items-center gap-3">
                    <View
                      className="h-10 w-10 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: faq.bg }}
                    >
                      <Icon size={18} color={faq.color} />
                    </View>
                    <Text className="flex-1 text-sm font-bold text-neutral-900 dark:text-white">
                      {faq.question}
                    </Text>
                    {isOpen ? (
                      <ChevronDown size={18} color="#9ca3af" />
                    ) : (
                      <ChevronRight size={18} color="#9ca3af" />
                    )}
                  </View>
                  {isOpen && (
                    <View className="px-4 pb-4 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                      <Text className="text-sm text-neutral-700 dark:text-neutral-300 leading-6">
                        {faq.answer}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Still Need Help */}
        <View className="px-5 mt-6">
          <View className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4">
            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 rounded-2xl bg-amber-200 items-center justify-center">
                <MessageCircle size={18} color="#b45309" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-extrabold text-amber-900">{t('auto.index.aur_madad_chahiye')}</Text>
                <Text className="text-xs text-amber-800 mt-1 leading-5">{t('auto.index.hamari_support_team_urdu_english_aur_rom')}</Text>
                <Pressable
                  onPress={whatsappSupport}
                  className="mt-3 h-10 px-4 rounded-xl flex-row items-center justify-center gap-1.5 self-start"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <MessageCircle size={14} color="#ffffff" />
                  <Text className="text-white font-bold text-xs">{t('auto.index.chat_on_whatsapp')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
