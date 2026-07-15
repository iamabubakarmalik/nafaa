import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, Save, Sparkles, Star, Utensils, Package, Smartphone,
  Eye, RefreshCw, Check,
} from 'lucide-react';
import { receiptConfigApi, type ReceiptConfig, type ReceiptTemplate } from '../api/receipt-config.api';
import { UniversalReceipt } from '../components/UniversalReceipt';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const TEMPLATES: { value: ReceiptTemplate; label: string; icon: any; desc: string }[] = [
  { value: 'STANDARD', label: 'Standard / Retail', icon: Package, desc: 'Kiryana, general store' },
  { value: 'RESTAURANT', label: 'Restaurant / Cafe', icon: Utensils, desc: 'Dine-in, takeaway, delivery' },
  { value: 'CARPET', label: 'Carpet / Flooring', icon: Star, desc: 'Dimensions, sqft, rolls' },
  { value: 'MOBILE', label: 'Mobile / Electronics', icon: Smartphone, desc: 'IMEI, warranty, serial' },
];

export default function ReceiptSettingsPage() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ReceiptConfig | null>(null);

  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['receipt-config'],
    queryFn: () => receiptConfigApi.get(),
  });

  useEffect(() => {
    if (existingConfig) setConfig(existingConfig);
  }, [existingConfig]);

  const saveMutation = useMutation({
    mutationFn: () => receiptConfigApi.update(config!),
    onSuccess: () => {
      toast.success('Receipt settings saved');
      queryClient.invalidateQueries({ queryKey: ['receipt-config'] });
    },
  });

  if (isLoading || !config) {
    return <div className="h-96 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />;
  }

  // Current template options
  const isRestaurant = config.template === 'RESTAURANT';
  const isCarpet = config.template === 'CARPET';
  const isMobile = config.template === 'MOBILE';

  const toggle = (key: keyof ReceiptConfig) => {
    setConfig({ ...config, [key]: !config[key] });
  };

  // Preview sale data
  const previewSale = {
    saleNumber: 'RCP-001',
    soldAt: new Date().toISOString(),
    customerName: 'Demo Customer',
    customerPhone: '0300-1234567',
    items: isRestaurant
      ? [
          { name: 'Chicken Biryani', quantity: 2, basePrice: 350, total: 700, modifiers: [{ modifierOption: { name: 'Extra Spicy' }, priceAdjustment: 0, quantity: 1 }], specialInstructions: 'Less oil' },
          { name: 'Coca Cola', quantity: 2, basePrice: 100, total: 200 },
        ]
      : isCarpet
      ? [
          { name: 'Persian Carpet', quantity: 1, basePrice: 250, total: 3750, cutWidthFt: 12, cutLengthFt: 12.5, cutSqft: 150, rollNumber: 'R-001' },
        ]
      : isMobile
      ? [
          { name: 'Samsung Galaxy A55', quantity: 1, basePrice: 85000, total: 85000, imeiNumber: '356789104567890' },
        ]
      : [
          { name: 'Colgate Toothpaste', quantity: 2, basePrice: 150, total: 300, unit: 'piece' },
          { name: 'Lipton Tea 950g', quantity: 1, basePrice: 1200, total: 1200, unit: 'pack' },
        ],
    subtotal: isRestaurant ? 900 : isCarpet ? 3750 : isMobile ? 85000 : 1500,
    serviceCharge: isRestaurant ? 90 : 0,
    serviceChargePct: 10,
    taxAmount: isRestaurant ? 99 : 0,
    taxPct: 10,
    discount: 0,
    total: isRestaurant ? 1089 : isCarpet ? 3750 : isMobile ? 85000 : 1500,
    paidAmount: isRestaurant ? 1089 : isCarpet ? 3750 : isMobile ? 85000 : 1500,
    paymentMethod: 'CASH',
    tableNumber: isRestaurant ? 'T-05' : undefined,
    orderMode: isRestaurant ? 'DINE_IN' : undefined,
    numberOfGuests: isRestaurant ? 4 : undefined,
    waiterName: isRestaurant ? 'Ahmed' : undefined,
    kotNumber: isRestaurant ? 'KOT-001' : undefined,
  };

  const previewShop = {
    name: 'My Store',
    address: 'Main Boulevard, Lahore',
    phone: '042-1234567',
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-blue-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <Printer className="h-7 w-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3 w-3 text-amber-300" />
              Receipt Settings
            </div>
            <h1 className="mt-2 text-3xl font-extrabold">🧾 Receipt Configuration</h1>
            <p className="text-sm text-white/80 font-semibold">Industry-specific receipt template + print settings</p>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* LEFT — Settings */}
        <div className="space-y-4">
          {/* Template Picker */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white">Receipt Template</h3>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                const active = config.template === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setConfig({ ...config, template: t.value })}
                    className={
                      'p-4 rounded-2xl border-2 text-left transition ' +
                      (active
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow'
                        : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-indigo-300')
                    }
                  >
                    <Icon className={'h-8 w-8 mb-2 ' + (active ? 'text-indigo-600' : 'text-slate-400')} />
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">{t.label}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">{t.desc}</div>
                    {active && <Check className="h-4 w-4 text-indigo-600 mt-1" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Common Settings */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white">Header & Shop Info</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'showLogo', label: 'Logo' },
                { key: 'showShopName', label: 'Shop Name' },
                { key: 'showShopAddress', label: 'Address' },
                { key: 'showShopPhone', label: 'Phone' },
                { key: 'showCustomer', label: 'Customer Info' },
                { key: 'showFooter', label: 'Footer Text' },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-slate-200 dark:border-neutral-700 cursor-pointer hover:border-indigo-300">
                  <input type="checkbox" checked={(config as any)[opt.key]} onChange={() => toggle(opt.key as any)} className="h-4 w-4 rounded" />
                  <span className="text-xs font-extrabold">{opt.label}</span>
                </label>
              ))}
            </div>

            {config.showFooter && (
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Footer Text</label>
                <input
                  value={config.footerText}
                  onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </section>

          {/* Industry-Specific Settings */}
          {isRestaurant && (
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-orange-200 dark:border-orange-800 shadow-sm p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Utensils className="h-4 w-4 text-orange-600" />
                Restaurant-Specific
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'showTableNumber', label: 'Table Number' },
                  { key: 'showOrderMode', label: 'Order Mode' },
                  { key: 'showWaiterName', label: 'Waiter Name' },
                  { key: 'showModifiers', label: 'Modifiers' },
                  { key: 'showSpecialInstructions', label: 'Instructions' },
                  { key: 'showServiceCharge', label: 'Service Charge' },
                  { key: 'showTaxBreakdown', label: 'Tax Breakdown' },
                  { key: 'showTip', label: 'Tip' },
                  { key: 'showKot', label: 'KOT / Kitchen Copy' },
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-slate-200 dark:border-neutral-700 cursor-pointer hover:border-orange-300">
                    <input type="checkbox" checked={(config as any)[opt.key] ?? false} onChange={() => toggle(opt.key as any)} className="h-4 w-4 rounded" />
                    <span className="text-xs font-extrabold">{opt.label}</span>
                  </label>
                ))}
              </div>
              {config.showKot && (
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Print Copies</label>
                  <select
                    value={config.copies}
                    onChange={(e) => setConfig({ ...config, copies: Number(e.target.value) as 1 | 2 })}
                    className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold"
                  >
                    <option value={1}>1 copy (Customer only)</option>
                    <option value={2}>2 copies (Customer + Kitchen KOT)</option>
                  </select>
                </div>
              )}
            </section>
          )}

          {isCarpet && (
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Star className="h-4 w-4 text-emerald-600" />
                Carpet-Specific
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'showDimensions', label: 'Dimensions (W×L)' },
                  { key: 'showSqft', label: 'Square Feet' },
                  { key: 'showRollNumber', label: 'Roll Number' },
                  { key: 'showCutDetails', label: 'Cut Details' },
                  { key: 'showWholesalePrice', label: 'Wholesale Price' },
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-slate-200 dark:border-neutral-700 cursor-pointer hover:border-emerald-300">
                    <input type="checkbox" checked={(config as any)[opt.key] ?? false} onChange={() => toggle(opt.key as any)} className="h-4 w-4 rounded" />
                    <span className="text-xs font-extrabold">{opt.label}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {isMobile && (
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-blue-200 dark:border-blue-800 shadow-sm p-5 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                Mobile-Specific
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'showImei', label: 'IMEI Number' },
                  { key: 'showWarranty', label: 'Warranty Info' },
                  { key: 'showSerialNumber', label: 'Serial Number' },
                  { key: 'showPtaStatus', label: 'PTA Status' },
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-slate-200 dark:border-neutral-700 cursor-pointer hover:border-blue-300">
                    <input type="checkbox" checked={(config as any)[opt.key] ?? false} onChange={() => toggle(opt.key as any)} className="h-4 w-4 rounded" />
                    <span className="text-xs font-extrabold">{opt.label}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Print Settings */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white">Print Settings</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Paper Width</label>
                <select
                  value={config.paperWidth}
                  onChange={(e) => setConfig({ ...config, paperWidth: Number(e.target.value) as 58 | 80 })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold"
                >
                  <option value={58}>58mm thermal</option>
                  <option value={80}>80mm thermal</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Font Size</label>
                <select
                  value={config.fontSize}
                  onChange={(e) => setConfig({ ...config, fontSize: e.target.value as any })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold"
                >
                  <option value="small">Small</option>
                  <option value="normal">Normal</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">QR Code</label>
                <label className="flex items-center gap-2 h-11 p-2.5 rounded-xl border-2 border-slate-200 dark:border-neutral-700 cursor-pointer">
                  <input type="checkbox" checked={config.showQRCode ?? false} onChange={() => toggle('showQRCode')} className="h-4 w-4 rounded" />
                  <span className="text-xs font-extrabold">Show QR</span>
                </label>
              </div>
            </div>
          </section>

          {/* Save */}
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-700"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
          >
            <Save className="h-5 w-5" />
            Save Receipt Settings
          </Button>
        </div>

        {/* RIGHT — Live Preview */}
        <aside className="space-y-3">
          <div className="text-center text-xs uppercase font-extrabold text-slate-500">
            <Eye className="h-3 w-3 inline mr-1" />
            Live Preview
          </div>
          <div className="bg-slate-100 dark:bg-neutral-800 rounded-2xl p-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
            <UniversalReceipt sale={previewSale} shop={previewShop} config={config} />
          </div>
        </aside>
      </div>
    </div>
  );
}