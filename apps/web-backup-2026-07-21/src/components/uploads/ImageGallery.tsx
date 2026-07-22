import { Star, StarOff, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface GalleryImage {
  id: string;
  url: string;
  thumbnail?: string | null;
  alt?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

interface Props {
  images: GalleryImage[];
  onSetPrimary?: (id: string) => void;
  onRemove?: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  className?: string;
}

export function ImageGallery({
  images,
  onSetPrimary,
  onRemove,
  onReorder,
  className,
}: Props) {
  if (!images.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
        No images yet — upload some above
      </div>
    );
  }

  const move = (id: string, direction: -1 | 1) => {
    if (!onReorder) return;
    const idx = images.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= images.length) return;
    const reordered = [...images];
    const [removed] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, removed);
    onReorder(reordered.map((i) => i.id));
  };

  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3',
        className,
      )}
    >
      {images.map((img, idx) => (
        <div
          key={img.id}
          className={cn(
            'relative group rounded-xl overflow-hidden border-2 bg-white',
            img.isPrimary
              ? 'border-amber-400 ring-2 ring-amber-200'
              : 'border-slate-200',
          )}
        >
          <div className="aspect-square bg-slate-100">
            <img
              src={img.thumbnail || img.url}
              alt={img.alt || ''}
              className="w-full h-full object-cover"
            />
          </div>

          {img.isPrimary && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow">
              ⭐ PRIMARY
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
            <div className="flex gap-1">
              {onSetPrimary && !img.isPrimary && (
                <button
                  type="button"
                  onClick={() => onSetPrimary(img.id)}
                  className="h-7 w-7 rounded-lg bg-white text-amber-600 hover:bg-amber-50 flex items-center justify-center shadow"
                  title="Set as primary"
                >
                  <StarOff className="h-3.5 w-3.5" />
                </button>
              )}
              {onReorder && (
                <>
                  <button
                    type="button"
                    onClick={() => move(img.id, -1)}
                    disabled={idx === 0}
                    className="h-7 w-7 rounded-lg bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(img.id, 1)}
                    disabled={idx === images.length - 1}
                    className="h-7 w-7 rounded-lg bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center shadow disabled:opacity-40"
                  >
                    →
                  </button>
                </>
              )}
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                className="h-7 w-7 rounded-lg bg-rose-600 hover:bg-rose-700 flex items-center justify-center shadow"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
