import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Trash2, Star, MapPin, Phone, X, Edit3, Save,
  Search, Sparkles, Info, ArrowRight, CheckCircle2, ToggleLeft, ToggleRight,
  MessageCircle, Eye, Briefcase, Globe,
} from 'lucide-react';
import { shopsApi, type Shop } from '@/api/shops.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function ShopsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', address: '', phone: '', isMain: false,
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: shopsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: shopsApi.create,
    onSuccess: () => {
      toast.success(editing ? 'Shop updated' : 'Shop added successfully');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: shopsApi.remove,
    onSuccess: () => {
      toast.success('Shop deleted');
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete - may have sales'),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return shops;
    return shops.filter((s: any) =>
      s.name.toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  }, [shops, search]);

  const stats = useMemo(() => {
    const main = shops.find((s: any) => s.isMain);
    return {
      total: shops.length,
      active: shops.filter((s: any) => s.isActive).length,
      hasMain: !!main,
      mainName: main?.name,
    };
  }, [shops]);

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', address: '', phone: '', isMain: false });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', address: '', phone: '', isMain: shops.length === 0 });
    setShowForm(true);
  };

  const openEdit = (shop: Shop) => {
    setEditing(shop);
    setForm({
      name: shop.name,
      address: shop.address || '',
      phone: shop.phone || '',
      isMain: shop.isMain,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-indigo-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Building2 className="h-3.5 w-3.5 text-amber-300" /> Multi-Branch Setup
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Shops / Branches</h2>
            <p className="mt-2 text-sm text-white/80">
              Apni saari dukan branches ek hi software se manage karein — sales, stock, reports per branch.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-white text-slate-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" /> New Branch
          </Button>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Branches" value={stats.total} icon={Building2} color="indigo" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} color="emerald" />
        <StatCard label="Main Branch" value={stats.hasMain ? '✓ Set' : '⚠ Not Set'} icon={Star} color="amber" hint={stats.mainName || 'Set one as main'} isText />
        <StatCard label="Status" value={stats.total >= 2 ? 'Multi-Branch' : 'Single Shop'} icon={Globe} color="violet" isText />
      </section>

      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-blue-50 border-2 border-indigo-200 p-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-indigo-900 text-lg">Multi-Branch Kaise Kaam Karta Hai</h3>
            <p className="text-sm text-slate-700 mt-1">
              Aap ek hi business chala rahe hain, lekin multiple dukanon par. Har shop ka apna track:
            </p>
            <div className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
              {[
                { icon: '💰', text: 'Sales separate per branch' },
                { icon: '🧾', text: 'Cash register per shop' },
                { icon: '📦', text: 'Stock transfer ek se doosri shop' },
                { icon: '📊', text: 'Reports branch-wise compare karein' },
                { icon: '👥', text: 'Staff ko specific shop assign' },
                { icon: '🛒', text: 'POS me shop select karke sale' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-lg p-2 border border-indigo-100 inline-flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="font-bold text-slate-700">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {shops.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              placeholder="Search branches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
            <Building2 className="h-9 w-9 text-indigo-600" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-slate-900">
            {search ? 'No matches' : 'No branches yet'}
          </h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            {search ? 'Try different search' : 'Apni main shop add karein — agar ek se zyada hain to sab branches add karein.'}
          </p>
          {!search && (
            <Button onClick={openCreate} className="mt-5">
              <Plus className="h-4 w-4" /> Add First Shop
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((shop: any) => (
            <div
              key={shop.id}
              className={`group rounded-3xl border-2 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden ${
                shop.isMain
                  ? 'bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-300'
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              {shop.isMain && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-extrabold rounded-bl-2xl inline-flex items-center gap-1 shadow">
                  <Star className="h-3 w-3 fill-white" /> MAIN BRANCH
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className={`h-14 w-14 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0 ${
                  shop.isMain
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30'
                    : 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/30'
                }`}>
                  <Building2 className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h4 className="text-lg font-extrabold text-slate-900 truncate">{shop.name}</h4>
                  {!shop.isActive && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold mt-1">
                      INACTIVE
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {shop.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-700">
                    <MapPin className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="font-semibold">{shop.address}</span>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                    <a href={`tel:${shop.phone}`} className="font-semibold hover:text-blue-700">
                      {shop.phone}
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {shop.phone && (
                    <a
                      href={`https://wa.me/${shop.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 w-8 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(shop)}
                    className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 flex items-center justify-center transition"
                    title="Edit"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${shop.name}"? Yeh action undo nahi ho sakta.`)) {
                        deleteMutation.mutate(shop.id);
                      }
                    }}
                    className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-xl text-slate-900">
                  {editing ? 'Edit Branch' : 'New Branch'}
                </h3>
              </div>
              <button onClick={closeForm} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input
                label="Shop / Branch Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Main Branch — Gujranwala"
              />
              <Input
                label="Address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Shop #, Street, Bazaar, City"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+923001234567"
              />
              <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${
                form.isMain ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:border-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  <Star className={`h-5 w-5 ${form.isMain ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-extrabold text-slate-900">Set as Main Branch</div>
                    <div className="text-xs text-slate-500 font-semibold">Default shop for new sales</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.isMain}
                  onChange={(e) => setForm({ ...form, isMain: e.target.checked })}
                  className="h-5 w-5 rounded"
                />
              </label>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={closeForm} className="flex-1">Cancel</Button>
                <Button
                  onClick={() => {
                    if (!form.name.trim()) return toast.error('Name required');
                    createMutation.mutate({
                      name: form.name.trim(),
                      address: form.address.trim() || undefined,
                      phone: form.phone.trim() || undefined,
                      isMain: form.isMain,
                    });
                  }}
                  loading={createMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4" /> {editing ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, hint, isText }: any) {
  const colors: any = {
    indigo: 'from-indigo-500 to-indigo-700 shadow-indigo-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
    violet: 'from-violet-500 to-violet-700 shadow-violet-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`mt-2 font-extrabold text-slate-900 ${isText ? 'text-lg truncate' : 'text-2xl'}`}>{value}</div>
          {hint && <div className="text-xs text-slate-500 font-semibold mt-1 truncate">{hint}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
