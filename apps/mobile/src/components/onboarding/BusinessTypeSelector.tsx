import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, ArrowRight, Sparkles } from 'lucide-react-native';

export interface BusinessTypeCard {
  value: string;
  label: string;
  emoji: string;
  description?: string;
  category?: string;
  highlights?: string[];
  defaultUnit?: string;
}

export const BUSINESS_TYPES: BusinessTypeCard[] = [
  {
    value: 'CARPET',
    label: 'Carpets / Flooring',
    emoji: '🏪',
    description: 'Carpet shops, tiles, rugs',
    category: 'Retail',
    defaultUnit: 'sqft',
    highlights: ['Length × Width calculator', 'Color variants', 'sqft pricing'],
  },
  {
    value: 'MOBILE',
    label: 'Mobile / Electronics',
    emoji: '📱',
    description: 'Mobile shops, accessories',
    category: 'Electronics',
    defaultUnit: 'pcs',
    highlights: ['IMEI tracking', 'EMI plans', 'Warranty'],
  },
  {
    value: 'GROCERY',
    label: 'Grocery / Kiryana',
    emoji: '🛒',
    description: 'General stores, supermarkets',
    category: 'Retail',
    defaultUnit: 'kg',
    highlights: ['Weight pricing', 'Expiry tracking', 'Batches'],
  },
  {
    value: 'PHARMACY',
    label: 'Pharmacy / Medical',
    emoji: '💊',
    description: 'Medical stores, drug stores',
    category: 'Healthcare',
    defaultUnit: 'strip',
    highlights: ['Strict expiry', 'Batch numbers', 'Prescriptions'],
  },
  {
    value: 'RESTAURANT',
    label: 'Restaurant / Cafe',
    emoji: '🍽️',
    description: 'Restaurants, cafes, dhabas',
    category: 'Food',
    defaultUnit: 'plate',
    highlights: ['Table management', 'Kitchen tickets', 'Size variants'],
  },
  {
    value: 'SALON',
    label: 'Salon / Beauty',
    emoji: '💇',
    description: 'Salons, parlours, spas',
    category: 'Service',
    defaultUnit: 'service',
    highlights: ['Appointments', 'Staff slots', 'Services'],
  },
  {
    value: 'CLOTHING',
    label: 'Clothing / Garments',
    emoji: '👕',
    description: 'Clothing stores, fabric shops',
    category: 'Fashion',
    defaultUnit: 'pcs',
    highlights: ['Size × Color matrix', 'Variant images', 'Alterations'],
  },
  {
    value: 'HARDWARE',
    label: 'Hardware / Construction',
    emoji: '🔧',
    description: 'Hardware, tools, building',
    category: 'Industrial',
    defaultUnit: 'pcs',
    highlights: ['Length items', 'Weight items', 'Installation'],
  },
  {
    value: 'STATIONERY',
    label: 'Stationery / Books',
    emoji: '📚',
    description: 'Stationery, books, office',
    category: 'Education',
    defaultUnit: 'pcs',
    highlights: ['Pack & dozen', 'Multi-unit'],
  },
  {
    value: 'COSMETICS',
    label: 'Cosmetics / Beauty',
    emoji: '💄',
    description: 'Cosmetics, beauty products',
    category: 'Lifestyle',
    defaultUnit: 'pcs',
    highlights: ['Shade variants', 'Expiry', 'Brands'],
  },
  {
    value: 'BAKERY',
    label: 'Bakery / Sweets',
    emoji: '🍰',
    description: 'Bakeries, sweet shops',
    category: 'Food',
    defaultUnit: 'pcs',
    highlights: ['Weight-based', 'Daily expiry', 'Sizes'],
  },
  {
    value: 'GENERAL',
    label: 'General Retail',
    emoji: '🏬',
    description: 'Mixed retail, other',
    category: 'Other',
    defaultUnit: 'pcs',
    highlights: ['All features', 'Customize anytime'],
  },
];

interface Props {
  value?: string;
  options?: BusinessTypeCard[];
  onSelect: (type: BusinessTypeCard) => void;
  onChange?: (type: BusinessTypeCard) => void;
  showConfirmButton?: boolean;
  confirmText?: string;
  loading?: boolean;
  primaryColor?: string;
}

export function BusinessTypeSelector({
  value: initialValue,
  options = BUSINESS_TYPES,
  onSelect,
  onChange,
  showConfirmButton = true,
  confirmText = 'Continue',
  loading = false,
  primaryColor = '#7c3aed',
}: Props) {
  const [selected, setSelected] = useState<string | null>(initialValue ?? null);
  const selectedCard = options.find((opt) => opt.value === selected);

  const handlePick = (type: BusinessTypeCard) => {
    Haptics.selectionAsync();
    setSelected(type.value);
    onChange?.(type);
  };

  const handleConfirm = () => {
    if (!selectedCard) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelect(selectedCard);
  };

  return (
    <View>
      <View className="flex-row flex-wrap -m-1">
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <View key={opt.value} className="w-1/2 p-1">
              <Pressable
                onPress={() => handlePick(opt)}
                className="rounded-2xl border-2 p-3"
                style={{
                  borderColor: isSelected ? primaryColor : '#e5e7eb',
                  backgroundColor: isSelected ? `${primaryColor}10` : '#ffffff',
                  shadowColor: isSelected ? primaryColor : 'transparent',
                  shadowOpacity: isSelected ? 0.2 : 0,
                  shadowRadius: 8,
                  elevation: isSelected ? 4 : 0,
                }}
              >
                {isSelected && (
                  <View
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Check size={14} color="#ffffff" />
                  </View>
                )}

                <Text className="text-3xl mb-1">{opt.emoji}</Text>
                <Text
                  className="text-sm font-extrabold leading-tight"
                  style={{ color: isSelected ? primaryColor : '#0f172a' }}
                  numberOfLines={2}
                >
                  {opt.label}
                </Text>
                {opt.description && (
                  <Text className="text-[10px] text-neutral-500 mt-0.5" numberOfLines={2}>
                    {opt.description}
                  </Text>
                )}

                <View className="flex-row items-center gap-1 mt-2">
                  {opt.category && (
                    <View
                      className="px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: isSelected ? `${primaryColor}30` : '#f1f5f9',
                      }}
                    >
                      <Text
                        className="text-[9px] font-bold"
                        style={{ color: isSelected ? primaryColor : '#64748b' }}
                      >
                        {opt.category}
                      </Text>
                    </View>
                  )}
                  {opt.defaultUnit && (
                    <View className="px-1.5 py-0.5 rounded bg-emerald-100">
                      <Text className="text-[9px] font-bold text-emerald-700">
                        {opt.defaultUnit}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      {selectedCard && (
        <View
          className="rounded-3xl p-5 mt-4"
          style={{
            backgroundColor: '#1e1b4b',
            shadowColor: primaryColor,
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <View className="flex-row items-start gap-3">
            <Text className="text-5xl">{selectedCard.emoji}</Text>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5 self-start rounded-full bg-white/15 px-2.5 py-1">
                <Sparkles size={10} color="#fbbf24" />
                <Text className="text-[10px] font-bold text-white">
                  Auto-configured for you
                </Text>
              </View>
              <Text className="mt-2 text-xl font-extrabold text-white">
                {selectedCard.label}
              </Text>
              {selectedCard.description && (
                <Text className="text-sm text-white/70 mt-0.5">
                  {selectedCard.description}
                </Text>
              )}
            </View>
          </View>

          {selectedCard.highlights && selectedCard.highlights.length > 0 && (
            <View className="mt-4 pt-4 border-t border-white/10">
              <Text className="text-[10px] uppercase tracking-wider text-white/60 font-bold mb-2">
                Features enabled automatically:
              </Text>
              {selectedCard.highlights.map((h, i) => (
                <View key={i} className="flex-row items-center gap-2 mt-1.5">
                  <View
                    className="h-5 w-5 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
                  >
                    <Check size={11} color="#10b981" />
                  </View>
                  <Text className="text-sm text-white/90 flex-1">{h}</Text>
                </View>
              ))}
            </View>
          )}

          {selectedCard.defaultUnit && (
            <View className="mt-4 pt-4 border-t border-white/10 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] uppercase tracking-wider text-white/60 font-bold">
                  Default Unit
                </Text>
                <Text className="text-lg font-extrabold text-emerald-400 mt-0.5">
                  {selectedCard.defaultUnit}
                </Text>
              </View>
              <Text className="text-[10px] text-white/60">
                Settings se change ho sakta hai
              </Text>
            </View>
          )}
        </View>
      )}

      {showConfirmButton && (
        <Pressable
          onPress={handleConfirm}
          disabled={!selectedCard || loading}
          className="mt-4 h-14 rounded-2xl flex-row items-center justify-center gap-2"
          style={{
            backgroundColor: !selectedCard || loading ? '#9ca3af' : primaryColor,
            shadowColor: primaryColor,
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Text className="text-white font-extrabold text-base">
            {loading ? 'Applying...' : confirmText}
          </Text>
          {!loading && <ArrowRight size={18} color="#ffffff" />}
        </Pressable>
      )}
    </View>
  );
}
