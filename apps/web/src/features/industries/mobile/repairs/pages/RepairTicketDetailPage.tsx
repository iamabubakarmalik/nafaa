import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Smartphone, User, Phone, MapPin, CreditCard, Calendar,
  Wrench, Stethoscope, Package, DollarSign, Banknote, Plus, Trash2,
  CheckCircle2, AlertCircle, Lock, ShieldCheck, MessageCircle, Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { formatPKR } from '@/lib/format';
import {
  repairsApi,
  type RepairStatus,
  REPAIR_STATUS_LABELS,
  VALID_STATUS_TRANSITIONS,
} from '../api/repairs.api';
import { RepairStatusBadge } from '../components/RepairStatusBadge';
import { RepairPriorityBadge } from '../components/RepairPriorityBadge';
import { RepairStatusTimeline } from '../components/RepairStatusTimeline';
import { DiagnoseModal } from '../components/DiagnoseModal';
import { AddPartModal } from '../components/AddPartModal';
import { AddPaymentModal } from '../components/AddPaymentModal';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

export default function RepairTicketDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showDiagnoseModal, setShowDiagnoseModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['repair-ticket', id],
    queryFn: () => repairsApi.getOne(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (toStatus: RepairStatus) =>
      repairsApi.updateStatus(id!, { toStatus }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['repair-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['repair-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const removePartMutation = useMutation({
    mutationFn: (partId: string) => repairsApi.removePart(id!, partId),
    onSuccess: () => {
      toast.success('Part removed');
      queryClient.invalidateQueries({ queryKey: ['repair-ticket', id] });
    },
  });

  const handleWhatsApp = () => {
    if (!ticket) return;
    const phone = ticket.customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const message = `*Repair Update*\n\nTicket: *${ticket.ticketNumber}*\nDevice: ${ticket.deviceBrand} ${ticket.deviceModel}\nStatus: *${REPAIR_STATUS_LABELS[ticket.status]}*\n${ticket.totalCost > 0 ? `Total: ${formatPKR(ticket.totalCost)}\nPaid: ${formatPKR(ticket.paidAmount)}\nBalance: ${formatPKR(ticket.balanceDue)}` : ''}\n\nShukriya!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="inline-block h-10 w-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mx-auto" />
        <h3 className="mt-3 font-bold text-slate-900">Ticket not found</h3>
        <Link to="/repair-tickets" className="mt-4 text-sm font-bold text-orange-600 hover:underline inline-block">
          ← Back to Repairs
        </Link>
      </div>
    );
  }

  const allowedTransitions = VALID_STATUS_TRANSITIONS[ticket.status] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <Link to="/repair-tickets" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600">
          <ArrowLeft className="h-4 w-4" /> Back to Repairs
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4" /> WhatsApp Customer
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Wrench className="h-3 w-3" /> Repair Ticket
            </div>
            <h1 className="mt-3 text-3xl font-extrabold font-mono">{ticket.ticketNumber}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-white/80 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(ticket.receivedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5" />
                {ticket.deviceBrand} {ticket.deviceModel}
              </span>
            </div>
          </div>
          <div className="text-right space-y-2">
            <RepairStatusBadge status={ticket.status} size="lg" />
            <RepairPriorityBadge priority={ticket.priority} size="lg" />
          </div>
        </div>
      </section>

      {/* Action bar — Status transitions */}
      {allowedTransitions.length > 0 && (
        <div className="rounded-2xl bg-white border-2 border-slate-200 p-4">
          <div className="text-xs font-bold text-slate-600 uppercase mb-2">Quick Status Actions</div>
          <div className="flex flex-wrap gap-2">
            {allowedTransitions.map((status) => (
              <button
                key={status}
                onClick={() => {
                  if (confirm(`Move to ${REPAIR_STATUS_LABELS[status]}?`)) {
                    statusMutation.mutate(status);
                  }
                }}
                disabled={statusMutation.isPending}
                className="px-3 py-2 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" /> {REPAIR_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_400px] gap-4">
        {/* Main column */}
        <div className="space-y-4">
          {/* Device + Customer info */}
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoCard title="Device" icon={Smartphone}>
              <Row label="Brand" value={ticket.deviceBrand} />
              <Row label="Model" value={ticket.deviceModel} />
              {ticket.deviceColor && <Row label="Color" value={ticket.deviceColor} />}
              {ticket.imei1 && <Row label="IMEI 1" value={ticket.imei1} mono />}
              {ticket.imei2 && <Row label="IMEI 2" value={ticket.imei2} mono />}
              {ticket.serialNumber && <Row label="Serial" value={ticket.serialNumber} mono />}
              <Row label="SIM" value={ticket.hasSimCard ? 'Yes' : 'No'} />
              <Row label="Memory Card" value={ticket.hasMemoryCard ? 'Yes' : 'No'} />
              {ticket.passcode && (
                <Row label="Passcode" value={`🔒 ${ticket.passcode}`} mono className="bg-amber-50" />
              )}
            </InfoCard>

            <InfoCard title="Customer" icon={User}>
              <Row label="Name" value={ticket.customerName} />
              <Row label="Phone" value={ticket.customerPhone} mono />
              {ticket.customerCnic && <Row label="CNIC" value={ticket.customerCnic} mono />}
              {ticket.customerAddress && <Row label="Address" value={ticket.customerAddress} />}
              {ticket.customer && (
                <Link to={`/customers/${ticket.customer.id}`} className="text-xs text-violet-700 font-bold hover:underline">
                  → View customer profile
                </Link>
              )}
            </InfoCard>
          </div>

          {/* Issue & Diagnosis */}
          <div className="rounded-3xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Issue & Diagnosis</h3>
              </div>
              {!ticket.diagnosedIssue && (
                <Button onClick={() => setShowDiagnoseModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                  <Stethoscope className="h-4 w-4" /> Diagnose
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                <div className="text-[10px] uppercase font-bold text-blue-700">Customer Said</div>
                <div className="text-sm text-slate-900 mt-1 whitespace-pre-line">{ticket.reportedIssue}</div>
              </div>

              {ticket.diagnosedIssue ? (
                <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase font-bold text-indigo-700">Diagnosis</div>
                    <button
                      onClick={() => setShowDiagnoseModal(true)}
                      className="text-[10px] font-bold text-indigo-700 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-sm text-slate-900 mt-1 whitespace-pre-line font-bold">{ticket.diagnosedIssue}</div>
                  {ticket.diagnosisNotes && (
                    <div className="mt-2 text-xs text-slate-600">{ticket.diagnosisNotes}</div>
                  )}
                  {ticket.recommendedActions && (
                    <div className="mt-2 pt-2 border-t border-indigo-100">
                      <div className="text-[10px] uppercase font-bold text-indigo-700">Recommended</div>
                      <div className="text-xs text-slate-700 mt-0.5">{ticket.recommendedActions}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center">
                  <Stethoscope className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                  <div className="text-xs text-slate-500">Not yet diagnosed</div>
                </div>
              )}
            </div>
          </div>

          {/* Parts used */}
          <div className="rounded-3xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">
                  Parts Used <span className="text-slate-500 font-normal">({ticket.parts?.length || 0})</span>
                </h3>
              </div>
              <Button onClick={() => setShowPartModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4" /> Add Part
              </Button>
            </div>

            {(ticket.parts?.length ?? 0) === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
                <Package className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                <div className="text-sm text-slate-500">No parts added yet</div>
              </div>
            ) : (
              <div className="space-y-2">
                {ticket.parts?.map((part) => (
                  <div key={part.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm">{part.partName}</div>
                      <div className="text-[11px] text-slate-500">
                        {part.quantity} × {formatPKR(part.unitPrice)}
                        {part.source && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold">
                            {part.source}
                          </span>
                        )}
                      </div>
                      {part.product && (
                        <div className="text-[10px] text-violet-700 font-bold mt-0.5">
                          📦 From inventory
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-emerald-700">{formatPKR(part.totalPrice)}</div>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${part.partName}?`)) removePartMutation.mutate(part.id);
                        }}
                        className="mt-1 h-6 w-6 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center ml-auto"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-3xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-violet-600" />
              <h3 className="font-bold text-slate-900">Status Timeline</h3>
            </div>
            <RepairStatusTimeline logs={ticket.statusLog || []} />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Pricing summary */}
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 border-2 border-emerald-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-emerald-700" />
              <h3 className="font-bold text-emerald-900">Pricing Summary</h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Parts Cost</span>
                <span className="font-bold">{formatPKR(ticket.partsCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Labor Cost</span>
                <span className="font-bold">{formatPKR(ticket.laborCost)}</span>
              </div>
              {ticket.discount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Discount</span>
                  <span className="font-bold">-{formatPKR(ticket.discount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t-2 border-emerald-200">
                <span className="font-bold text-slate-900">Total</span>
                <span className="font-extrabold text-emerald-700 text-lg">{formatPKR(ticket.totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700 font-bold">Paid</span>
                <span className="font-bold text-emerald-700">{formatPKR(ticket.paidAmount)}</span>
              </div>
              {ticket.balanceDue > 0 && (
                <div className="rounded-lg bg-amber-100 border border-amber-300 px-3 py-2 flex justify-between">
                  <span className="font-bold text-amber-900">Balance Due</span>
                  <span className="font-extrabold text-amber-900">{formatPKR(ticket.balanceDue)}</span>
                </div>
              )}
            </div>

            <Button
              onClick={() => setShowPaymentModal(true)}
              className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700"
              disabled={ticket.balanceDue <= 0}
            >
              <Banknote className="h-4 w-4" /> Record Payment
            </Button>
          </div>

          {/* Payments history */}
          {(ticket.payments?.length ?? 0) > 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-600" /> Payment History
              </h3>
              <div className="space-y-2">
                {ticket.payments?.map((p) => (
                  <div key={p.id} className="rounded-lg bg-slate-50 p-2 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-emerald-700">{formatPKR(p.amount)}</div>
                      <div className="text-[9px] text-slate-500">
                        {p.paymentMethod} · {formatDate(p.paidAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warranty */}
          {ticket.warrantyEnds && (
            <div className="rounded-2xl bg-teal-50 border-2 border-teal-200 p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-700" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-teal-700">Repair Warranty</div>
                  <div className="text-sm font-bold text-teal-900">
                    Till {new Date(ticket.warrantyEnds).toLocaleDateString('en-PK')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Technician */}
          {ticket.technicianName && (
            <div className="rounded-2xl bg-violet-50 border border-violet-200 p-3">
              <div className="text-[10px] uppercase font-bold text-violet-700">Assigned Technician</div>
              <div className="text-sm font-bold text-violet-900 mt-0.5">👨‍🔧 {ticket.technicianName}</div>
            </div>
          )}
        </aside>
      </div>

      {/* Modals */}
      {showDiagnoseModal && (
        <DiagnoseModal
          ticketId={ticket.id}
          ticketNumber={ticket.ticketNumber}
          initialEstimate={ticket.estimatedCost}
          onClose={() => setShowDiagnoseModal(false)}
        />
      )}
      {showPartModal && (
        <AddPartModal
          ticketId={ticket.id}
          ticketNumber={ticket.ticketNumber}
          onClose={() => setShowPartModal(false)}
        />
      )}
      {showPaymentModal && (
        <AddPaymentModal
          ticketId={ticket.id}
          ticketNumber={ticket.ticketNumber}
          balanceDue={ticket.balanceDue}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}

function InfoCard({ title, icon: Icon, children }: any) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-slate-600" />
        <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, mono, className = '' }: any) {
  return (
    <div className={`flex justify-between gap-2 text-xs ${className}`}>
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold text-slate-900 truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
