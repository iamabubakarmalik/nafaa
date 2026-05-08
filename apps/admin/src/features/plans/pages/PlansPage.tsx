import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Plus, Edit, Trash2, X, Check,
} from 'lucide-react';
import { adminPlansApi, type AdminPlan, type UpsertPlanPayload } from '@/api/admin-plans.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';

const FEATURE_KEYS: Array<keyof UpsertPlanPayload> = [
  'featurePos', 'featureBarcodeScanner', 'featureMultiShop', 'featureReports',
  'featureProfitReport', 'featureLoyalty', 'featureDiscounts', 'featureKhata',
  'featureExports', 'featureBackup', 'featureNotifications', 'featureCashRegister',
  'featureStockTransfer', 'featureReturns', 'featureSupport24x7',
  'featureWhatsappReceipt', 'featureCustomBranding',
];

const FEATURE_LABELS: Record<string, string> = {
  featurePos: 'POS',
  featureBarcodeScanner: 'Barcode Scanner',
  featureMultiShop: 'Multi-Shop',
  featureReports: 'Reports',
  featureProfitReport: 'Profit Reports',
  featureLoyalty: 'Loyalty Points',
  featureDiscounts: 'Discount Codes',
  featureKhata: 'Khata',
  featureExports: 'Exports',
  featureBackup: 'Backup',
  featureNotifications: 'Notifications',
  featureCashRegister: 'Cash Register',
  featureStockTransfer: 'Stock Transfer',
  featureReturns: 'Returns',
  featureSupport24x7: '24/7 Support',
  featureWhatsappReceipt: 'WhatsApp Receipt',
  featureCustomBranding: 'Custom Branding',
};

const emptyPlan: UpsertPlanPayload = {
  name: '',
  slug: '',
  description: '',
  priceMonthly: 0,
  priceQuarterly: 0,
  priceYearly: 0,
  trialDays: 7,
  isActive: true,
  isPublic: true,
  sortOrder: 0,
  maxProducts: 50,
  maxUsers: 2,
  maxShops: 1,
  maxSalesPerMonth: 500,
  featurePos: true,
  featureBarcodeScanner: true,
  featureMultiShop: false,
  featureReports: true,
  featureProfitReport: false,
  featureLoyalty: false,
  featureDiscounts: false,
  featureKhata: true,
  featureExports: false,
  featureBackup: false,
  featureNotifications: true,
  featureCashRegister: true,
  featureStockTransfer: false,
  featureReturns: true,
  featureSupport24x7: false,
  featureWhatsappReceipt: false,
  featureCustomBranding: false,
};

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [editPlan, setEditPlan] = useState<AdminPlan | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: adminPlansApi.list,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-admin-950 via-admin-900 to-admin-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Plans Management
            </div>
            <h2 className="mt-3 text-3xl font-bold">Subscription Plans</h2>
            <p className="mt-2 text-sm text-white/80">
              Plans create karein, prices set karein, features control karein
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-white text-slate-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" />
            New Plan
          </Button>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <div className="text-xs text-slate-500 font-mono">{plan.slug}</div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditPlan(plan)}
                  className="text-slate-700 hover:bg-slate-100 rounded-lg p-2"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${plan.name}?`)) {
                      adminPlansApi.remove(plan.id).then(() => {
                        toast.success('Deleted');
                        queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
                      });
                    }
                  }}
                  className="text-rose-600 hover:bg-rose-50 rounded-lg p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-600 mt-2">{plan.description || 'No description'}</p>

            <div className="mt-4 flex gap-2 flex-wrap">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${plan.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${plan.isPublic ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {plan.isPublic ? 'Public' : 'Private'}
              </span>
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
                {plan._count?.subscriptions ?? 0} subs
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[10px] text-slate-500">Monthly</div>
                <div className="font-bold text-slate-900">{formatPKR(plan.priceMonthly)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[10px] text-slate-500">Quarterly</div>
                <div className="font-bold text-slate-900">{formatPKR(plan.priceQuarterly)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[10px] text-slate-500">Yearly</div>
                <div className="font-bold text-slate-900">{formatPKR(plan.priceYearly)}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-600">Products: <span className="font-bold">{plan.maxProducts}</span></div>
              <div className="text-slate-600">Users: <span className="font-bold">{plan.maxUsers}</span></div>
              <div className="text-slate-600">Shops: <span className="font-bold">{plan.maxShops}</span></div>
              <div className="text-slate-600">Sales/mo: <span className="font-bold">{plan.maxSalesPerMonth}</span></div>
            </div>
          </div>
        ))}
      </section>

      {(showCreate || editPlan) && (
        <PlanFormModal
          plan={editPlan}
          onClose={() => {
            setShowCreate(false);
            setEditPlan(null);
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
          }}
        />
      )}
    </div>
  );
}

function PlanFormModal({
  plan,
  onClose,
  onSaved,
}: {
  plan: AdminPlan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<UpsertPlanPayload>(
    plan
      ? {
          name: plan.name,
          slug: plan.slug,
          description: plan.description ?? '',
          priceMonthly: plan.priceMonthly,
          priceQuarterly: plan.priceQuarterly,
          priceYearly: plan.priceYearly,
          trialDays: plan.trialDays,
          isActive: plan.isActive,
          isPublic: plan.isPublic,
          sortOrder: plan.sortOrder,
          maxProducts: plan.maxProducts,
          maxUsers: plan.maxUsers,
          maxShops: plan.maxShops,
          maxSalesPerMonth: plan.maxSalesPerMonth,
          featurePos: plan.featurePos,
          featureBarcodeScanner: plan.featureBarcodeScanner,
          featureMultiShop: plan.featureMultiShop,
          featureReports: plan.featureReports,
          featureProfitReport: plan.featureProfitReport,
          featureLoyalty: plan.featureLoyalty,
          featureDiscounts: plan.featureDiscounts,
          featureKhata: plan.featureKhata,
          featureExports: plan.featureExports,
          featureBackup: plan.featureBackup,
          featureNotifications: plan.featureNotifications,
          featureCashRegister: plan.featureCashRegister,
          featureStockTransfer: plan.featureStockTransfer,
          featureReturns: plan.featureReturns,
          featureSupport24x7: plan.featureSupport24x7,
          featureWhatsappReceipt: plan.featureWhatsappReceipt,
          featureCustomBranding: plan.featureCustomBranding,
        }
      : emptyPlan,
  );

  const mutation = useMutation({
    mutationFn: () =>
      plan ? adminPlansApi.update(plan.id, form) : adminPlansApi.create(form),
    onSuccess: () => {
      toast.success(plan ? 'Plan updated' : 'Plan created');
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const setBool = (key: keyof UpsertPlanPayload, value: boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold">{plan ? 'Edit Plan' : 'Create Plan'}</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Input
              label="Description"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <Input
            label="Price Monthly (PKR)"
            type="number"
            value={form.priceMonthly}
            onChange={(e) => setForm({ ...form, priceMonthly: Number(e.target.value) })}
          />
          <Input
            label="Price Quarterly (PKR)"
            type="number"
            value={form.priceQuarterly}
            onChange={(e) => setForm({ ...form, priceQuarterly: Number(e.target.value) })}
          />
          <Input
            label="Price Yearly (PKR)"
            type="number"
            value={form.priceYearly}
            onChange={(e) => setForm({ ...form, priceYearly: Number(e.target.value) })}
          />
          <Input
            label="Trial Days"
            type="number"
            value={form.trialDays ?? 0}
            onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })}
          />
          <Input
            label="Sort Order"
            type="number"
            value={form.sortOrder ?? 0}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          />
          <Input
            label="Max Products"
            type="number"
            value={form.maxProducts}
            onChange={(e) => setForm({ ...form, maxProducts: Number(e.target.value) })}
          />
          <Input
            label="Max Users"
            type="number"
            value={form.maxUsers}
            onChange={(e) => setForm({ ...form, maxUsers: Number(e.target.value) })}
          />
          <Input
            label="Max Shops"
            type="number"
            value={form.maxShops}
            onChange={(e) => setForm({ ...form, maxShops: Number(e.target.value) })}
          />
          <Input
            label="Max Sales / Month"
            type="number"
            value={form.maxSalesPerMonth}
            onChange={(e) => setForm({ ...form, maxSalesPerMonth: Number(e.target.value) })}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => setBool('isActive', e.target.checked)}
              className="h-4 w-4"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPublic ?? true}
              onChange={(e) => setBool('isPublic', e.target.checked)}
              className="h-4 w-4"
            />
            Public (visible on plans page)
          </label>
        </div>

        <div className="mt-5">
          <h4 className="font-semibold text-slate-900 mb-2">Features</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FEATURE_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={(form[k] as boolean) ?? false}
                  onChange={(e) => setBool(k, e.target.checked)}
                  className="h-4 w-4"
                />
                {FEATURE_LABELS[k as string]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} className="flex-1">
            <Check className="h-4 w-4" />
            {plan ? 'Save Changes' : 'Create Plan'}
          </Button>
        </div>
      </div>
    </div>
  );
}
