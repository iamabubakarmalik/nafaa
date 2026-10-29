/**
 * Small building blocks shared by the booker screens, in the app's
 * existing look (neutral background, rounded white cards, brand green
 * actions, distribution teal for the hero).
 */

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CloudOff, RefreshCw } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { useBookerStore } from '../store';

/** Distribution identity (web identities.ts: #115e59). ACCENT is the lighter step for icons on light and dark cards. */
export const ACCENT = '#0d9488';
export const ACCENT_DARK = '#115e59';
export const GREEN = '#16a34a';

export const rs = (v: number | null | undefined, digits = 0) =>
  `Rs ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 2) })}`;

export const qtyText = (v: number) => String(Math.round(v * 10000) / 10000);

export function ScreenHeader({ title, subtitle, right, onBack }: { title: string; subtitle?: string | null; right?: ReactNode; onBack?: () => void }) {
  const router = useRouter();
  return (
    <View className="px-4 pt-3 pb-3 flex-row items-center gap-3">
      <Pressable
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/booker')))}
        hitSlop={12}
        className="h-10 w-10 rounded-2xl bg-white dark:bg-neutral-900 items-center justify-center border border-neutral-200 dark:border-neutral-800"
      >
        <ArrowLeft size={20} color={ACCENT} />
      </Pressable>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-xl font-extrabold text-neutral-900 dark:text-white">{title}</Text>
        {!!subtitle && <Text numberOfLines={1} className="text-xs text-neutral-500 mt-0.5">{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

/** Sync button with the queue count; spins while syncing, shows a cloud when offline. */
export function SyncButton() {
  const { syncing, pending, offline, sync } = useBookerStore();
  return (
    <Pressable
      onPress={() => sync()}
      disabled={syncing}
      hitSlop={8}
      className="h-10 flex-row items-center gap-1.5 rounded-2xl px-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
    >
      {syncing ? <ActivityIndicator size="small" color={GREEN} /> : offline ? <CloudOff size={16} color="#dc2626" /> : <RefreshCw size={16} color={GREEN} />}
      <Text className="text-xs font-extrabold text-neutral-700 dark:text-neutral-200">{syncing ? 'Sync…' : 'Sync'}</Text>
      {pending > 0 && (
        <View className="min-w-5 h-5 px-1 rounded-full bg-amber-500 items-center justify-center">
          <Text className="text-[10px] font-extrabold text-white">{pending}</Text>
        </View>
      )}
    </Pressable>
  );
}

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'accent';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  green: { bg: 'bg-emerald-100 dark:bg-emerald-950', fg: 'text-emerald-700 dark:text-emerald-300' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-950', fg: 'text-amber-700 dark:text-amber-300' },
  red: { bg: 'bg-red-100 dark:bg-red-950', fg: 'text-red-700 dark:text-red-300' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-950', fg: 'text-blue-700 dark:text-blue-300' },
  gray: { bg: 'bg-neutral-100 dark:bg-neutral-800', fg: 'text-neutral-600 dark:text-neutral-300' },
  accent: { bg: 'bg-teal-100 dark:bg-teal-950', fg: 'text-teal-800 dark:text-teal-300' },
};

export function Tag({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <View className={cn('rounded-full px-2 py-0.5', t.bg)}>
      <Text className={cn('text-[10px] font-extrabold', t.fg)}>{children}</Text>
    </View>
  );
}

export function FilterChip({ label, count, active, onPress }: { label: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'h-9 flex-row items-center gap-1.5 rounded-full px-3.5 border',
        active ? 'bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white' : 'bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800',
      )}
    >
      <Text className={cn('text-xs font-extrabold', active ? 'text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-300')}>{label}</Text>
      {count != null && (
        <Text className={cn('text-[10px] font-extrabold', active ? 'text-white/70 dark:text-neutral-500' : 'text-neutral-400')}>{count}</Text>
      )}
    </Pressable>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <View className={cn('rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4', className)}>{children}</View>;
}

export function ActionButton({
  label, icon: Icon, onPress, tone = 'green', disabled, loading, className,
}: { label: string; icon?: LucideIcon; onPress: () => void; tone?: 'green' | 'accent' | 'white' | 'red'; disabled?: boolean; loading?: boolean; className?: string }) {
  const bg = { green: 'bg-brand-600', accent: 'bg-teal-700', red: 'bg-red-600', white: 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800' }[tone];
  const fg = tone === 'white' ? '#0f172a' : '#ffffff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={cn('h-12 flex-row items-center justify-center gap-2 rounded-2xl px-4', bg, (disabled || loading) && 'opacity-50', className)}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={18} color={tone === 'white' ? ACCENT : fg} /> : null}
      <Text className={cn('text-sm font-extrabold', tone === 'white' ? 'text-neutral-900 dark:text-white' : 'text-white')}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View className="h-2 rounded-full bg-white/25 overflow-hidden">
      <View className="h-2 rounded-full bg-white" style={{ width: `${pct * 100}%` }} />
    </View>
  );
}

export function Empty({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text?: string }) {
  return (
    <View className="items-center py-12 px-6">
      <View className="h-16 w-16 rounded-3xl bg-teal-100 dark:bg-teal-950 items-center justify-center">
        <Icon size={30} color={ACCENT} />
      </View>
      <Text className="mt-3 text-base font-extrabold text-neutral-700 dark:text-neutral-200 text-center">{title}</Text>
      {!!text && <Text className="mt-1 text-xs text-neutral-500 text-center">{text}</Text>}
    </View>
  );
}

export function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'green' | 'red' }) {
  const color = tone === 'green' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : 'text-neutral-900 dark:text-white';
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className={cn('text-sm', strong ? 'font-extrabold text-neutral-900 dark:text-white' : 'text-neutral-500')}>{label}</Text>
      <Text className={cn(strong ? 'text-base font-extrabold' : 'text-sm font-extrabold', color)}>{value}</Text>
    </View>
  );
}

/** Days since an ISO date, or null. */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
