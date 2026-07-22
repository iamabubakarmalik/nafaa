import { useState } from 'react';
import {
  X, ShoppingBag, Plus, Minus, Trash2, MessageCircle,
  User, Phone, MapPin, StickyNote, CheckCircle2, Package,
} from 'lucide-react';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import type { useCatalogCart } from '../hooks/useCatalogCart';

interface Props {
  cart: ReturnType<typeof useCatalogCart>;
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
  shopPhone?: string;
  extraCharges?: Array<{ label: string; value: number }>;
  orderMode?: string;
  themeColor?: string;
}

export function CatalogCartDrawer({
  cart, isOpen, onClose, shopName, shopPhone,
  extraCharges = [], orderMode, themeColor = '#10b981',
}: Props) {
  const [showCheckout, setShowCheckout] = useState(false);

  if (!isOpen) return null;

  const grandTotal = cart.subtotal + extraCharges.reduce((s, c) => s + c.value, 0);

  const sendWhatsAppOrder = () => {
    if (cart.items.length === 0) return toast.error('Cart is empty');
    if (!cart.customerName.trim()) return toast.error('Please enter your name');
    if (!shopPhone) return toast.error('Shop phone not configured');

    const phone = shopPhone.replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;

    const lines: string[] = [];
    lines.push('🛒 *NEW ORDER REQUEST*');
    lines.push('═══════════════════════');
    lines.push('');
    lines.push(`📅 ${new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}`);
    if (orderMode) lines.push(`📋 Mode: *${orderMode}*`);
    lines.push('');
    lines.push('👤 *CUSTOMER*');
    lines.push(`Name: ${cart.customerName}`);
    if (cart.customerPhone) lines.push(`Phone: ${cart.customerPhone}`);
    if (cart.customerAddress) lines.push(`Address: ${cart.customerAddress}`);
    lines.push('');
    lines.push('🛍️ *ITEMS*');
    cart.items.forEach((item, i) => {
      const modTotal = (item.modifiers ?? []).reduce((s, m) => s + m.priceAdjustment, 0);
      const lineTotal = (item.price + modTotal) * item.quantity;
      lines.push(`${i + 1}. ${item.name}${item.variantName ? ` (${item.variantName})` : ''}`);
      if (item.modifiers?.length) {
        item.modifiers.forEach((m) => lines.push(`   + ${m.name}${m.priceAdjustment !== 0 ? ` (${m.priceAdjustment > 0 ? '+' : ''}${formatPKR(m.priceAdjustment)})` : ''}`));
      }
      lines.push(`   ${item.quantity} ${item.unit} × ${formatPKR(item.price + modTotal)} = *${formatPKR(lineTotal)}*`);
      if (item.notes) lines.push(`   📝 ${item.notes}`);
    });
    lines.push('');
    lines.push('💰 *SUMMARY*');
    lines.push(`Subtotal: ${formatPKR(cart.subtotal)}`);
    extraCharges.forEach((c) => lines.push(`${c.label}: ${formatPKR(c.value)}`));
    lines.push(`━━━━━━━━━━━━━━━━━━━`);
    lines.push(`*TOTAL: ${formatPKRFull(grandTotal)}*`);
    if (cart.notes) {
      lines.push('');
      lines.push(`📌 *Special Notes:*`);
      lines.push(cart.notes);
    }
    lines.push('');
    lines.push(`Please confirm my order. Shukriya! 🙏`);
    if (shopName) lines.push(`— Ordering from ${shopName}`);

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
    toast.success('Order sent via WhatsApp! 🎉');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between shrink-0"
             style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)` }}>
          <div className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg">Your Cart</h3>
              <p className="text-xs text-white/85 font-semibold">
                {cart.totalItems.toFixed(0)} items • {formatPKR(cart.subtotal)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.items.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-20 w-20 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center">
                <ShoppingBag className="h-10 w-10 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-extrabold text-slate-900">Cart is empty</h4>
              <p className="text-sm text-slate-500 font-semibold mt-1">Add items from the catalog</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.items.map((item) => {
                const modTotal = (item.modifiers ?? []).reduce((s, m) => s + m.priceAdjustment, 0);
                const lineTotal = (item.price + modTotal) * item.quantity;
                return (
                  <div key={item.cartId} className="rounded-2xl border-2 border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <Package className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 text-sm truncate">{item.name}</div>
                        {item.variantName && (
                          <div className="text-[10px] font-bold text-violet-700">{item.variantName}</div>
                        )}
                        {item.modifiers?.map((m, i) => (
                          <div key={i} className="text-[10px] text-slate-600 font-semibold">
                            + {m.name}{m.priceAdjustment !== 0 && ` (${m.priceAdjustment > 0 ? '+' : ''}${formatPKR(m.priceAdjustment)})`}
                          </div>
                        ))}
                        {item.notes && (
                          <div className="text-[10px] italic text-amber-700 mt-0.5">📝 {item.notes}</div>
                        )}
                      </div>
                      <button
                        onClick={() => cart.removeItem(item.cartId)}
                        className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden">
                        <button
                          onClick={() => cart.setQuantity(item.cartId, item.quantity - 1)}
                          className="h-8 w-8 hover:bg-slate-200 font-extrabold"
                        >
                          <Minus className="h-3 w-3 mx-auto" />
                        </button>
                        <span className="h-8 w-10 flex items-center justify-center text-sm font-extrabold tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() => cart.setQuantity(item.cartId, item.quantity + 1)}
                          className="h-8 w-8 text-white hover:opacity-90 font-extrabold"
                          style={{ backgroundColor: themeColor }}
                        >
                          <Plus className="h-3 w-3 mx-auto" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(lineTotal)}</div>
                        <div className="text-[9px] text-slate-500 font-bold">
                          {formatPKR(item.price + modTotal)} × {item.quantity}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Checkout form / Summary */}
        {cart.items.length > 0 && (
          <div className="border-t-2 border-slate-100 bg-slate-50/50 p-4 space-y-3 shrink-0">
            {showCheckout ? (
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Your Details</div>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    value={cart.customerName}
                    onChange={(e) => cart.setCustomer({ customerName: e.target.value })}
                    placeholder="Your name *"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-bold focus:outline-none"
                    style={{ borderColor: cart.customerName ? themeColor : undefined }}
                  />
                </div>
                <div className="relative">
                  <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={cart.customerPhone}
                    onChange={(e) => cart.setCustomer({ customerPhone: e.target.value })}
                    placeholder="Your phone (03XX...)"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-bold focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    value={cart.customerAddress}
                    onChange={(e) => cart.setCustomer({ customerAddress: e.target.value })}
                    placeholder="Delivery address (optional)"
                    className="w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 pt-2 text-sm font-semibold focus:outline-none resize-none"
                  />
                </div>
                <div className="relative">
                  <StickyNote className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    value={cart.notes}
                    onChange={(e) => cart.setCustomer({ notes: e.target.value })}
                    placeholder="Special notes (optional)"
                    className="w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 pt-2 text-sm font-semibold focus:outline-none resize-none"
                  />
                </div>

                <div className="rounded-xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(cart.subtotal)}</span></div>
                  {extraCharges.map((c, i) => (
                    <div key={i} className="flex justify-between"><span className="text-white/70">{c.label}</span><span className="font-bold tabular-nums">{formatPKR(c.value)}</span></div>
                  ))}
                  <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                    <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                    <span className="text-xl font-extrabold text-emerald-300 tabular-nums">{formatPKRFull(grandTotal)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => setShowCheckout(false)}>Back</Button>
                  <Button
                    className="bg-gradient-to-r from-green-500 to-green-600"
                    onClick={sendWhatsAppOrder}
                    disabled={!cart.customerName.trim() || !shopPhone}
                  >
                    <MessageCircle className="h-4 w-4" /> Send Order
                  </Button>
                </div>
                {!shopPhone && (
                  <p className="text-[10px] text-rose-600 font-bold text-center">
                    Shop WhatsApp number not configured. Please contact the shop directly.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-white border-2 border-slate-200 p-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-slate-600 font-semibold">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(cart.subtotal)}</span></div>
                  {extraCharges.map((c, i) => (
                    <div key={i} className="flex justify-between"><span className="text-slate-600 font-semibold">{c.label}</span><span className="font-bold tabular-nums">{formatPKR(c.value)}</span></div>
                  ))}
                  <div className="pt-1 mt-1 border-t border-slate-100 flex justify-between items-center">
                    <span className="font-extrabold text-slate-900">Total</span>
                    <span className="text-xl font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(grandTotal)}</span>
                  </div>
                </div>
                <Button
                  className="w-full h-12"
                  style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)` }}
                  onClick={() => setShowCheckout(true)}
                >
                  <CheckCircle2 className="h-5 w-5" /> Proceed to Order
                </Button>
                <button
                  onClick={() => { if (confirm('Clear cart?')) cart.clear(); }}
                  className="w-full text-xs text-slate-500 font-bold hover:text-rose-600 transition"
                >
                  Clear cart
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
