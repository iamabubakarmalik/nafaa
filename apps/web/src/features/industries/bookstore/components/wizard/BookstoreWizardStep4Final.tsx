import { useQuery } from '@tanstack/react-query';
import {
  Image as ImageIcon, Tag, AlertCircle, CheckCircle2, Info,
  BookOpen, Palette, Sparkles, Package,
} from 'lucide-react';
import { UploadDropzone } from '@/components/uploads';
import { tagsApi } from '@/api/tags.api';
import { formatPKRFull } from '@/lib/format';
import type { BookstoreWizardBasic, BookstoreWizardBookDetails } from '../../hooks/useBookstoreWizard';

interface Props {
  basic: BookstoreWizardBasic;
  book: BookstoreWizardBookDetails;
  onBasicChange: (patch: Partial<BookstoreWizardBasic>) => void;
  errors: string[];
}

export function BookstoreWizardStep4Final({ basic, book, onBasicChange, errors }: Props) {
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const toggleTag = (id: string) => {
    const current = basic.tagIds ?? [];
    onBasicChange({ tagIds: current.includes(id) ? current.filter((t) => t !== id) : [...current, id] });
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Images */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shadow-md">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base leading-tight">Product Images</h3>
            <p className="text-xs text-slate-500 font-semibold">Pehla image primary — catalog & POS par dikhega</p>
          </div>
        </div>

        <UploadDropzone
          purpose="product-image"
          maxFiles={10}
          onUploaded={(records) => {
            onBasicChange({ imageUrls: [...(basic.imageUrls ?? []), ...records.map((r) => r.url)] });
          }}
          hint="Drop up to 10 images (book cover, product shots)"
        />

        {basic.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {basic.imageUrls.map((url, idx) => (
              <div key={url + idx} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt={`product-${idx}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-extrabold">PRIMARY</div>
                )}
                <button
                  onClick={() => onBasicChange({ imageUrls: basic.imageUrls.filter((_, i) => i !== idx) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                >×</button>
              </div>
            ))}
          </div>
        )}

        {basic.imageUrls.length === 0 && (
          <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 font-semibold">
              💡 Tip: Kitab ka cover ya product ki photo add karo — customers ko decision karne mein help milegi.
            </div>
          </div>
        )}
      </section>

      {/* Tags */}
      {allTags.length > 0 && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">Tags</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {basic.tagIds.length} selected — organize aur search mein help
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => {
              const active = basic.tagIds?.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={[
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-bold transition',
                    active ? 'shadow-sm' : 'opacity-60 hover:opacity-100',
                  ].join(' ')}
                  style={{
                    backgroundColor: active ? `${t.color}20` : '#fff',
                    borderColor: active ? t.color : '#e2e8f0',
                    color: active ? t.color : '#475569',
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Final Review */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-emerald-200">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shadow-md">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-emerald-900 text-base leading-tight">Final Review</h3>
            <p className="text-xs text-emerald-700 font-semibold">Save karne se pehle verify karo</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <ReviewCard icon={Package} label="Product Type" value={
            basic.productType === 'BOOK' ? '📚 Book' :
            basic.productType === 'STATIONERY' ? '✏️ Stationery' :
            '🎨 Art Supply'
          } />
          <ReviewCard icon={Tag} label="Name" value={basic.name || 'Not set'} truncate />
          <ReviewCard icon={ImageIcon} label="Images" value={`${basic.imageUrls.length} uploaded`} />
          <ReviewCard icon={Package} label="Stock" value={`${Number(basic.stock || 0)} ${basic.unit}`} />
          <ReviewCard icon={Tag} label="Sale Price" value={formatPKRFull(Number(basic.salePrice || 0))} />
          {Number(basic.mrp || 0) > 0 && (
            <ReviewCard icon={Tag} label="MRP" value={formatPKRFull(Number(basic.mrp || 0))} />
          )}
          {basic.productType === 'BOOK' && book.publisherId && (
            <ReviewCard icon={BookOpen} label="Publisher" value="Selected ✓" />
          )}
          {basic.productType === 'BOOK' && book.authorIds.length > 0 && (
            <ReviewCard icon={BookOpen} label="Authors" value={`${book.authorIds.length} linked`} />
          )}
        </div>

        <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 font-semibold">
            💾 Save karne ke baad product edit karne ke liye detail page se "Edit" button use karna.
            Draft auto-saves ho raha hai — page reload karne se data reh jayega.
          </div>
        </div>
      </section>
    </div>
  );
}

function ReviewCard({ icon: Icon, label, value, truncate }: any) {
  return (
    <div className="rounded-xl bg-white border-2 border-slate-200 p-3 flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">{label}</div>
        <div className={['text-sm font-extrabold text-slate-900', truncate ? 'truncate' : ''].join(' ')}>{value}</div>
      </div>
    </div>
  );
}
