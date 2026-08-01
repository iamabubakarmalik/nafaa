import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, X, Plus, Trash2, Search, Package, Sparkles,
  Users, Building, Phone, Mail, MapPin, Calendar, DollarSign,
  Percent, Truck, Upload, CheckCircle2, AlertCircle, Trophy,
  Award, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { teamOrdersApi, type TeamOrderStatus, type TeamOrderItem } from '../api/team-orders.api';
import { sportsProductsApi } from '../api/products.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 25];
const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const STATUSES: TeamOrderStatus[] = ['DRAFT', 'QUOTED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELLED'];

export default function TeamOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    teamName: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    organization: '',
    city: '',
    address: '',
    discountPct: 0,
    taxAmount: 0,
    shippingCharge: 0,
    hasCustomJerseys: false,
    customizationDetails: '',
    teamLogoUrl: '',
    advancePaid: 0,
    paymentMethod: 'CASH',
    expectedDeliveryDate: '',
    poNumber: '',
    notes: '',
    internalNotes: '',
    status: 'DRAFT' as TeamOrderStatus,
  });

  const [items, setItems] = useState<TeamOrderItem[]>([]);
  const [playerRoster, setPlayerRoster] = useState<Array<{ name: string; number: string; size: string }>>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  const { data: existing, isLoading: loadingOrder } = useQuery({
    queryKey: ['team-order', id],
    queryFn: () => teamOrdersApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        teamName: existing.teamName,
        contactPerson: existing.contactPerson,
        contactPhone: existing.contactPhone,
        contactEmail: existing.contactEmail || '',
        organization: existing.organization || '',
        city: existing.city || '',
        address: existing.address || '',
        discountPct: existing.discountPct,
        taxAmount: existing.taxAmount,
        shippingCharge: existing.shippingCharge,
        hasCustomJerseys: existing.hasCustomJerseys,
        customizationDetails: existing.customizationDetails || '',
        teamLogoUrl: existing.teamLogoUrl || '',
        advancePaid: existing.advancePaid,
        paymentMethod: existing.paymentMethod || 'CASH',
        expectedDeliveryDate: existing.expectedDeliveryDate ? existing.expectedDeliveryDate.slice(0, 10) : '',
        poNumber: existing.poNumber || '',
        notes: existing.notes || '',
        internalNotes: existing.internalNotes || '',
        status: existing.status,
      });
      setItems(existing.items || []);
      // Reconstruct player roster from playerNames + playerNumbers if arrays
      const names = Array.isArray(existing.playerNames) ? existing.playerNames : [];
      const numbers = Array.isArray(existing.playerNumbers) ? existing.playerNumbers : [];
      if (names.length > 0) {
        setPlayerRoster(names.map((n: any, i: number) => ({
          name: typeof n === 'string' ? n : (n?.name || ''),
          number: numbers[i] ? String(numbers[i]) : '',
          size: typeof n === 'object' ? n?.size || '' : '',
        })));
      }
    }
  }, [existing]);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-team-order', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined } as any),
    enabled: showProductSearch,
  });

  const { data: teamOrderableProfiles = [] } = useQuery({
    queryKey: ['sports-team-orderable-profiles'],
    queryFn: () => sportsProductsApi.teamOrderable(),
  });

  const teamProductIds = useMemo(() => new Set(
    (teamOrderableProfiles as any[]).map((p) => p.productId)
  ), [teamOrderableProfiles]);

  const subtotal = useMemo(() =>
    items.reduce((s, it) => s + (it.total || (it.unitPrice * it.quantity)), 0),
    [items]);
  const discountAmount = (subtotal * form.discountPct) / 100;
  const totalAmount = Math.max(0, subtotal - discountAmount + form.taxAmount + form.shippingCharge);
  const balanceAmount = Math.max(0, totalAmount - form.advancePaid);
  const totalQty = items.reduce((s, it) => s + Number(it.quantity || 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ...form,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        items,
        playerNames: form.hasCustomJerseys && playerRoster.length > 0
          ? playerRoster.map((p) => ({ name: p.name, size: p.size }))
          : undefined,
        playerNumbers: form.hasCustomJerseys && playerRoster.length > 0
          ? playerRoster.map((p) => p.number)
          : undefined,
      };
      return isEdit
        ? teamOrdersApi.update(id!, payload)
        : teamOrdersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Order updated' : 'Order created');
      qc.invalidateQueries({ queryKey: ['team-orders-list'] });
      qc.invalidateQueries({ queryKey: ['team-orders-summary'] });
      navigate('/sports/team-orders');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const updateStatus = useMutation({
    mutationFn: (newStatus: TeamOrderStatus) => teamOrdersApi.updateStatus(id!, { status: newStatus }),
    onSuccess: (data) => {
      toast.success(`Status → ${data.status.replace(/_/g, ' ')}`);
      setForm({ ...form, status: data.status });
      qc.invalidateQueries({ queryKey: ['team-order', id] });
    },
  });

  const recordPayment = useMutation({
    mutationFn: (amount: number) => teamOrdersApi.recordPayment(id!, { amount, paymentMethod: form.paymentMethod }),
    onSuccess: (data) => {
      toast.success(`Payment recorded: ${formatPKR(data.advancePaid - Number(existing?.advancePaid || 0))}`);
      setForm({ ...form, advancePaid: data.advancePaid });
      qc.invalidateQueries({ queryKey: ['team-order', id] });
    },
  });

  const addProduct = (product: any) => {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      setItems(items.map((i) => i.productId === product.id
        ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
        : i));
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        total: product.price,
        size: undefined,
        color: undefined,
      }]);
    }
    setProductSearch('');
    setShowProductSearch(false);
  };

  const updateItem = (i: number, patch: Partial<TeamOrderItem>) => {
    setItems(items.map((it, idx) => {
      if (idx !== i) return it;
      const next = { ...it, ...patch };
      next.total = next.quantity * next.unitPrice;
      return next;
    }));
  };

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const addPlayer = () => setPlayerRoster([...playerRoster, { name: '', number: '', size: '' }]);
  const updatePlayer = (i: number, patch: Partial<{ name: string; number: string; size: string }>) => {
    setPlayerRoster(playerRoster.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  };
  const removePlayer = (i: number) => setPlayerRoster(playerRoster.filter((_, idx) => idx !== i));

  const generateRoster = (count: number) => {
    setPlayerRoster(Array.from({ length: count }, (_, i) => ({
      name: `Player ${i + 1}`,
      number: String(i + 1),
      size: 'M',
    })));
    toast.success(`${count} player slots created`);
  };

  const canSave = form.teamName.trim() && form.contactPerson.trim() && form.contactPhone.trim() && items.length > 0;

  if (isEdit && loadingOrder) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex items-start gap-4 flex-wrap">
          <button onClick={() => navigate('/sports/team-orders')}
            className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/20">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Users className="h-3.5 w-3.5 text-amber-300" />
              {isEdit ? 'Edit Team Order' : 'New Team Order'}
              {isEdit && existing && ` • ${existing.orderNumber}`}
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
              🏆 {isEdit ? form.teamName || 'Team Order' : 'Create Team Order'}
            </h1>
            <p className="mt-1 text-sm text-white/80 font-semibold">
              School teams, cricket clubs, corporate leagues with jersey customization
            </p>
          </div>
        </div>
      </section>

      {isEdit && (
        <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Update Status</div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => updateStatus.mutate(s)}
                disabled={form.status === s}
                className={`px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition disabled:opacity-100 ${
                  form.status === s
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md cursor-default'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'}`}>
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid xl:grid-cols-[1fr_380px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* 1 — TEAM INFO */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
            <SectionHead n="1" icon={Users} title="Team & Contact Info" desc="Who is placing this order?" tone="emerald" />

            <div>
              <Lbl>Team Name *</Lbl>
              <input autoFocus value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                placeholder="Karachi Kings U-19"
                className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-lg font-extrabold focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200" />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Contact Person *</Lbl>
                <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="Coach Ali Ahmed"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <Lbl>Phone *</Lbl>
                <div className="relative">
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="03XX XXXXXXX"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <Lbl>Email</Lbl>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    placeholder="coach@team.com"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <Lbl>Organization</Lbl>
                <div className="relative">
                  <Building className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })}
                    placeholder="Beaconhouse School System"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <Lbl>City</Lbl>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Karachi"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <Lbl>PO Number</Lbl>
                <input value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
                  placeholder="PO-2026-001"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div>
              <Lbl>Address</Lbl>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Delivery address..."
                  className="w-full rounded-xl border-2 border-slate-200 pl-9 pr-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </section>

          {/* 2 — ITEMS */}
          <section className="rounded-3xl bg-white border-2 border-blue-300 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <SectionHead n="2" icon={Package} title="Order Items" desc="Add products to the order" tone="blue" />
              <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold ${
                items.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {items.length} items • {totalQty} pcs
              </span>
            </div>

            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-3 space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setShowProductSearch(true); }}
                  onFocus={() => setShowProductSearch(true)}
                  placeholder="Search product to add..."
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-blue-500" />
              </div>
              {showProductSearch && productSearch && (
                <div className="max-h-64 overflow-y-auto space-y-1 border-t border-blue-200 pt-2">
                  {((productsData as any)?.items ?? []).map((p: any) => {
                    const isTeamOrderable = teamProductIds.has(p.id);
                    return (
                      <button key={p.id} onClick={() => addProduct(p)}
                        className="w-full px-3 py-2 flex items-center gap-3 rounded-lg bg-white hover:bg-blue-50 border-2 border-transparent hover:border-blue-200 transition text-left">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                          {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover" /> : <Package className="h-full w-full p-2 text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm truncate">{p.name}</div>
                          <div className="text-xs text-slate-500 font-semibold">
                            {formatPKR(p.price)}
                            {isTeamOrderable && <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">TEAM</span>}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-blue-600" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="font-extrabold text-slate-700">No items yet</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">Search above to add products</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="rounded-xl border-2 border-slate-200 bg-white p-3">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm truncate">{item.productName}</div>
                      </div>
                      <button onClick={() => removeItem(i)}
                        className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase font-extrabold text-slate-500 mb-1">Qty</label>
                        <input type="number" min="1" value={item.quantity}
                          onChange={(e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value)) })}
                          className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-extrabold text-slate-500 mb-1">Unit Price</label>
                        <input type="number" step="0.01" value={item.unitPrice}
                          onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                          className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-extrabold text-slate-500 mb-1">Size</label>
                        <input value={item.size || ''} onChange={(e) => updateItem(i, { size: e.target.value })}
                          placeholder="M, L, XL..."
                          className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-bold focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-extrabold text-emerald-700 mb-1">Total</label>
                        <div className="h-10 w-full rounded-lg border-2 border-emerald-200 bg-emerald-50 px-2 flex items-center text-sm font-extrabold text-emerald-800 tabular-nums">
                          {formatPKR(item.total || (item.quantity * item.unitPrice))}
                        </div>
                      </div>
                    </div>
                    {item.customizationNotes !== undefined && (
                      <input value={item.customizationNotes || ''}
                        onChange={(e) => updateItem(i, { customizationNotes: e.target.value })}
                        placeholder="Customization notes for this item..."
                        className="mt-2 h-10 w-full rounded-lg border-2 border-violet-200 bg-violet-50/50 px-3 text-xs font-bold focus:outline-none focus:border-violet-500" />
                    )}
                    {item.customizationNotes === undefined && (
                      <button onClick={() => updateItem(i, { customizationNotes: '' })}
                        className="mt-2 text-[10px] font-extrabold text-violet-700 hover:underline">
                        + Add customization note
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3 — CUSTOM JERSEYS */}
          <section className="rounded-3xl bg-white border-2 border-violet-300 shadow-sm p-5 space-y-4">
            <SectionHead n="3" icon={Sparkles} title="Custom Jerseys" desc="Player names, numbers, team logo" tone="violet" />

            <button type="button" onClick={() => setForm({ ...form, hasCustomJerseys: !form.hasCustomJerseys })}
              className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                form.hasCustomJerseys ? 'border-violet-500 bg-violet-50 shadow-md' : 'border-slate-200 bg-white hover:border-violet-300'}`}>
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                  form.hasCustomJerseys ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'}`}>
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-slate-900">Include Jersey Customization</div>
                  <div className="text-xs text-slate-600 font-semibold">Player names, numbers, team logo printing</div>
                </div>
                <div className={`h-6 w-11 rounded-full transition ${form.hasCustomJerseys ? 'bg-violet-600' : 'bg-slate-300'}`}>
                  <div className={`h-5 w-5 mt-0.5 rounded-full bg-white transition ${form.hasCustomJerseys ? 'ml-6' : 'ml-0.5'}`} />
                </div>
              </div>
            </button>

            {form.hasCustomJerseys && (
              <div className="space-y-4 rounded-2xl bg-violet-50 border-2 border-violet-200 p-4">
                <div>
                  <Lbl>Customization Details</Lbl>
                  <textarea rows={2} value={form.customizationDetails}
                    onChange={(e) => setForm({ ...form, customizationDetails: e.target.value })}
                    placeholder="Font style, colour combinations, sponsor placement..."
                    className="w-full rounded-xl border-2 border-violet-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
                </div>

                <div>
                  <Lbl>Team Logo</Lbl>
                  {form.teamLogoUrl ? (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-violet-300">
                      <img src={form.teamLogoUrl} alt="" className="w-full h-full object-contain bg-white p-2" />
                      <button onClick={() => setForm({ ...form, teamLogoUrl: '' })}
                        className="absolute top-1 right-1 h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <UploadDropzone purpose="team-logo" maxFiles={1}
                      onUploaded={(recs: any[]) => {
                        const first = Array.isArray(recs) ? recs[0] : recs;
                        const url = typeof first === 'string' ? first : (first as any)?.url;
                        if (url) setForm({ ...form, teamLogoUrl: url });
                      }} />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Lbl>Player Roster ({playerRoster.length})</Lbl>
                    <div className="flex gap-1">
                      {[11, 15, 20, 25].map((n) => (
                        <button key={n} onClick={() => generateRoster(n)}
                          className="px-2 py-1 rounded-lg bg-white border-2 border-violet-200 hover:border-violet-400 text-violet-700 text-[10px] font-extrabold">
                          {n} players
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {playerRoster.map((player, i) => (
                      <div key={i} className="rounded-xl bg-white border-2 border-violet-200 p-2 grid grid-cols-[auto_1fr_80px_100px_auto] gap-2 items-center">
                        <div className="h-9 w-9 rounded-lg bg-violet-600 text-white flex items-center justify-center font-extrabold text-xs">
                          {i + 1}
                        </div>
                        <input value={player.name} onChange={(e) => updatePlayer(i, { name: e.target.value })}
                          placeholder="Player name"
                          className="h-9 rounded-lg border-2 border-slate-200 px-2 text-sm font-bold focus:outline-none focus:border-violet-500" />
                        <input value={player.number} onChange={(e) => updatePlayer(i, { number: e.target.value })}
                          placeholder="No."
                          className="h-9 rounded-lg border-2 border-slate-200 px-2 text-sm font-mono font-bold text-center focus:outline-none focus:border-violet-500" />
                        <select value={player.size} onChange={(e) => updatePlayer(i, { size: e.target.value })}
                          className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-violet-500">
                          <option value="">Size</option>
                          {APPAREL_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => removePlayer(i)}
                          className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={addPlayer}
                      className="w-full h-11 rounded-xl border-2 border-dashed border-violet-300 hover:border-violet-500 hover:bg-violet-50 text-violet-700 text-xs font-extrabold inline-flex items-center justify-center gap-1 transition">
                      <Plus className="h-4 w-4" /> Add Player
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 4 — PRICING & DELIVERY */}
          <section className="rounded-3xl bg-white border-2 border-emerald-300 shadow-sm p-5 space-y-4">
            <SectionHead n="4" icon={DollarSign} title="Pricing & Delivery" desc="Discount, tax, shipping, dates" tone="emerald" />

            <div>
              <Lbl>Discount %</Lbl>
              <div className="flex gap-1">
                {DISCOUNT_PRESETS.map((d) => (
                  <button key={d} onClick={() => setForm({ ...form, discountPct: d })}
                    className={`flex-1 h-11 rounded-xl border-2 text-xs font-extrabold transition ${
                      form.discountPct === d ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'}`}>
                    {d === 0 ? 'None' : `${d}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Lbl>Tax Amount</Lbl>
                <input type="number" value={form.taxAmount}
                  onChange={(e) => setForm({ ...form, taxAmount: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <Lbl>Shipping</Lbl>
                <input type="number" value={form.shippingCharge}
                  onChange={(e) => setForm({ ...form, shippingCharge: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <Lbl>Advance Paid</Lbl>
                <input type="number" value={form.advancePaid}
                  onChange={(e) => setForm({ ...form, advancePaid: Number(e.target.value) })}
                  className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
              </div>
            </div>

            {isEdit && (
              <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 space-y-2">
                <div className="text-xs font-extrabold text-emerald-800">Add Payment</div>
                <div className="flex gap-2">
                  <input type="number" id="new-payment" placeholder="Amount"
                    className="h-10 flex-1 rounded-lg border-2 border-emerald-300 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                  <button onClick={() => {
                    const el = document.getElementById('new-payment') as HTMLInputElement;
                    const amount = Number(el?.value || 0);
                    if (amount > 0) { recordPayment.mutate(amount); el.value = ''; }
                  }} className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold">
                    Record
                  </button>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Payment Method</Lbl>
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="MOBILE">Mobile Wallet</option>
                  <option value="CREDIT">Credit / Later</option>
                </select>
              </div>
              <div>
                <Lbl>Expected Delivery Date</Lbl>
                <div className="relative">
                  <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="date" value={form.expectedDeliveryDate}
                    onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                    className="h-11 w-full rounded-xl border-2 border-slate-200 pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                </div>
              </div>
            </div>

            <div>
              <Lbl>Customer Notes</Lbl>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any notes from customer..."
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
            </div>

            <div>
              <Lbl>Internal Notes <span className="text-slate-400 normal-case font-bold">(staff only)</span></Lbl>
              <textarea rows={2} value={form.internalNotes} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                placeholder="Staff notes, production tracking..."
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
            </div>
          </section>
        </div>

        {/* SIDEBAR - ORDER SUMMARY */}
        <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-5 shadow-xl overflow-hidden relative">
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="relative">
              <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-90 flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Order Summary
              </div>
              <h3 className="mt-2 font-extrabold text-xl truncate">{form.teamName || 'Team name...'}</h3>
              <div className="mt-3 text-4xl font-extrabold tabular-nums text-emerald-300">
                {formatPKRFull(totalAmount)}
              </div>
              <div className="text-xs font-bold text-white/70 mt-0.5">
                {items.length} items • {totalQty} pieces
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-2.5">
            <Row label="Subtotal" value={formatPKRFull(subtotal)} />
            {form.discountPct > 0 && (
              <Row label={`Discount (${form.discountPct}%)`} value={`-${formatPKRFull(discountAmount)}`} tone="amber" />
            )}
            {form.taxAmount > 0 && <Row label="Tax" value={formatPKRFull(form.taxAmount)} />}
            {form.shippingCharge > 0 && <Row label="Shipping" value={formatPKRFull(form.shippingCharge)} />}
            <div className="pt-2 border-t-2 border-slate-100 flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-900">Total</span>
              <span className="text-xl font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(totalAmount)}</span>
            </div>
            {form.advancePaid > 0 && (
              <>
                <Row label="Advance paid" value={formatPKRFull(form.advancePaid)} tone="emerald" />
                <div className="flex items-center justify-between text-sm font-extrabold">
                  <span className="text-rose-700">Balance</span>
                  <span className="text-rose-700 tabular-nums">{formatPKRFull(balanceAmount)}</span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Checklist
            </div>
            <Chk done={!!form.teamName.trim()} label="Team name" />
            <Chk done={!!form.contactPerson.trim() && !!form.contactPhone.trim()} label="Contact person + phone" />
            <Chk done={items.length > 0} label="At least 1 item" />
            <Chk done={!form.hasCustomJerseys || playerRoster.length > 0} label="Player roster (if custom)" />
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => navigate('/sports/team-orders')}>Cancel</Button>
          <Button className="bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
            <Save className="h-4 w-4" />
            {isEdit ? 'Save Changes' : `Create Order (${formatPKR(totalAmount)})`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ n, icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
          <span className="text-slate-400">{n}.</span> {title}
        </h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}

function Row({ label, value, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600 font-semibold">{label}</span>
      <span className={`font-extrabold tabular-nums ${tone ? tones[tone] : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

function Chk({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`h-4 w-4 rounded-md flex items-center justify-center shrink-0 ${
        done ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-300'}`}>
        {done && <CheckCircle2 className="h-3 w-3" />}
      </div>
      <span className={`font-bold ${done ? 'text-emerald-800 line-through' : 'text-slate-600'}`}>{label}</span>
    </div>
  );
}
