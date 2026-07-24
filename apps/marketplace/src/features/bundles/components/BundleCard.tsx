import { Link } from 'react-router-dom';
import { Package, Tag, ShoppingBag, Sparkles } from 'lucide-react';
import { Card, Badge } from '@/ui';
import { formatPrice } from '@/lib/format';

export function BundleCard({ bundle }: { bundle: any }) {
  const savings = Number(bundle.regularTotal) - Number(bundle.bundlePrice);
  const savingsPct = Math.round((savings / Number(bundle.regularTotal)) * 100);

  return (
    <Link to={`/bundles/${bundle.id}`}>
      <Card className="overflow-hidden hover:shadow-soft-lg transition group card-hover">
        {/* Products collage */}
        <div className="relative aspect-video bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
            {bundle.items?.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="bg-white/95 rounded-lg overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-content-subtle" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="absolute top-2 left-2">
            <Badge variant="default" size="md" className="shadow-lg bg-purple-600 text-white">
              <Package className="h-3 w-3" />
              BUNDLE
            </Badge>
          </div>
          {savingsPct > 0 && (
            <div className="absolute top-2 right-2">
              <Badge variant="danger" size="md" className="shadow-lg">
                <Tag className="h-3 w-3" />
                Save {savingsPct}%
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-black text-content text-sm line-clamp-2">{bundle.title}</h3>
          <div className="text-2xs text-content-muted">{bundle.items?.length || 0} products included</div>

          <div className="flex items-baseline gap-2 pt-2">
            <span className="font-black text-brand-600 dark:text-brand-400 text-lg">
              {formatPrice(bundle.bundlePrice)}
            </span>
            <span className="text-xs text-content-subtle line-through">
              {formatPrice(bundle.regularTotal)}
            </span>
          </div>

          {savings > 0 && (
            <div className="text-2xs font-black text-brand-600 dark:text-brand-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              You save {formatPrice(savings)}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
