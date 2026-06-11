import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, ScanLine, Plus, Minus } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { productsApi, type Product } from '@/api/products.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';

interface LabelItem {
  product: Product;
  copies: number;
}

function BarcodeImage({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: 'CODE128',
          width: 1.6,
          height: 50,
          fontSize: 12,
          margin: 4,
        });
      } catch (e) {
        // ignore invalid barcodes
      }
    }
  }, [value]);
  return <svg ref={ref} />;
}

export default function BarcodeLabelsPage() {
  const { data } = useQuery({
    queryKey: ['products-for-labels'],
    queryFn: () => productsApi.list({ page: 1, limit: 200 }),
  });

  const [selected, setSelected] = useState<LabelItem[]>([]);

  const products = data?.items ?? [];
  const labelsToPrint = selected.flatMap((item) =>
    Array.from({ length: item.copies }, (_, i) => ({ ...item.product, _key: `${item.product.id}-${i}` })),
  );

  const addProduct = (product: Product) => {
    setSelected((prev) => {
      const existing = prev.find((p) => p.product.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.product.id === product.id ? { ...p, copies: p.copies + 1 } : p,
        );
      }
      return [...prev, { product, copies: 1 }];
    });
  };

  const updateCopies = (productId: string, delta: number) => {
    setSelected((prev) =>
      prev
        .map((p) =>
          p.product.id === productId ? { ...p, copies: Math.max(0, p.copies + delta) } : p,
        )
        .filter((p) => p.copies > 0),
    );
  };

  const handlePrint = () => {
    if (selected.length === 0) return;
    window.print();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-700 text-white p-6 shadow-soft print:hidden">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <ScanLine className="h-3.5 w-3.5" />
              Print Labels
            </div>
            <h2 className="mt-3 text-3xl font-bold">Barcode Labels</h2>
            <p className="mt-2 text-sm text-white/80">
              Apne products ke barcode stickers print karein
            </p>
          </div>
          <Button size="lg" onClick={handlePrint} className="bg-white text-slate-900 hover:bg-slate-100">
            <Printer className="h-4 w-4" />
            Print Labels ({labelsToPrint.length})
          </Button>
        </div>
      </section>

      <section className="grid lg:grid-cols-[400px_1fr] gap-6 print:grid-cols-1">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden print:hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Available Products</h3>
            <p className="text-xs text-slate-500">Click to add</p>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
            {products.filter((p) => p.barcode).map((product) => (
              <button
                key={product.id}
                onClick={() => addProduct(product)}
                className="w-full px-6 py-3 hover:bg-slate-50 text-left flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{product.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{product.barcode}</div>
                </div>
                <div className="text-sm font-medium text-slate-700">{formatPKR(product.price)}</div>
              </button>
            ))}
            {products.filter((p) => p.barcode).length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                Koi product barcode ke saath nahi hai. Pehle products mein barcode add karein.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 print:hidden">
            <h3 className="font-bold text-slate-900 mb-4">Selected for Print</h3>
            {selected.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center">
                Left side se products add karein
              </div>
            ) : (
              <div className="space-y-2">
                {selected.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{item.product.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{item.product.barcode}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCopies(item.product.id, -1)}
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center font-semibold">{item.copies}</span>
                      <button
                        onClick={() => updateCopies(item.product.id, 1)}
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 print:border-none print:shadow-none print:p-0 print:rounded-none">
            <h3 className="font-bold text-slate-900 mb-4 print:hidden">Print Preview</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
              {labelsToPrint.map((p) => (
                <div
                  key={p._key}
                  className="border border-slate-300 rounded-lg p-2 bg-white text-center"
                >
                  <div className="text-[10px] font-semibold truncate text-slate-900">{p.name}</div>
                  <div className="my-1 flex justify-center">
                    {p.barcode && <BarcodeImage value={p.barcode} />}
                  </div>
                  <div className="text-sm font-bold text-slate-900">{formatPKR(p.price)}</div>
                </div>
              ))}
              {labelsToPrint.length === 0 && (
                <div className="col-span-full text-center text-sm text-slate-500 py-8 print:hidden">
                  No labels selected
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
