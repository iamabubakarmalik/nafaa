import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import {
  Utensils, ShoppingBag, Shirt, Smartphone, Home, Pill, Book,
  Sparkles, Wrench, Gem, Car, Heart, Coffee, Cake, Gift, Palette,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  food: Utensils,
  restaurant: Utensils,
  grocery: ShoppingBag,
  fashion: Shirt,
  clothes: Shirt,
  garments: Shirt,
  electronics: Smartphone,
  mobile: Smartphone,
  home: Home,
  furniture: Home,
  pharmacy: Pill,
  medicine: Pill,
  bookstore: Book,
  books: Book,
  beauty: Sparkles,
  salon: Sparkles,
  cosmetics: Sparkles,
  hardware: Wrench,
  jewelry: Gem,
  autoparts: Car,
  gym: Heart,
  bakery: Cake,
  cafe: Coffee,
  gift: Gift,
  art: Palette,
};

interface CategoryChipProps {
  name: string;
  count?: number;
  className?: string;
}

export function CategoryChip({ name, count, className }: CategoryChipProps) {
  const Icon = iconMap[name.toLowerCase()] || ShoppingBag;

  return (
    <Link
      to={`/category/${encodeURIComponent(name)}`}
      className={cn(
        'group flex flex-col items-center justify-center p-3 md:p-4 rounded-2xl',
        'bg-surface border border-border hover:border-brand-500 hover:shadow-brand/20',
        'transition-all',
        className,
      )}
    >
      <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br from-brand-100 to-emerald-100 dark:from-brand-900/40 dark:to-emerald-900/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5 md:h-6 md:w-6 text-brand-700 dark:text-brand-400" />
      </div>
      <span className="text-2xs md:text-xs font-black text-content text-center line-clamp-1 capitalize">
        {name}
      </span>
      {count != null && (
        <span className="text-2xs text-content-subtle font-medium mt-0.5">{count}+</span>
      )}
    </Link>
  );
}
