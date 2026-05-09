import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  Check,
  Crown,
  Zap,
  Rocket,
  ExternalLink,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatPKRFull } from '@/lib/format';
import * as Linking from 'expo-linking';

const plans = [
  {
    name: 'Free Trial',
    price: 0,
    icon: Sparkles,
    color: '#737373',
    features: ['30 Products', '2 Users', '1 Shop', 'Basic POS', '7-day trial'],
  },
  {
    name: 'Basic',
    price: 1500,
    icon: Zap,
    color: '#2563eb',
    features: ['500 Products', '3 Users', '1 Shop', 'POS + Khata', 'Reports', 'Excel Export'],
  },
  {
    name: 'Pro',
    price: 3500,
    icon: Rocket,
    color: '#16a34a',
    popular: true,
    features: [
      '5,000 Products',
      '10 Users',
      '3 Shops',
      'Multi-Shop',
      'Loyalty Points',
      'WhatsApp Receipts',
      'Profit Reports',
      'Backup',
    ],
  },
  {
    name: 'Enterprise',
    price: 9500,
    icon: Crown,
    color: '#f59e0b',
    features: [
      'Unlimited Everything',
      '24/7 Priority Support',
      'Custom Branding',
      'Dedicated Manager',
      'API Access',
    ],
  },
];

const APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://nafaa.pk';

export default function PlanScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
        >
          <ArrowLeft size={20} color="#16a34a" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
            Choose Your Plan
          </Text>
          <Text className="text-xs text-neutral-500">7-day free trial included</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Current plan banner */}
        <View className="px-5 pb-3">
          <Card variant="outline" className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 rounded-2xl bg-emerald-200 dark:bg-emerald-900/50 items-center justify-center">
                <Check size={22} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wide">
                  Current Plan
                </Text>
                <Text className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                  Free Trial • 5 days left
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Plans */}
        <View className="px-5 gap-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                variant="outline"
                className={`p-5 relative ${plan.popular ? 'border-2 border-brand-500' : ''}`}
              >
                {plan.popular && (
                  <View className="absolute -top-3 right-5">
                    <Badge variant="brand" size="md">⭐ MOST POPULAR</Badge>
                  </View>
                )}

                <View className="flex-row items-center gap-3 mb-3">
                  <View
                    className="h-12 w-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: plan.color + '20' }}
                  >
                    <Icon size={24} color={plan.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-neutral-900 dark:text-white">
                      {plan.name}
                    </Text>
                    {plan.price > 0 ? (
                      <View className="flex-row items-baseline gap-1">
                        <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
                          {formatPKRFull(plan.price)}
                        </Text>
                        <Text className="text-sm text-neutral-500">/month</Text>
                      </View>
                    ) : (
                      <Text className="text-base font-bold text-emerald-600">FREE</Text>
                    )}
                  </View>
                </View>

                <View className="gap-2 mb-4">
                  {plan.features.map((f) => (
                    <View key={f} className="flex-row items-center gap-2">
                      <View className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-950/40 items-center justify-center">
                        <Check size={10} color="#16a34a" />
                      </View>
                      <Text className="text-sm text-neutral-700 dark:text-neutral-300">{f}</Text>
                    </View>
                  ))}
                </View>

                <Button
                  variant={plan.popular ? 'primary' : 'secondary'}
                  size="md"
                  onPress={() => Linking.openURL(`${APP_URL}/billing`)}
                >
                  <Text
                    className={`font-bold ${
                      plan.popular ? 'text-white' : 'text-neutral-900 dark:text-white'
                    }`}
                  >
                    {plan.price === 0 ? 'Current Plan' : 'Upgrade Now'}
                  </Text>
                  <ExternalLink size={14} color={plan.popular ? '#fff' : '#16a34a'} />
                </Button>
              </Card>
            );
          })}
        </View>

        {/* Money back guarantee */}
        <View className="px-5 mt-6 items-center">
          <View className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
            <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              🛡️ 30-day money-back guarantee
            </Text>
          </View>
          <Text className="text-xs text-neutral-500 mt-3 text-center">
            Need a custom plan? Contact our sales team
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
