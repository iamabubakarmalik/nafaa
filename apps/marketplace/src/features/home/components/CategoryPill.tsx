import { NavLink } from 'react-router-dom';

const CATEGORY_EMOJIS: Record<string, string> = {
  FOOD: '🍔', GROCERY: '🛒', PHARMACY: '💊', JEWELRY: '💎',
  CLOTHES: '👕', ELECTRONICS: '📱', BAKERY: '🍰', RESTAURANT: '🍽️',
  MEAT: '🥩', DAIRY: '🥛', HARDWARE: '🔧', BOOKS: '📚',
  SALON: '💇', GYM: '💪', CLINIC: '🏥', AUTOPARTS: '🚗',
  HOTEL: '🏨', CARPET: '🪄', AGRI: '🌾', GARMENTS: '👗',
  BEAUTY: '💄', TOYS: '🧸', SPORTS: '⚽', HOME: '🏠',
};

export function CategoryPill({ name, count }: { name: string; count: number }) {
  const emoji = CATEGORY_EMOJIS[name?.toUpperCase()] || '🏷️';
  return (
    <NavLink
      to={`/market/search?category=${encodeURIComponent(name)}`}
      className="group flex flex-col items-center gap-2 min-w-[80px] transition"
    >
      <div className="h-16 w-16 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-soft flex items-center justify-center text-3xl group-hover:scale-110 group-hover:shadow-brand transition-all group-hover:border-brand-300">
        {emoji}
      </div>
      <div className="text-center">
        <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight line-clamp-1">
          {name}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
          {count} items
        </div>
      </div>
    </NavLink>
  );
}
