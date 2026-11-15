/** Icon for each gate, matching the POS industry icons. */
import { CalendarCheck, Pill, ShoppingBag, ShoppingBasket, Truck, UtensilsCrossed, type LucideProps } from 'lucide-react';
import type { Gate } from '@/lib/types';

const ICONS: Record<Gate, (p: LucideProps) => React.ReactNode> = {
  FOOD: UtensilsCrossed,
  GROCERY: ShoppingBasket,
  PHARMACY: Pill,
  SHOPPING: ShoppingBag,
  BOOKING: CalendarCheck,
  WHOLESALE: Truck,
};

export function GateIcon({ gate, ...p }: { gate: Gate } & LucideProps) {
  const Icon = ICONS[gate] ?? ShoppingBag;
  return <Icon aria-hidden {...p} />;
}
