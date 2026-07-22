import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Trash2, Star, MapPin, Phone, X, Edit3, Save,
  Search, Info, CheckCircle2, Globe, MessageCircle, Warehouse,
  UserPlus, Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle,
  TrendingUp, Package, Activity, Sparkles,
} from 'lucide-react';
import { shopsApi, type Shop, type ShopType } from '@/api/shops.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const shopTypeConfig: Record<ShopType, { label: string; icon: any; color: string; description: string }> = {
  SHOP: { label: 'Retail Shop', icon: Building2, color: 'indigo', description: 'POS + sales + customers' },
  WAREHOUSE: { label: 'Warehouse', icon: Warehouse, color: 'amber', description: 'Storage + transfers only' },
  GODOWN: { label: 'Godown', icon: Package, color: 'violet', description: 'Backup storage' },
};

export default function ShopsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'OWNER' || currentUser?.role === 'SUPER_ADMIN';

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createManager, setCreateManager] = useState(false);

  const [form, setForm] = useState({
    name: '', address: '', phone: '', isMain: false,
    type: 'SHOP' as ShopType,
    managerName: '', managerEmail: '', managerPhone: '', managerPassword: '',
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: shopsApi.list,
  });

  const { data: overview = [] } = useQuery({
    queryKey: ['shops-overview'],
    queryFn: shopsApi.overview,
    enabled: isOwner,
  });

  const createMutation = useMutation({
    mutationFn: shopsApi.create,
    onSuccess: (data: any) => {
      if (data.manager) {
        toast.success(`Shop + Manager created!`, {
          description: `Manager: ${data.manager.fullName} (${data.manager.email})`,
        });
      } else {
        toast.success('Shop added successfully');
      }
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['shops-overview'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: shopsApi.remove,
    onSuccess: () => {
      toast.success('Shop deleted');
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => shopsApi.update(id, payload),
    onSuccess: () => {
      toast.success('Shop updated successfully');
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['shops-overview'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: shopsApi.toggleActive,
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return shops;
    return shops.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q),
    );
  }, [shops, search]);

  const stats = useMemo(() => {
    return {
      total: shops.length,
      shops: shops.filter((s) => s.type === 'SHOP').length,
      warehouses: shops.filter((s) => s.type === 'WAREHOUSE' || s.type === 'GODOWN').length,
      hasMain: !!shops.find((s) => s.isMain),
    };
  }, [shops]);

  const overviewMap = useMemo(() => {
    const map: Record<string, any> = {};
    overview.forEach((o) => { map[o.id] = o; });
    return map;
  }, [overview]);

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setCreateManager(false);
    setForm({
      name: '', address: '', phone: '', isMain: false, type: 'SHOP',
      managerName: '', managerEmail: '', managerPhone: '', managerPassword: '',
    });
  };

  const openCreate = () => {
    if (!isOwner) {
      toast.error('Sirf Owner shop create kar sakta hai');
      return;
    }
    setEditing(null);
    setForm({
      name: '', address: '', phone: '', isMain: shops.length === 0, type: 'SHOP',
      managerName: '', managerEmail: '', managerPhone: '', managerPassword: '',
    });
    setShowForm(true);
  };

  const openEdit = (shop: Shop) => {
    if (!isOwner) {
      toast.error('Sirf Owner shop edit kar sakta hai');
      return;
    }
    setEditing(shop);
    setCreateManager(false);
    setForm({
      name: shop.name,
      address: shop.address || '',
      phone: shop.phone || '',
      isMain: shop.isMain,
      type: shop.type,
      managerName: '', managerEmail: '', managerPhone: '', managerPassword: '',
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('Shop name required');

    const payload: any = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      isMain: form.isMain,
      type: form.type,
    };

    // EDIT MODE
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
      return;
    }

    // CREATE MODE (with optional manager)
    if (createManager) {
      if (!form.managerName.trim()) return toast.error('Manager name required');
      if (!form.managerEmail.trim()) return toast.error('Manager email required');
      if (form.managerPassword.length < 8) return toast.error('Password min 8 characters');
      payload.managerName = form.managerName.trim();
      payload.managerEmail = form.managerEmail.trim();
      payload.managerPhone = form.managerPhone.trim() || undefined;
      payload.managerPassword = form.managerPassword;
    }

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-indigo-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Building2 className="h-3.5 w-3.5 text-amber-300" /> Multi-Branch Setup
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Shops / Branches</h2>
            <p className="mt-2 text-sm text-white/80">
              Apni saari dukan branches, warehouses aur godowns ek hi software se manage karein.
            </p>
          </div>
          {isOwner && (
            <Button onClick={openCreate} className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> New Shop / Warehouse
            </Button>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Locations" value={stats.total} icon={Globe} color="indigo" />
        <StatCard label="Retail Shops" value={stats.shops} icon={Building2} color="emerald" />
        <StatCard label="Warehouses" value={stats.warehouses} icon={Warehouse} color="amber" />
        <StatCard label="Main Branch" value={stats.hasMain ? 'Set ✓' : 'Not Set ⚠'} icon={Star} color="violet" isText />
      </section>

      {/* Info banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-blue-50 border-2 border-indigo-200 p-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-indigo-900 text-lg">Multi-Shop Setup Guide</h3>
            <p className="text-sm text-slate-700 mt-1">
              Har shop ka apna stock, cash register, staff aur reports — sab automatic track hota hai.
            </p>
            <div className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
              {[
                { icon: '🏪', text: 'Retail Shop — POS + sales' },
                { icon: '🏬', text: 'Warehouse — central storage' },
                { icon: '🔄', text: 'Stock transfer between shops' },
                { icon: '👤', text: 'Manager per shop with limited access' },
                { icon: '📊', text: 'Owner sees global dashboard' },
                { icon: '💰', text: 'Cash register per shop' },
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

      {/* Search */}
      {shops.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Search shops..."
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

      {/* Shops Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
            <Building2 className="h-9 w-9 text-indigo-600" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-slate-900">
            {search ? 'No matches' : 'No shops yet'}
          </h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            {search ? 'Try different search' : 'Apni first shop add karein.'}
          </p>
          {!search && isOwner && (
            <Button onClick={openCreate} className="mt-5">
              <Plus className="h-4 w-4" /> Add First Shop
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((shop) => {
            const typeCfg = shopTypeConfig[shop.type];
            const TypeIcon = typeCfg.icon;
            const stats = overviewMap[shop.id];

            return (
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
                    <Star className="h-3 w-3 fill-white" /> MAIN
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className={`h-14 w-14 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0 ${
                    shop.isMain
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30'
                      : `bg-gradient-to-br from-${typeCfg.color}-500 to-${typeCfg.color}-700`
                  }`}>
                    <TypeIcon className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h4 className="text-lg font-extrabold text-slate-900 truncate">{shop.name}</h4>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {typeCfg.label}
                      </span>
                      {!shop.isActive && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                          INACTIVE
                        </span>
                      )}
                    </div>
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

                {/* Today's stats (Owner only) */}
                {stats && isOwner && (
                  <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase">Today</div>
                      <div className="text-sm font-extrabold text-emerald-700">Rs {stats.todaySales.toLocaleString('en-PK')}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase">Orders</div>
                      <div className="text-sm font-extrabold text-slate-900">{stats.todayOrders}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase">Low Stock</div>
                      <div className={`text-sm font-extrabold ${stats.lowStockCount > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                        {stats.lowStockCount}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer counts */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-3 text-slate-600">
                    {shop._count?.users !== undefined && (
                      <span className="inline-flex items-center gap-1 font-bold">
                        <ShieldCheck className="h-3 w-3" /> {shop._count.users} staff
                      </span>
                    )}
                    {stats?.registerOpen && (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <Activity className="h-3 w-3" /> Register Open
                      </span>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-1">
                      {shop.phone && (
                        <a
                          href={`https://wa.me/${shop.phone.replace(/[^0-9]/g, '').replace(/^0/, '92')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="h-7 w-7 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center justify-center"
                          title="WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => openEdit(shop)}
                        className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 flex items-center justify-center transition"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate(shop.id)}
                        className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-700 flex items-center justify-center transition"
                        title={shop.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {shop.isActive ? '🟢' : '🔴'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${shop.name}"?`)) deleteMutation.mutate(shop.id);
                        }}
                        className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-br from-indigo-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">
                    {editing ? `Edit: ${editing.name}` : 'New Shop / Warehouse'}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {editing ? 'Update shop details' : 'Add location with optional manager'}
                  </p>
                </div>
              </div>
              <button onClick={closeForm} className="rounded-lg p-2 hover:bg-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Location Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(shopTypeConfig) as [ShopType, any][]).map(([type, cfg]) => {
                    const Icon = cfg.icon;
                    const active = form.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, type })}
                        className={`p-3 rounded-xl border-2 transition text-center ${
                          active ? `border-${cfg.color}-500 bg-${cfg.color}-50` : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon className={`h-6 w-6 mx-auto mb-1 ${active ? `text-${cfg.color}-600` : 'text-slate-400'}`} />
                        <div className="text-sm font-extrabold text-slate-900">{cfg.label}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">{cfg.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hassan Carpets — Civil Lines" />
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Shop #, Street, City" />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+923001234567" />

              <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition ${
                form.isMain ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:border-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  <Star className={`h-5 w-5 ${form.isMain ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">Set as Main Branch</div>
                    <div className="text-xs text-slate-500">Default shop for new sales</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.isMain}
                  onChange={(e) => setForm({ ...form, isMain: e.target.checked })}
                  className="h-5 w-5 rounded"
                />
              </label>

              {/* Manager section — only in create mode */}
              {!editing && (
              <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 overflow-hidden">
                <label className="flex items-center justify-between p-3 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow">
                      <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-violet-900 text-sm">Create Manager Account</div>
                      <div className="text-xs text-violet-700">Auto-assigns to this shop</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={createManager}
                    onChange={(e) => setCreateManager(e.target.checked)}
                    className="h-5 w-5 rounded"
                  />
                </label>

                {createManager && (
                  <div className="border-t border-violet-200 p-3 space-y-3 bg-white">
                    <Input label="Manager Name *" value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} placeholder="Ahmad Ali" />
                    <Input label="Manager Email *" type="email" value={form.managerEmail} onChange={(e) => setForm({ ...form, managerEmail: e.target.value })} placeholder="manager@yourshop.pk" />
                    <Input label="Manager Phone" value={form.managerPhone} onChange={(e) => setForm({ ...form, managerPhone: e.target.value })} placeholder="+923001234567" />
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Password *</label>
                      <div className="relative">
                        <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={form.managerPassword}
                          onChange={(e) => setForm({ ...form, managerPassword: e.target.value })}
                          placeholder="Min 8 characters"
                          className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 flex items-start gap-2 text-xs">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-700 mt-0.5 shrink-0" />
                      <span className="text-amber-900">Manager ko yeh credentials WhatsApp/Email pe send karein. Woh first login pe password change kar sakta hai.</span>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
              <Button variant="secondary" onClick={closeForm}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="h-4 w-4" />
                {editing ? 'Update Shop' : createManager ? 'Create Shop + Manager' : 'Create Shop'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, isText }: any) {
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
          <div className={`mt-2 font-extrabold text-slate-900 ${isText ? 'text-lg' : 'text-2xl'}`}>{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
