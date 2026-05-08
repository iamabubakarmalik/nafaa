import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles, Package, Users, Building2, ShoppingCart, Check, X, ArrowRight,
} from 'lucide-react';
import { planUsageApi } from '@/api/plan-usage.api';
import { Button } from '@/components/ui/Button';

interface UsageBarProps {
  label: string;
  current: number;
  limit: number;
  icon: any;
}

const UsageBar = ({ label, current, limit, icon: Icon }: UsageBarProps) => {
  const isUnlimited = limit >= 999999;
  const percentage = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);
  const danger = percentage >= 90;
  const warning = percentage >= 75 && percentage < 90;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            danger ? 'bg-rose-100 text-rose-700' :
            warning ? 'bg-amber-100 text-amber-700' :
            'bg-brand-100 text-brand-700'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="font-semibold text-slate-900">{label}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-slate-900">
            {current.toLocaleString()}
            {!isUnlimited && (
              <span className="text-sm text-slate-500"> / {limit.toLocaleString()}</span>
            )}
          </div>
          {isUnlimited && (
            <div className="text-xs text-emerald-700 font-semibold">Unlimited</div>
          )}
        </div>
      </div>

      {!isUnlimited && (
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              danger ? 'bg-rose-500' : warning ? 'bg-amber-500' : 'bg-brand-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {danger && !isUnlimited && (
        <div className="mt-2 text-xs text-rose-700 font-semibold">
          ⚠️ Limit ke kareeb! Upgrade karein
        </div>
      )}
    </div>
  );
};

const FeatureItem = ({ enabled, label }: { enabled: boolean; label: string }) => (
  <div className={`flex items-center gap-2 text-sm py-1.5 ${enabled ? '' : 'opacity-50'}`}>
    {enabled ? (
      <Check className="h-4 w-4 text-emerald-600" />
    ) : (
      <X className="h-4 w-4 text-slate-400" />
    )}
    <span className={enabled ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
  </div>
);

export default function PlanUsagePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['plan-usage'],
    queryFn: planUsageApi.me,
  });

  if (isLoading || !data) {
    return <div className="p-6 text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Current Plan
            </div>
            <h2 className="mt-3 text-3xl font-bold">{data.plan.name}</h2>
            <p className="mt-2 text-sm text-white/80">
              Aap ke account ka usage aur features
            </p>
          </div>
          <Link to="/plans">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              Upgrade Plan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3">Usage Limits</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <UsageBar
            label="Products"
            current={data.usage.products.current}
            limit={data.usage.products.limit}
            icon={Package}
          />
          <UsageBar
            label="Team Users"
            current={data.usage.users.current}
            limit={data.usage.users.limit}
            icon={Users}
          />
          <UsageBar
            label="Shops / Branches"
            current={data.usage.shops.current}
            limit={data.usage.shops.limit}
            icon={Building2}
          />
          <UsageBar
            label="Sales (this month)"
            current={data.usage.salesThisMonth.current}
            limit={data.usage.salesThisMonth.limit}
            icon={ShoppingCart}
          />
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3">Available Features</h3>
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
            <FeatureItem enabled={data.features.pos} label="POS Counter" />
            <FeatureItem enabled={data.features.barcodeScanner} label="Barcode Scanner" />
            <FeatureItem enabled={data.features.khata} label="Khata (Udhaar)" />
            <FeatureItem enabled={data.features.cashRegister} label="Cash Register" />
            <FeatureItem enabled={data.features.returns} label="Returns" />
            <FeatureItem enabled={data.features.notifications} label="Notifications" />
            <FeatureItem enabled={data.features.reports} label="Reports & Analytics" />
            <FeatureItem enabled={data.features.profitReport} label="Profit by Product" />
            <FeatureItem enabled={data.features.discounts} label="Discount Codes" />
            <FeatureItem enabled={data.features.loyalty} label="Loyalty Points" />
            <FeatureItem enabled={data.features.multiShop} label="Multi-Shop Support" />
            <FeatureItem enabled={data.features.stockTransfer} label="Stock Transfer" />
            <FeatureItem enabled={data.features.exports} label="Excel/PDF Exports" />
            <FeatureItem enabled={data.features.backup} label="Backup & Restore" />
            <FeatureItem enabled={data.features.whatsappReceipt} label="WhatsApp Receipt" />
            <FeatureItem enabled={data.features.customBranding} label="Custom Branding" />
            <FeatureItem enabled={data.features.support24x7} label="24/7 Priority Support" />
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-slate-600">
              Locked features ko unlock karne ke liye plan upgrade karein
            </p>
            <Link to="/plans">
              <Button>
                <Sparkles className="h-4 w-4" />
                See All Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
