import { Link } from 'react-router-dom';
import { GitCompare, X } from 'lucide-react';
import { useCompareStore } from '@/stores/compare.store';
import { cn } from '@/lib/cn';

export function CompareFloatingButton() {
  const { items, remove } = useCompareStore();

  if (items.length < 2) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-4 lg:left-auto lg:right-6 z-30 animate-slide-up">
      <div className="bg-surface rounded-3xl shadow-soft-lg border border-border p-3 flex items-center gap-3">
        {/* Thumbnails */}
        <div className="flex -space-x-2">
          {items.slice(0, 4).map((item) => (
            <div key={item.productId} className="relative">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-10 w-10 rounded-xl object-cover ring-2 ring-surface"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-surface-muted ring-2 ring-surface" />
              )}
              <button
                onClick={() => remove(item.productId)}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Info + Action */}
        <div className="hidden sm:block">
          <div className="text-2xs text-content-muted font-bold">Compare</div>
          <div className="text-sm font-black">{items.length} products</div>
        </div>

        <Link
          to="/compare"
          className="h-10 px-4 rounded-2xl bg-gradient-brand text-white flex items-center gap-1.5 text-sm font-black hover:scale-105 transition shrink-0"
        >
          <GitCompare className="h-4 w-4" />
          Compare
        </Link>
      </div>
    </div>
  );
}
