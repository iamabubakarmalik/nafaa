import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Truck, Building2, Calendar, Package, Printer,
  Receipt, Wallet, CheckCircle2, Layers, AlertTriangle,
  ExternalLink, FileText, User, CreditCard, Banknote, Smartphone,
  Zap, Building, ShoppingCart, Phone, Mail, MapPin, Hash,
  TrendingUp, ArrowRight, Award, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { purchasesApi } from '@/api/purchases.api';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const paymentLabels: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash',
  EASYPAISA: 'EasyPaisa', BANK_TRANSFER: 'Bank Transfer',
};

const paymentIcons: Record<string, any> = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building,
};

const statusColors: Record<string, string> = {
  RECEIVED: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 border-amber-300',
  CANCELLED: 'bg-rose-100 text-rose-700 border-rose-300',
};

export default function PurchaseDetailPage() {
  const { id } = useParams();

  const { data: purchase, isLoading } = useQuery({
    queryKey: ['purchase-detail', id],
    queryFn: () => purchasesApi.getOne(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="inline-block h-10 w-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200 p-16 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
        <h3 className="font-bold text-slate-900">Purchase not found</h3>
        <Link to="/purchases" className="mt-4 text-sm font-bold text-orange-600 hover:underline inline-block">
          ← Back to Purchases
        </Link>
      </div>
    );
  }

  const balance = Math.max(purchase.total - purchase.paidAmount, 0);
  const carpetRolls = purchase.carpetRolls ?? [];
  const hasCarpetRolls = carpetRolls.length > 0;
  const totalSqftCreated = carpetRolls.reduce((s: number, r: any) => s + Number(r.originalSqft), 0);
  const PayIcon = paymentIcons[purchase.paymentMethod] || CreditCard;
  const totalItems = purchase.items.reduce((sum: number, it: any) => sum + it.quantity, 0);

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
        <Link to="/purchases" className="inline-flex items-center gap-2 rounded-xl bg-white border-2 border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition">
          <ArrowLeft className="h-4 w-4" /> Back to Purchases
        </Link>
        <Button onClick={() => window.print()} className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800">
          <Printer className="h-4 w-4" /> Print Invoice
        </Button>
      </div>

      {/* ═══ HEADER ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-orange-700 text-white p-6 sm:p-8 print:bg-white print:text-slate-900 print:border-b-4 print:border-double print:border-slate-700 shadow-2xl">
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-orange-400/20 blur-2xl print:hidden" />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl print:hidden" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold print:hidden">
              <Truck className="h-3 w-3 text-amber-300" /> Purchase Order
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold font-mono">{purchase.purchaseNumber}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm text-white/80 print:text-slate-600 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(purchase.purchasedAt)}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {purchase.supplier?.name}
              </span>
              {purchase.createdBy && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    By {purchase.createdBy.fullName}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full border-2 text-xs font-extrabold ${statusColors[purchase.status]}`}>
              {purchase.status}
            </span>
            <div className="mt-2 text-[10px] uppercase tracking-wider text-white/60 print:text-slate-500">Payment</div>
            <div className="text-sm font-extrabold mt-0.5 inline-flex items-center gap-1.5">
              <PayIcon className="h-3.5 w-3.5" />
              {paymentLabels[purchase.paymentMethod] || purchase.paymentMethod}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BOXES ═══ */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox label="Subtotal" value={formatPKRFull(purchase.subtotal)} icon={Receipt} color="slate" />
        {purchase.discount > 0 && (
          <StatBox label="Discount" value={`-${formatPKRFull(purchase.discount)}`} icon={Wallet} color="amber" />
        )}
        <StatBox label="Total" value={formatPKRFull(purchase.total)} icon={CheckCircle2} color="orange" highlight />
        <StatBox label="Paid" value={formatPKRFull(purchase.paidAmount)} icon={CreditCard} color="emerald" />
        {balance > 0 && (
          <StatBox label="Balance Due" value={formatPKRFull(balance)} icon={AlertTriangle} color="rose" />
        )}
      </div>

      {/* ═══ SUPPLIER CARD ═══ */}
      <div className="rounded-3xl bg-white border-2 border-violet-200 p-5 shadow-sm">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold">Supplier Information</div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{purchase.supplier?.name}</h3>
            <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
              {purchase.supplier?.phone && (
                <div className="inline-flex items-center gap-1 text-slate-600">
                  <Phone className="h-3 w-3" />
                  <span className="font-bold">{purchase.supplier.phone}</span>
                </div>
              )}
              {purchase.supplier?.email && (
                <div className="inline-flex items-center gap-1 text-slate-600">
                  <Mail className="h-3 w-3" />
                  <span className="font-bold">{purchase.supplier.email}</span>
                </div>
              )}
              {purchase.supplier?.address && (
                <div className="inline-flex items-center gap-1 text-slate-600">
                  <MapPin className="h-3 w-3" />
                  <span>{purchase.supplier.address}</span>
                </div>
              )}
              {purchase.supplier?.contactPerson && (
                <div className="inline-flex items-center gap-1 text-slate-600">
                  <User className="h-3 w-3" />
                  <span>Contact: <span className="font-bold">{purchase.supplier.contactPerson}</span></span>
                </div>
              )}
            </div>
          </div>
          <Link
            to={`/suppliers/${purchase.supplier?.id}`}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-extrabold transition print:hidden"
          >
            View Profile <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ═══ ITEMS TABLE ═══ */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-200 flex items-center gap-2">
          <Package className="h-5 w-5 text-slate-600" />
          <h3 className="font-bold text-slate-900">
            Items Purchased <span className="text-slate-500 font-normal">({purchase.items.length} items • {formatQty(totalItems)} total qty)</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 w-12">#</th>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Product</th>
                <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Qty</th>
                <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Cost</th>
                <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchase.items.map((item: any, idx: number) => {
                const itemRolls = carpetRolls.filter((r: any) => r.product.id === item.product.id);
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {item.product.images?.[0]?.url ? (
                            <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{item.product.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono uppercase">{item.product.unit}</div>
                          {itemRolls.length > 0 && (
                            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                              <Layers className="h-2.5 w-2.5" />
                              {itemRolls.length} roll{itemRolls.length !== 1 ? 's' : ''} created
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-extrabold text-slate-900 tabular-nums">
                        {formatQty(item.quantity)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">{item.product.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-700 tabular-nums">
                      {formatPKR(item.costPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-orange-700 text-base tabular-nums">
                      {formatPKRFull(item.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gradient-to-r from-slate-50 to-white border-t-2 border-slate-300">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-slate-700">Subtotal</td>
                <td className="px-4 py-3 text-right font-extrabold text-slate-900 tabular-nums">{formatPKRFull(purchase.subtotal)}</td>
              </tr>
              {purchase.discount > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm font-bold text-amber-700">Discount</td>
                  <td className="px-4 py-2 text-right font-extrabold text-amber-700 tabular-nums">-{formatPKRFull(purchase.discount)}</td>
                </tr>
              )}
              <tr className="bg-orange-50 border-t-2 border-orange-300">
                <td colSpan={4} className="px-4 py-3 text-right text-base font-extrabold text-slate-900">GRAND TOTAL</td>
                <td className="px-4 py-3 text-right text-2xl font-extrabold text-orange-700 tabular-nums">{formatPKRFull(purchase.total)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-xs font-bold text-emerald-700">Paid ({paymentLabels[purchase.paymentMethod]})</td>
                <td className="px-4 py-2 text-right font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(purchase.paidAmount)}</td>
              </tr>
              {balance > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-xs font-bold text-rose-700">Balance Due</td>
                  <td className="px-4 py-2 text-right font-extrabold text-rose-700 tabular-nums">{formatPKRFull(balance)}</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* ═══ CARPET ROLLS CREATED ═══ */}
      {hasCarpetRolls && (
        <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b-2 border-emerald-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-emerald-900">Carpet Rolls Created</h3>
                <p className="text-[11px] text-emerald-700 font-bold">
                  {carpetRolls.length} rolls • {totalSqftCreated.toFixed(2)} sqft total
                </p>
              </div>
            </div>
            <Link
              to="/carpet-rolls"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition print:hidden"
            >
              Manage Rolls <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-100/50 border-b border-emerald-200">
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">Roll #</th>
                  <th className="px-4 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">Product / Variant</th>
                  <th className="px-4 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">Dimensions</th>
                  <th className="px-4 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">Sqft</th>
                  <th className="px-4 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">Cost/sqft</th>
                  <th className="px-4 py-2 text-right text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">Sale/sqft</th>
                  <th className="px-4 py-2 text-left text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {carpetRolls.map((roll: any) => {
                  const fullWidth = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
                  return (
                    <tr key={roll.id} className="hover:bg-emerald-50/30 transition">
                      <td className="px-4 py-2.5">
                        <Link to={`/carpet-rolls/${roll.id}`} className="font-mono font-extrabold text-emerald-700 hover:underline text-xs print:no-underline">
                          {roll.rollNumber}
                        </Link>
                        {roll.designCode && (
                          <div className="text-[9px] font-mono text-slate-500 mt-0.5">{roll.designCode}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-slate-900 text-xs">{roll.product.name}</div>
                        {roll.variant && (
                          <div className="text-[10px] text-violet-700 font-bold flex items-center gap-1 mt-0.5">
                            {roll.variant.colorHex && (
                              <span className="h-2 w-2 rounded-full border border-slate-300" style={{ backgroundColor: roll.variant.colorHex }} />
                            )}
                            {roll.variant.name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        <div className="font-bold text-slate-900">
                          {fullWidth.toFixed(2)}ft × {Number(roll.originalLengthFt).toFixed(1)}ft
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
                          {Number(roll.originalSqft).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-700 tabular-nums">
                        {formatPKR(roll.costPerSqft)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-blue-700 tabular-nums">
                        {roll.salePricePerSqft > 0 ? formatPKR(roll.salePricePerSqft) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                          roll.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                          roll.status === 'FINISHED' ? 'bg-slate-100 text-slate-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {roll.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ NOTES ═══ */}
      {purchase.notes && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900">Notes</div>
            <div className="text-sm text-amber-900 mt-0.5 font-semibold">{purchase.notes}</div>
          </div>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-4 text-center print:bg-white">
        <div className="text-sm font-extrabold text-slate-900 inline-flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" />
          Stock Successfully Received & Updated
          <Award className="h-4 w-4 text-amber-500" />
        </div>
        <div className="text-[10px] text-slate-500 mt-2 inline-flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          Powered by Nafaa POS • Generated {formatDate(new Date().toISOString())}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color, highlight }: any) {
  const colors: Record<string, string> = {
    slate: 'from-slate-50 to-slate-100 border-slate-200 text-slate-900',
    orange: 'from-orange-50 to-amber-50 border-orange-300 text-orange-900',
    emerald: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-900',
    amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-900',
    rose: 'from-rose-50 to-pink-50 border-rose-200 text-rose-900',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-4 ${colors[color]} ${highlight ? 'shadow-lg' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5" />
        <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-80">{label}</div>
      </div>
      <div className={`font-extrabold tabular-nums ${highlight ? 'text-2xl' : 'text-xl'}`}>{value}</div>
    </div>
  );
}
