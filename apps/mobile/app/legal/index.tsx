import { useState } from 'react';
import {
  View, Text, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, FileText, Sparkles, Shield, Lock, ChevronRight,
  Mail, Globe, Calendar, CheckCircle2,
} from 'lucide-react-native';

import { useTranslation } from '@/i18n/useTranslation';
type Tab = 'terms' | 'privacy';

const termsSections = [
  {
    title: '1. Acceptance of Terms',
    content:
      'Nafaa app use karne ke liye aap ye terms accept karte hain. Agar aap inn terms se ittefaq nahi karte to app use na karein. Hum waqtan-fawaqtan terms update kar sakte hain — bara change hone par aap ko notify karenge.',
  },
  {
    title: '2. Account Registration',
    content:
      'Account banane ke liye aap ki age 18 saal ya us se zyada honi chahiye. Aap apni account ki security ke khud zimmedaar hain — password kisi ke saath share na karein. Galat ya misleading information dena prohibited hai.',
  },
  {
    title: '3. Subscription & Billing',
    content:
      'Nafaa Free aur Paid plans offer karta hai. Paid plans monthly ya yearly basis pe billed hote hain. Subscription cancel karne pe aap ka data 90 din tak preserved rehta hai — uske baad permanently delete ho jaata hai. Refund 7 din ke andar request kar sakte hain.',
  },
  {
    title: '4. Acceptable Use',
    content:
      'Aap app ka use sirf legal business purposes ke liye karenge. Spam, fraud, illegal content, ya kisi bhi ghair-qanooni kaam ke liye app use karna prohibited hai. Hum koi bhi account jo terms violate kare suspend kar sakte hain.',
  },
  {
    title: '5. Data Ownership',
    content:
      'Aap apne business data ke malik hain — Nafaa sirf service provide karta hai. Aap kabhi bhi apna data export kar sakte hain (Backup feature se). Hum aap ke data ko sell nahi karte, aur na hi 3rd parties ke saath share karte hain.',
  },
  {
    title: '6. Service Availability',
    content:
      'Hum 99.9% uptime ka best effort karte hain, lekin hum guarantee nahi karte. Scheduled maintenance ke liye aap ko advance notice diya jaayega. Service interruption ki soorat mein hum responsible nahi hain kisi business loss ke liye.',
  },
  {
    title: '7. Limitation of Liability',
    content:
      'Nafaa aur uske developers maximum extent tak liability se exempt hain. Hum kisi indirect, incidental, consequential damages ke responsible nahi hain. Total liability subscription fees ke amount tak limited hai.',
  },
  {
    title: '8. Termination',
    content:
      'Aap kabhi bhi apna account delete kar sakte hain (Settings se). Hum bhi terms violation ki soorat mein account terminate karne ka haq rakhte hain. Termination ke baad ke 90 din mein aap apna data download kar sakte hain.',
  },
];

const privacySections = [
  {
    title: '1. Information We Collect',
    content:
      'Hum sirf wo information collect karte hain jo zaroori hai service provide karne ke liye:\n\n• Account info: Name, email, phone, business details\n• Business data: Products, customers, sales, expenses (aap ke business ka data)\n• Device info: Device type, OS version, app version (analytics ke liye)\n• Usage data: Feature usage patterns (product improvement ke liye)\n\nHum kabhi bhi aap ke customer\'s personal info (financial details, etc) external services ke saath share nahi karte.',
  },
  {
    title: '2. How We Use Your Data',
    content:
      'Aap ka data sirf in purposes ke liye use hota hai:\n\n• Service provide karna (POS, inventory, reporting)\n• Account aur subscription management\n• Customer support (jab aap madad request karein)\n• App improve karna (anonymized analytics)\n• Important updates aur security alerts bhejne ke liye\n\nHum aap ka data marketing companies, advertisers, ya kisi 3rd party ko sell nahi karte.',
  },
  {
    title: '3. Data Storage & Security',
    content:
      'Aap ka data secure cloud servers pe stored hota hai with:\n\n• 256-bit AES encryption (data at rest)\n• TLS 1.3 encryption (data in transit)\n• Regular automated backups\n• Multi-tenant data isolation (aap ka data dosre tenants se 100% separate hai)\n• Access logging aur audit trails\n\nServers AWS aur reliable cloud providers pe hain jin ka SOC 2 compliance hai.',
  },
  {
    title: '4. Data Sharing',
    content:
      'Hum aap ka data sirf in case mein share kar sakte hain:\n\n• Legal requirement (court order, law enforcement) — aap ko notify kiya jaayega jab tak prohibited na ho\n• Payment processors (Stripe, JazzCash, etc) — sirf billing ke liye, minimum required info\n• Cloud infrastructure providers (AWS, Google Cloud) — service operate karne ke liye\n\nKisi bhi advertising network, marketing company, ya data broker ke saath aap ka data share nahi hota.',
  },
  {
    title: '5. Your Rights',
    content:
      'Aap ke pas full control hai aap ke data ka:\n\n• Access: Kabhi bhi apna data download kar sakte hain (Backup feature)\n• Update: Profile aur settings se information edit kar sakte hain\n• Delete: Account delete karne par 90 din mein permanent deletion\n• Portability: Standard JSON format mein export kar sakte hain\n• Object: Specific data usage se opt-out kar sakte hain (settings se)\n\nKoi bhi request ke liye support@nafaa.pk pe email karein — hum 7 din ke andar respond karenge.',
  },
  {
    title: '6. Cookies & Tracking',
    content:
      'Web app pe hum essential cookies use karte hain authentication ke liye. Mobile app mein:\n\n• Push notification tokens (sirf notifications bhejne ke liye)\n• Analytics events (anonymized, opt-out kar sakte hain)\n• Crash reports (bug fixing ke liye, koi personal data nahi)\n\nHum advertising tracking ya cross-site tracking nahi karte.',
  },
  {
    title: '7. Children\'s Privacy',
    content:
      'Nafaa service 18 saal se kam age ke users ke liye intended nahi hai. Hum knowingly children ka data collect nahi karte. Agar aap ko lagey ke kisi minor ne account banaya hai, hamein contact karein — hum account remove kar denge.',
  },
  {
    title: '8. International Data Transfer',
    content:
      'Aap ka data primarily Pakistan aur regional cloud regions mein stored hota hai. Kuch processing US/EU servers pe ho sakti hai (payment processing, etc) — sab standard data protection agreements ke under.',
  },
  {
    title: '9. Changes to Privacy Policy',
    content:
      'Hum is policy ko update kar sakte hain. Bare changes hone par aap ko app aur email ke through notify kiya jaayega. Latest version hamesha is screen pe available hogi.',
  },
  {
    title: '10. Contact Us',
    content:
      'Privacy ya data se related koi bhi sawal ho:\n\n• Email: privacy@nafaa.pk\n• Phone: +92 300 1234567\n• Website: nafaa.pk/privacy\n\nHum 7 working days ke andar respond karenge.',
  },
];

export default function LegalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('terms');

  const sections = tab === 'terms' ? termsSections : privacySections;
  const tabConfig = {
    terms: { icon: FileText, color: '#2563eb', bg: '#dbeafe', label: 'Terms of Service' },
    privacy: { icon: Shield, color: '#16a34a', bg: '#dcfce7', label: 'Privacy Policy' },
  };
  const cfg = tabConfig[tab];
  const Icon = cfg.icon;

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
          <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white">{t('auto.index.legal')}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Sparkles size={11} color={cfg.color} />
            <Text className="text-xs text-neutral-500">{t('auto.index.terms_privacy')}</Text>
          </View>
        </View>
      </View>

      {/* Tab Switcher */}
      <View className="px-5 pb-3 flex-row gap-2">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setTab('terms');
          }}
          className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-2 border-2"
          style={{
            backgroundColor: tab === 'terms' ? '#2563eb' : '#ffffff',
            borderColor: tab === 'terms' ? '#2563eb' : '#e5e7eb',
          }}
        >
          <FileText size={16} color={tab === 'terms' ? '#ffffff' : '#6b7280'} />
          <Text
            className="font-bold text-sm"
            style={{ color: tab === 'terms' ? '#ffffff' : '#374151' }}
          >{t('auto.index.terms')}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setTab('privacy');
          }}
          className="flex-1 h-12 rounded-2xl flex-row items-center justify-center gap-2 border-2"
          style={{
            backgroundColor: tab === 'privacy' ? '#16a34a' : '#ffffff',
            borderColor: tab === 'privacy' ? '#16a34a' : '#e5e7eb',
          }}
        >
          <Shield size={16} color={tab === 'privacy' ? '#ffffff' : '#6b7280'} />
          <Text
            className="font-bold text-sm"
            style={{ color: tab === 'privacy' ? '#ffffff' : '#374151' }}
          >{t('auto.index.privacy')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className="px-5 mb-4">
          <View
            className="rounded-3xl p-5"
            style={{
              backgroundColor: cfg.color,
              shadowColor: cfg.color,
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="h-14 w-14 rounded-2xl bg-white/20 items-center justify-center">
                <Icon size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
                  {tab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </Text>
                <Text className="text-2xl font-extrabold text-white">
                  {tab === 'terms' ? 'Nafaa Terms' : 'Your Privacy'}
                </Text>
                <View className="flex-row items-center gap-1 mt-1">
                  <Calendar size={11} color="rgba(255,255,255,0.8)" />
                  <Text className="text-xs text-white/80">{t('auto.index.last_updated_1_may_2026')}</Text>
                </View>
              </View>
            </View>

            {tab === 'privacy' && (
              <View className="pt-3 border-t border-white/20 flex-row items-center gap-2">
                <Lock size={14} color="#ffffff" />
                <Text className="text-xs text-white/90 flex-1">{t('auto.index.aap_ka_data_secure_aur_encrypted_hai_hum')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sections */}
        <View className="px-5 gap-2.5">
          {sections.map((section, idx) => (
            <View
              key={idx}
              className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4"
            >
              <Text className="text-base font-extrabold text-neutral-900 dark:text-white">
                {section.title}
              </Text>
              <Text className="text-sm text-neutral-700 dark:text-neutral-300 leading-6 mt-2">
                {section.content}
              </Text>
            </View>
          ))}
        </View>

        {/* Acceptance Banner */}
        <View className="px-5 mt-6">
          <View
            className="rounded-2xl p-4 border-2"
            style={{
              backgroundColor: cfg.bg,
              borderColor: cfg.color,
            }}
          >
            <View className="flex-row items-start gap-3">
              <CheckCircle2 size={20} color={cfg.color} />
              <View className="flex-1">
                <Text className="text-sm font-extrabold" style={{ color: cfg.color }}>
                  {tab === 'terms' ? 'Agreement' : 'Your Trust Matters'}
                </Text>
                <Text className="text-xs mt-1 leading-5" style={{ color: cfg.color }}>
                  {tab === 'terms'
                    ? 'Nafaa app use karke aap inn terms se agree karte hain. Koi sawal ho to support contact karein.'
                    : 'Hamari priority hai aap ka data secure rakhna aur aap ki privacy respect karna. Agar koi concern ho to fauran hamein contact karein.'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact for Questions */}
        <View className="px-5 mt-4">
          <Pressable
            onPress={() => router.push('/help')}
            className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 flex-row items-center gap-3 active:opacity-70"
          >
            <View className="h-12 w-12 rounded-2xl bg-blue-100 items-center justify-center">
              <Mail size={20} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="font-extrabold text-neutral-900 dark:text-white">{t('auto.index.have_questions')}</Text>
              <Text className="text-xs text-neutral-500 mt-0.5">{t('auto.index.contact_our_support_team')}</Text>
            </View>
            <ChevronRight size={18} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Footer */}
        <View className="items-center mt-6">
          <Text className="text-[10px] text-neutral-400 font-semibold">{t('auto.index.2026_nafaa_all_rights_reserved')}</Text>
          <Text className="text-[10px] text-neutral-400 mt-0.5">{t('auto.more.made_in_pakistan_with')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
