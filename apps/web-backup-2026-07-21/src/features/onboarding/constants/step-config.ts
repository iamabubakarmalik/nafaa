import { Store, User, MapPin, Settings, Sparkles, Package, Users, PartyPopper, type LucideIcon } from 'lucide-react';

export interface StepConfig {
  num: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  ringColor: string;
  canSkip: boolean;
  estimatedMin: number;
}

export const STEP_CONFIG: Record<number, StepConfig> = {
  1: {
    num: 1, title: 'Business Type', subtitle: 'Apna business kis tarah ka hai?',
    icon: Store, color: 'emerald',
    gradientFrom: 'from-emerald-500', gradientTo: 'to-emerald-700',
    bgLight: 'bg-emerald-50', textColor: 'text-emerald-700',
    borderColor: 'border-emerald-500', ringColor: 'ring-emerald-100',
    canSkip: false, estimatedMin: 1,
  },
  2: {
    num: 2, title: 'Your Profile', subtitle: 'Owner profile aur language',
    icon: User, color: 'blue',
    gradientFrom: 'from-blue-500', gradientTo: 'to-blue-700',
    bgLight: 'bg-blue-50', textColor: 'text-blue-700',
    borderColor: 'border-blue-500', ringColor: 'ring-blue-100',
    canSkip: false, estimatedMin: 1,
  },
  3: {
    num: 3, title: 'Shop Details', subtitle: 'Address, hours, working days',
    icon: MapPin, color: 'violet',
    gradientFrom: 'from-violet-500', gradientTo: 'to-violet-700',
    bgLight: 'bg-violet-50', textColor: 'text-violet-700',
    borderColor: 'border-violet-500', ringColor: 'ring-violet-100',
    canSkip: false, estimatedMin: 2,
  },
  4: {
    num: 4, title: 'Preferences', subtitle: 'Categories, payment, receipt',
    icon: Settings, color: 'pink',
    gradientFrom: 'from-pink-500', gradientTo: 'to-pink-700',
    bgLight: 'bg-pink-50', textColor: 'text-pink-700',
    borderColor: 'border-pink-500', ringColor: 'ring-pink-100',
    canSkip: false, estimatedMin: 2,
  },
  5: {
    num: 5, title: 'Features', subtitle: 'Apne features chunein',
    icon: Sparkles, color: 'cyan',
    gradientFrom: 'from-cyan-500', gradientTo: 'to-cyan-700',
    bgLight: 'bg-cyan-50', textColor: 'text-cyan-700',
    borderColor: 'border-cyan-500', ringColor: 'ring-cyan-100',
    canSkip: true, estimatedMin: 1,
  },
  6: {
    num: 6, title: 'First Products', subtitle: 'Products add karein ya samples use karein',
    icon: Package, color: 'amber',
    gradientFrom: 'from-amber-500', gradientTo: 'to-amber-700',
    bgLight: 'bg-amber-50', textColor: 'text-amber-700',
    borderColor: 'border-amber-500', ringColor: 'ring-amber-100',
    canSkip: true, estimatedMin: 3,
  },
  7: {
    num: 7, title: 'Team Members', subtitle: 'Staff add karein (optional)',
    icon: Users, color: 'rose',
    gradientFrom: 'from-rose-500', gradientTo: 'to-rose-700',
    bgLight: 'bg-rose-50', textColor: 'text-rose-700',
    borderColor: 'border-rose-500', ringColor: 'ring-rose-100',
    canSkip: true, estimatedMin: 2,
  },
  8: {
    num: 8, title: 'All Set!', subtitle: 'Setup complete — chalo shuru karte hain',
    icon: PartyPopper, color: 'fuchsia',
    gradientFrom: 'from-fuchsia-500', gradientTo: 'to-fuchsia-700',
    bgLight: 'bg-fuchsia-50', textColor: 'text-fuchsia-700',
    borderColor: 'border-fuchsia-500', ringColor: 'ring-fuchsia-100',
    canSkip: false, estimatedMin: 1,
  },
};

export const TOTAL_STEPS = 8;
