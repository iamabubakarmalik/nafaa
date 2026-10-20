import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ScanLine, Check, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { imeiApi, type ProductImei, type PtaStatus } from '../api/imei.api';
import { PtaStatusBadge } from './PtaStatusBadge';
import { Input, Modal } from '@/design-system/components';

interface Props {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  onSelect: (imei: ProductImei) => void;
  onClose: () => void;
  /** Optional: already selected IMEIs to disable */
  excludeIds?: string[];
}

export function ImeiPickerModal({
  productId, productName, variantId, variantName, onSelect, onClose, excludeIds = [],
}: Props) {
  const [search, setSearch] = useState('');

  const { data: imeis = [], isLoading } = useQuery({
    queryKey: ['imei-available', productId, variantId],
    queryFn: () => imeiApi.available(productId, variantId),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return imeis;
    return imeis.filter(
      (i) =>
        i.imei1.toLowerCase().includes(q) ||
        (i.imei2 || '').toLowerCase().includes(q) ||
        (i.serialNumber || '').toLowerCase().includes(q) ||
        (i.color || '').toLowerCase().includes(q),
    );
  }, [imeis, search]);

  const excludedSet = new Set(excludeIds);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={productName}
      description={`IMEI chunein${variantName ? ` · ${variantName}` : ''} · ${imeis.length} mojood · ${filtered.length} dikh rahe`}
      footer={(
        <span className="mr-auto inline-flex items-center gap-1.5 text-[0.6875rem] text-slate-500">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Purana Stock pehle dikhta hai
        </span>
      )}
    >
      {/* Search */}
      <div className="sticky -top-4 z-10 -mx-5 -mt-4 mb-3 border-b border-slate-100 bg-white px-5 py-3">
        <Input
          data-autofocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="IMEI / Serial scan karein ya likhein"
          className="font-mono"
          leftIcon={<ScanLine className="h-4 w-4 text-blue-600" />}
          rightIcon={search ? (
            <button
              type="button"
              aria-label="Saaf karein"
              onClick={() => setSearch('')}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-200"
            >
              <X className="h-3.5 w-3.5 text-slate-500" />
            </button>
          ) : undefined}
        />
      </div>

      {/* IMEI list */}
      <div>
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-3">
              <AlertCircle className="h-7 w-7 text-rose-600" />
            </div>
            <div className="font-bold text-slate-900">
              {imeis.length === 0 ? 'Koi IMEI mojood nahi' : 'Koi IMEI nahi mila'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {imeis.length === 0
                ? 'Pehle product page se IMEI daalein'
                : 'Kuch aur likh kar dhoondein'}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((imei) => {
              const excluded = excludedSet.has(imei.id);
              return (
                <button
                  key={imei.id}
                  type="button"
                  onClick={() => !excluded && onSelect(imei)}
                  disabled={excluded}
                  className={`group w-full text-left rounded-2xl border-2 p-4 transition ${
                    excluded
                      ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md hover:bg-blue-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-slate-900 text-base">
                          {imei.imei1}
                        </span>
                        {excluded && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[0.6875rem] font-bold">
                            Bill me hai
                          </span>
                        )}
                        {imei.color && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[0.6875rem] font-bold">
                            {imei.color}
                          </span>
                        )}
                        <PtaStatusBadge
                          status={(imei.ptaStatus || 'PENDING') as PtaStatus}
                          size="sm"
                          taxPaid={imei.ptaTaxPaid}
                        />
                      </div>

                      {imei.imei2 && (
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                          IMEI 2: {imei.imei2}
                        </div>
                      )}
                      {imei.serialNumber && (
                        <div className="text-xs text-slate-500 font-mono">
                          S/N: {imei.serialNumber}
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-2 flex-wrap text-[0.6875rem]">
                        {imei.warrantyMonths && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold">
                            <ShieldCheck className="h-3 w-3" />
                            {imei.warrantyMonths} mahine warranty
                          </span>
                        )}
                        {imei.purchasedAt && (
                          <span className="text-slate-500">
                            Stock me aaya: {new Date(imei.purchasedAt).toLocaleDateString('en-PK')}
                          </span>
                        )}
                      </div>
                    </div>

                    {!excluded && (
                      <div className="shrink-0 mt-1">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition">
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
