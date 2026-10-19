/**
 * State and money of one salon bill at the counter: service lines (stylist,
 * agreed price, package session, colour notes, products used), retail
 * products, membership discount, discount and tip, and the appointment it
 * closes with its advance. Prices follow the server's rules so the total
 * shown is the total billed.
 */

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { Appointment } from '../api/appointments.api';
import { salonBillsApi, type SalonBillInput } from '../api/bills.api';
import type { SalonService } from '../api/services.api';
import type { StaffProfile } from '../api/staff-profiles.api';
import { emptyCustomer, type CustomerValue } from '../components/fields';

export interface UsedLine { key: string; productId: string; name: string; unit: string; quantity: number }
export interface ServiceLine {
  key: string;
  serviceId: string;
  name: string;
  durationMinutes: number;
  staffProfileId: string;
  /** Agreed price typed by the cashier; null = list (or member) price. */
  price: number | null;
  notes: string;
  packagePurchaseId: string;
  used: UsedLine[];
}
export interface ProductLine { key: string; productId: string; name: string; unit: string; listPrice: number; price: number; quantity: number; stock: number }
export interface LoadedAppointment { id: string; number: string; advance: number; status: string }

const r2 = (n: number) => Math.round(n * 100) / 100;
let seq = 0;
const nextKey = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

/** List price of a service for a stylist: the stylist's own rate for it, else the service's. */
export function listPriceFor(svc: SalonService | undefined, staff: StaffProfile | undefined) {
  if (!svc) return 0;
  const custom = staff?.services?.find((s) => s.serviceId === svc.id)?.customPrice;
  return r2(Number(custom ?? svc.discountPrice ?? svc.price) || 0);
}

export function useSalonBill(services: SalonService[], stylists: StaffProfile[]) {
  const [lines, setLines] = useState<ServiceLine[]>([]);
  const [products, setProducts] = useState<ProductLine[]>([]);
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [appointment, setAppointment] = useState<LoadedAppointment | null>(null);
  const [useMembership, setUseMembership] = useState(false);
  const [discount, setDiscount] = useState('');
  const [tip, setTip] = useState('');

  const perksQ = useQuery({
    queryKey: ['salon-perks', customer.customerId],
    queryFn: () => salonBillsApi.perks(customer.customerId),
    enabled: !!customer.customerId,
    staleTime: 30_000,
  });
  const perks = customer.customerId ? perksQ.data : undefined;
  const memberPct = useMembership ? perks?.membership?.discountPct ?? 0 : 0;

  const svcOf = useCallback((id: string) => services.find((s) => s.id === id), [services]);
  const staffOf = useCallback((id: string) => stylists.find((s) => s.id === id), [stylists]);

  const priced = useMemo(() => lines.map((l) => {
    const list = listPriceFor(svcOf(l.serviceId), staffOf(l.staffProfileId));
    const member = memberPct > 0 ? r2(list * (1 - memberPct / 100)) : list;
    const total = l.packagePurchaseId ? 0 : l.price ?? member;
    return { line: l, list, member, total };
  }), [lines, memberPct, svcOf, staffOf]);

  const servicesTotal = r2(priced.reduce((s, p) => s + p.total, 0));
  const productsTotal = r2(products.reduce((s, p) => s + p.price * p.quantity, 0));
  const memberSaved = r2(priced.reduce((s, p) => s + (p.line.packagePurchaseId ? 0 : p.list - p.member), 0));
  const packageCovered = r2(priced.reduce((s, p) => s + (p.line.packagePurchaseId ? p.list : 0), 0));
  const discountRs = Math.max(Number(discount) || 0, 0);
  const tipRs = Math.max(Number(tip) || 0, 0);
  const total = r2(Math.max(servicesTotal + productsTotal + tipRs - discountRs, 0));
  const advance = appointment?.advance ?? 0;
  const due = r2(Math.max(total - advance, 0));
  const count = lines.length + products.length;

  const addService = (svc: SalonService, staffProfileId = '') => {
    setLines((ls) => [...ls, { key: nextKey(), serviceId: svc.id, name: svc.name, durationMinutes: svc.durationMinutes, staffProfileId, price: null, notes: '', packagePurchaseId: '', used: [] }]);
  };
  const updateLine = (key: string, patch: Partial<ServiceLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));
  const addUsed = (key: string, p: Product, quantity: number) => updateLine(key, {
    used: [...(lines.find((l) => l.key === key)?.used ?? []), { key: nextKey(), productId: p.id, name: p.name, unit: p.unit || 'pcs', quantity }],
  });
  const removeUsed = (key: string, usedKey: string) => updateLine(key, { used: (lines.find((l) => l.key === key)?.used ?? []).filter((u) => u.key !== usedKey) });

  const addProduct = (p: Product) => setProducts((ps) => {
    const found = ps.find((x) => x.productId === p.id);
    if (found) return ps.map((x) => (x === found ? { ...x, quantity: x.quantity + 1 } : x));
    const price = Number(p.price) || 0;
    return [...ps, { key: nextKey(), productId: p.id, name: p.name, unit: p.unit || 'pcs', listPrice: price, price, quantity: 1, stock: Number((p as Product & { shopStock?: number }).shopStock ?? p.stock ?? 0) }];
  });
  const updateProduct = (key: string, patch: Partial<ProductLine>) => setProducts((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)).filter((p) => p.quantity > 0));

  /** Fills the bill from a booked or waiting appointment. */
  const loadAppointment = (a: Appointment) => {
    setAppointment({ id: a.id, number: a.appointmentNumber, advance: Number(a.paidAmount) || 0, status: a.status });
    setCustomer(a.customerId
      ? { customerId: a.customerId, name: a.customer?.name ?? a.customerName ?? '', phone: a.customer?.phone ?? a.customerPhone ?? '', balance: Number(a.customer?.balance ?? 0) }
      : { customerId: '', name: a.customerName ?? '', phone: a.customerPhone ?? '' });
    setLines(a.services.map((s) => {
      const list = listPriceFor(svcOf(s.serviceId), staffOf(s.staffProfileId ?? ''));
      return {
        key: nextKey(), serviceId: s.serviceId, name: s.serviceName ?? 'Service', durationMinutes: s.durationMinutes,
        staffProfileId: s.staffProfileId ?? '', price: Math.abs(Number(s.total) - list) > 0.009 ? Number(s.total) : null,
        notes: s.notes ?? '', packagePurchaseId: '', used: [],
      };
    }));
    setProducts([]);
    setUseMembership(false);
  };

  const reset = () => {
    setLines([]); setProducts([]); setCustomer(emptyCustomer); setAppointment(null); setUseMembership(false); setDiscount(''); setTip('');
  };

  /** Bill body for the API, without the payment fields. */
  const body = (): Omit<SalonBillInput, 'paymentMethod' | 'paidAmount' | 'payments'> => ({
    appointmentId: appointment?.id,
    customerId: customer.customerId || undefined,
    customerName: !customer.customerId && customer.name.trim() ? customer.name.trim() : undefined,
    customerPhone: !customer.customerId && customer.phone.trim() ? customer.phone.trim() : undefined,
    services: lines.map((l) => ({
      serviceId: l.serviceId,
      staffProfileId: l.staffProfileId || undefined,
      price: l.packagePurchaseId || l.price == null ? undefined : l.price,
      notes: l.notes.trim() || undefined,
      packagePurchaseId: l.packagePurchaseId || undefined,
      used: l.used.length ? l.used.map((u) => ({ productId: u.productId, quantity: u.quantity })) : undefined,
    })),
    products: products.length ? products.map((p) => ({ productId: p.productId, quantity: p.quantity, price: p.price !== p.listPrice ? p.price : undefined })) : undefined,
    useMembership: memberPct > 0 || undefined,
    discount: discountRs || undefined,
    tip: tipRs || undefined,
  });

  return {
    lines, products, customer, setCustomer, appointment, setAppointment, perks, perksLoading: perksQ.isLoading,
    useMembership, setUseMembership, memberPct, discount, setDiscount, tip, setTip,
    priced, servicesTotal, productsTotal, memberSaved, packageCovered, discountRs, tipRs, total, advance, due, count,
    addService, updateLine, removeLine, addUsed, removeUsed, addProduct, updateProduct, loadAppointment, reset, body,
  };
}

export type SalonBillState = ReturnType<typeof useSalonBill>;
