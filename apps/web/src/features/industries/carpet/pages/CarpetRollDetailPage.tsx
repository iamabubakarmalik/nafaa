import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Layers, Scissors, Ruler, DollarSign, MapPin,
  AlertTriangle, CheckCircle2, Edit3, Save, X, Activity,
  Sliders, Trash2, Package, History, TrendingDown, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKRFull } from '@/lib/format';
import {
  carpetRollsApi,
  type CarpetRollStatus,
} from '../api/carpet-rolls.api';

const statusColors: Record<CarpetRollStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  FINISHED: 'bg-slate-100 text-slate-700 border-slate-300',
  DAMAGED: 'bg-rose-100 text-rose-700 border-rose-300',
  RESERVED: 'bg-amber-100 text-amber-700 border-amber-300',
  TRANSFERRED: 'bg-blue-100 text-blue-700 border-blue-300',
};

export default function CarpetRollDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [showCutModal, setShowCutModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const { data: roll, isLoading } = useQuery({
    queryKey: ['carpet-roll', id],
    queryFn: () => carpetRollsApi.getOne(id!),
    enabled: !!id,
  });

  const [editForm, setEditForm] = useState({
    designCode: '',
    salePricePerSqft: 0,
    wholesalePricePerSqft: 0,
    rackNumber: '',
    notes: '',
    quality: '',
    pile: '',
  });

  const startEdit = () => {
    if (!roll) return;
    setEditForm({
      designCode: roll.designCode ?? '',
      salePricePerSqft: roll.salePricePerSqft,
      wholesalePricePerSqft: roll.wholesalePricePerSqft ?? 0,
      rackNumber: roll.rackNumber ?? '',
      notes: roll.notes ?? '',
      quality: roll.quality ?? '',
      pile: roll.pile ?? '',
    });
    setEditMode(true);
  };

  const updateMutation = useMutation({
    mutationFn: () => carpetRollsApi.update(id!, editForm),
    onSuccess: () => {
      toast.success('Roll updated');
      queryClient.invalidateQueries({ queryKey: ['carpet-roll', id] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      setEditMode(false);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const markDamagedMutation = useMutation({
    mutationFn: (reason: string) => carpetRollsApi.markDamaged(id!, reason),
    onSuccess: () => {
      toast.success('Marked as damaged');
      queryClient.invalidateQueries({ queryKey: ['carpet-roll', id] });
    },
  });

  const markFinishedMutation = useMutation({
    mutationFn: () => carpetRollsApi.markFinished(id!),
    onSuccess: () => {
      toast.success('Marked as finished');
      queryClient.invalidateQueries({ queryKey: ['carpet-roll', id] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => carpetRollsApi.remove(id!),
    onSuccess: (res: any) => {
      toast.success(res?.message ?? 'Deleted');
      navigate('/carpet-rolls');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200 p-16 text-center">
        <Layers className="h-12 w-12 text-slate-300 mx-auto animate-pulse" />
        <p className="text-sm text-slate-500 mt-3">Loading roll...</p>
      </div>
    );
  }

  if (!roll) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200 p-16 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-400 mx-auto" />
        <h3 className="mt-3 font-bold text-slate-900">Roll not found</h3>
        <Link to="/carpet-rolls" className="text-brand-600 text-sm font-bold mt-2 inline-block">
          ← Back to rolls
        </Link>
      </div>
    );
  }

  const fullWidth = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
  const percentRemaining =
    roll.originalLengthFt > 0
      ? (Number(roll.remainingLengthFt) / Number(roll.originalLengthFt)) * 100
      : 0;
  const soldLength = Number(roll.originalLengthFt) - Number(roll.remainingLengthFt);
  const soldSqft = soldLength * fullWidth;
  const estimatedRevenue = soldSqft * Number(roll.salePricePerSqft);
  const estimatedCost = soldSqft * Number(roll.costPerSqft);
  const estimatedProfit = estimatedRevenue - estimatedCost;

  return (
    <div className="space-y-6">
      {showCutModal && (
        <CutFromRollModal
          rollId={id!}
          rollWidthFt={fullWidth}
          remainingLengthFt={roll.remainingLengthFt}
          salePricePerSqft={roll.salePricePerSqft}
          onClose={() => setShowCutModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['carpet-roll', id] });
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
            setShowCutModal(false);
          }}
        />
      )}

      {showAdjustModal && (
        <AdjustRollModal
          rollId={id!}
          currentRemaining={roll.remainingLengthFt}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['carpet-roll', id] });
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
            setShowAdjustModal(false);
          }}
        />
      )}

      {/* Back link */}
      <Link
        to="/carpet-rolls"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Carpet Rolls
      </Link>

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-brand-900 via-emerald-800 to-emerald-700 text-white p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium mb-2">
              <Layers className="h-3.5 w-3.5" /> Carpet Roll
            </div>
            <h1 className="text-3xl font-extrabold font-mono">{roll.rollNumber}</h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-white/90 font-bold">{roll.product?.name}</span>
              {roll.variant && (
                <>
                  <span className="text-white/60">•</span>
                  <span className="inline-flex items-center gap-1.5 text-white/90 font-bold">
                    {roll.variant.colorHex && (
                      <span
                        className="h-2.5 w-2.5 rounded-full ring-2 ring-white/50"
                        style={{ backgroundColor: roll.variant.colorHex }}
                      />
                    )}
                    {roll.variant.name}
                  </span>
                </>
              )}
              {roll.designCode && (
                <>
                  <span className="text-white/60">•</span>
                  <span className="font-mono text-white/80 text-sm">{roll.designCode}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full border text-xs font-extrabold ${statusColors[roll.status]}`}
            >
              {roll.status}
            </span>
            <div className="text-xs text-white/70 font-bold">
              Source: {roll.sourceType.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {roll.status === 'ACTIVE' && roll.remainingLengthFt > 0 && (
          <div className="flex gap-2 flex-wrap mt-5">
            <Button
              onClick={() => setShowCutModal(true)}
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold"
            >
              <Scissors className="h-4 w-4" /> Cut from Roll (Sale)
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowAdjustModal(true)}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20"
            >
              <Sliders className="h-4 w-4" /> Adjust
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const reason = prompt('Damage reason:');
                if (reason) markDamagedMutation.mutate(reason);
              }}
              className="bg-rose-500/20 text-white hover:bg-rose-500/30 border-rose-300/40"
            >
              <AlertTriangle className="h-4 w-4" /> Mark Damaged
            </Button>
          </div>
        )}
      </section>

      {/* Main stats grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Remaining"
          value={`${Number(roll.remainingLengthFt)}ft${Number(roll.remainingLengthInch || 0) > 0 ? ` ${roll.remainingLengthInch}in` : ''}`}
          subValue={`${Number(roll.remainingSqft).toFixed(1)} sqft`}
          color="emerald"
          icon={Ruler}
        />
        <StatCard
          label="Original"
          value={`${Number(roll.originalLengthFt)}ft${Number(roll.originalLengthInch || 0) > 0 ? ` ${roll.originalLengthInch}in` : ''}`}
          subValue={`${Number(roll.originalSqft).toFixed(1)} sqft`}
          color="blue"
          icon={Package}
        />
        <StatCard
          label="Sold"
          value={`${soldLength.toFixed(1)} ft`}
          subValue={`${soldSqft.toFixed(1)} sqft`}
          color="violet"
          icon={TrendingDown}
        />
        <StatCard
          label="Estimated Profit"
          value={formatPKRFull(estimatedProfit)}
          subValue={`from ${soldSqft.toFixed(1)} sqft`}
          color="amber"
          icon={TrendingUp}
        />
      </div>

      {/* Progress bar */}
      <div className="rounded-3xl bg-white border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs uppercase font-bold text-slate-500">Roll Usage</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">
              {percentRemaining.toFixed(1)}% bacha
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 font-bold">
              {Number(roll.remainingLengthFt)}ft {Number(roll.remainingLengthInch || 0) > 0 ? `${roll.remainingLengthInch}in` : ''} / {Number(roll.originalLengthFt)}ft {Number(roll.originalLengthInch || 0) > 0 ? `${roll.originalLengthInch}in` : ''}
            </div>
            <div className="text-xs text-emerald-700 font-bold mt-0.5">
              {fullWidth.toFixed(2)}ft width
            </div>
          </div>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full transition-all ${
              percentRemaining > 50
                ? 'bg-emerald-500'
                : percentRemaining > 20
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
            }`}
            style={{ width: `${Math.max(percentRemaining, 3)}%` }}
          />
        </div>
      </div>

      {/* Details + Movement History */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Details */}
        <div className="rounded-3xl bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Roll Details</h3>
            {!editMode ? (
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 text-xs font-bold"
              >
                <Edit3 className="h-3 w-3" /> Edit
              </button>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <Save className="h-3 w-3" />
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {!editMode ? (
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <DetailRow label="Dimensions" value={`${Number(roll.widthFt)}ft${Number(roll.widthInch || 0) > 0 ? ` ${roll.widthInch}in` : ''} × ${Number(roll.originalLengthFt)}ft${Number(roll.originalLengthInch || 0) > 0 ? ` ${roll.originalLengthInch}in` : ''}`} />
              <DetailRow label="Cost / sqft" value={formatPKRFull(roll.costPerSqft)} />
              <DetailRow label="Sale / sqft" value={formatPKRFull(roll.salePricePerSqft)} />
              <DetailRow label="Wholesale / sqft" value={roll.wholesalePricePerSqft ? formatPKRFull(roll.wholesalePricePerSqft) : '—'} />
              <DetailRow label="Rack / Location" value={roll.rackNumber || '—'} />
              <DetailRow label="Shop" value={roll.shop?.name || '—'} />
              <DetailRow label="Quality" value={roll.quality || '—'} />
              <DetailRow label="Pile / Material" value={roll.pile || '—'} />
              <DetailRow label="Received At" value={new Date(roll.receivedAt).toLocaleDateString()} />
              <DetailRow label="Design Code" value={roll.designCode || '—'} mono />
              {roll.notes && (
                <div className="sm:col-span-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Notes</div>
                  <div className="text-sm text-slate-700 mt-1">{roll.notes}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Sale / sqft (PKR)"
                  type="number"
                  step="0.01"
                  value={editForm.salePricePerSqft}
                  onChange={(e) => setEditForm({ ...editForm, salePricePerSqft: Number(e.target.value) })}
                />
                <Input
                  label="Wholesale / sqft (PKR)"
                  type="number"
                  step="0.01"
                  value={editForm.wholesalePricePerSqft}
                  onChange={(e) => setEditForm({ ...editForm, wholesalePricePerSqft: Number(e.target.value) })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Rack / Location"
                  value={editForm.rackNumber}
                  onChange={(e) => setEditForm({ ...editForm, rackNumber: e.target.value })}
                />
                <Input
                  label="Design Code"
                  value={editForm.designCode}
                  onChange={(e) => setEditForm({ ...editForm, designCode: e.target.value })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Quality"
                  value={editForm.quality}
                  onChange={(e) => setEditForm({ ...editForm, quality: e.target.value })}
                />
                <Input
                  label="Pile / Material"
                  value={editForm.pile}
                  onChange={(e) => setEditForm({ ...editForm, pile: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Danger zone */}
          {!editMode && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="text-[10px] uppercase tracking-wider font-bold text-rose-600 mb-2">
                Danger Zone
              </div>
              <div className="flex gap-2 flex-wrap">
                {roll.status === 'ACTIVE' && (
                  <button
                    onClick={() => {
                      if (confirm('Mark roll as finished?')) markFinishedMutation.mutate();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Mark Finished
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Delete roll ${roll.rollNumber}?`)) removeMutation.mutate();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700"
                >
                  <Trash2 className="h-3 w-3" /> Delete Roll
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Movement history */}
        <div className="rounded-3xl bg-white border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-slate-600" />
            <h3 className="font-bold text-slate-900">Movement History</h3>
            <span className="ml-auto text-xs text-slate-500 font-bold">
              {roll.movements?.length ?? 0} entries
            </span>
          </div>

          {!roll.movements || roll.movements.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No movements yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {roll.movements.map((m) => (
                <MovementItem key={m.id} movement={m} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cut pieces from this roll */}
      {roll.cutPieces && roll.cutPieces.length > 0 && (
        <div className="rounded-3xl bg-white border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Scissors className="h-4 w-4 text-violet-600" />
            <h3 className="font-bold text-slate-900">Cut Pieces from this Roll</h3>
            <span className="ml-auto text-xs text-slate-500 font-bold">
              {roll.cutPieces.length}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {roll.cutPieces.map((piece: any) => (
              <div key={piece.id} className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
                <div className="font-mono font-extrabold text-xs text-violet-900">
                  {piece.pieceCode}
                </div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {piece.widthFt}ft × {piece.lengthFt}ft
                </div>
                <div className="text-xs text-violet-700 font-bold">
                  {Number(piece.totalSqft).toFixed(2)} sqft
                </div>
                <div className="text-xs font-bold text-emerald-700 mt-1">
                  {formatPKRFull(piece.salePrice)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ───────────────────────────────────────

function StatCard({
  label, value, subValue, color, icon: Icon,
}: { label: string; value: string; subValue?: string; color: string; icon: any }) {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-900',
    blue: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-900',
    violet: 'from-violet-50 to-purple-50 border-violet-200 text-violet-900',
    amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-900',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5" />
        <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">{label}</div>
      </div>
      <div className="text-xl font-extrabold">{value}</div>
      {subValue && <div className="text-[11px] font-bold opacity-70 mt-0.5">{subValue}</div>}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</div>
      <div className={`text-sm font-bold text-slate-900 mt-0.5 ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function MovementItem({ movement }: { movement: any }) {
  const isNegative = Number(movement.lengthFt) < 0;
  const typeLabels: Record<string, { label: string; color: string }> = {
    OPENING: { label: 'Opening Stock', color: 'bg-blue-100 text-blue-700' },
    CUT_FOR_SALE: { label: 'Cut for Sale', color: 'bg-violet-100 text-violet-700' },
    ADJUSTMENT: { label: 'Adjustment', color: 'bg-amber-100 text-amber-700' },
    DAMAGE: { label: 'Damage', color: 'bg-rose-100 text-rose-700' },
    TRANSFER: { label: 'Transfer', color: 'bg-cyan-100 text-cyan-700' },
    RETURN: { label: 'Return', color: 'bg-emerald-100 text-emerald-700' },
  };
  const type = typeLabels[movement.type] ?? { label: movement.type, color: 'bg-slate-100 text-slate-700' };

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${type.color}`}>
          {type.label}
        </span>
        <div className={`text-sm font-extrabold ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
          {isNegative ? '' : '+'}{Number(movement.lengthFt).toFixed(2)}ft
        </div>
      </div>
      <div className="text-xs text-slate-600">
        Balance: <strong>{Number(movement.balanceLengthAfter).toFixed(2)}ft</strong>
        {' • '}
        <strong>{Number(movement.balanceSqftAfter).toFixed(2)}sqft</strong>
      </div>
      {movement.note && (
        <div className="text-[11px] text-slate-500 mt-1 italic">"{movement.note}"</div>
      )}
      <div className="text-[10px] text-slate-400 mt-1 font-bold">
        {new Date(movement.createdAt).toLocaleString()}
      </div>
    </div>
  );
}

// ─── Cut From Roll Modal ─────────────────────────────────────

function CutFromRollModal({
  rollId, rollWidthFt, remainingLengthFt, salePricePerSqft,
  onClose, onSuccess,
}: {
  rollId: string;
  rollWidthFt: number;
  remainingLengthFt: number;
  salePricePerSqft: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [lengthFt, setLengthFt] = useState(0);
  const [lengthInch, setLengthInch] = useState(0);
  const [customerWidthFt, setCustomerWidthFt] = useState(rollWidthFt);
  const [createLeftoverPiece, setCreateLeftoverPiece] = useState(true);
  const [note, setNote] = useState('');

  const cutMutation = useMutation({
    mutationFn: () =>
      carpetRollsApi.cut(rollId, {
        lengthFt,
        lengthInch,
        customerWidthFt,
        createLeftoverPiece,
        note: note || undefined,
      }),
    onSuccess: (res) => {
      toast.success(
        `Cut ${res.cutLengthFt}ft (${res.cutSqft.toFixed(2)} sqft). ` +
        (res.leftoverPiece ? `Leftover cut piece created.` : '')
      );
      onSuccess();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Cut failed'),
  });

  const realLength = Number(lengthFt) + Number(lengthInch || 0) / 12;
  const cutSqft = customerWidthFt * realLength;
  const cutPrice = cutSqft * salePricePerSqft;
  const widthDiff = rollWidthFt - customerWidthFt;
  const leftoverSqft = widthDiff * realLength;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-700 text-white p-5 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Scissors className="h-3.5 w-3.5" /> Cut from Roll
            </div>
            <h2 className="mt-2 text-2xl font-bold">Customer Sale</h2>
            <p className="text-xs text-white/80 mt-1">
              Roll se length cut karein — stock auto reduce hoga
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm">
            <div className="font-bold text-blue-900">Roll Info</div>
            <div className="text-blue-700 mt-1">
              Roll width: <strong>{rollWidthFt.toFixed(2)}ft</strong> •
              Remaining: <strong>{Number(remainingLengthFt).toFixed(2)}ft</strong>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Customer Width (ft) *"
              type="number"
              step="0.01"
              value={customerWidthFt}
              onChange={(e) => setCustomerWidthFt(Number(e.target.value))}
              hint={`Max: ${rollWidthFt.toFixed(2)}ft`}
            />
            <Input
              label="Length to Cut (ft) *"
              type="number"
              step="1"
              value={lengthFt}
              onChange={(e) => setLengthFt(Number(e.target.value))}
              hint="Whole feet portion"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Length Extra (inches, 0-11)"
              type="number"
              step="1"
              min="0"
              max="11"
              value={lengthInch}
              onChange={(e) => setLengthInch(Number(e.target.value))}
              hint='Stock book "29.6" = 29ft + 6in'
            />
            <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 text-xs">
              <div className="font-extrabold text-blue-900">Available</div>
              <div className="text-blue-700 font-bold mt-1">
                {Number(remainingLengthFt)}ft remaining
              </div>
            </div>
          </div>

          {/* Calculation preview */}
          {lengthFt > 0 && customerWidthFt > 0 && (
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Cut Area</div>
                  <div className="text-2xl font-extrabold text-emerald-900">
                    {cutSqft.toFixed(2)} <span className="text-sm">sqft</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold">
                    {customerWidthFt}ft × {lengthFt}ft
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Sale Price</div>
                  <div className="text-2xl font-extrabold text-emerald-900">
                    {formatPKRFull(cutPrice)}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold">
                    @ {formatPKRFull(salePricePerSqft)}/sqft
                  </div>
                </div>
              </div>

              {widthDiff > 0.1 && (
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-amber-700">
                        Leftover Width
                      </div>
                      <div className="text-sm font-extrabold text-amber-900">
                        {widthDiff.toFixed(2)}ft × {lengthFt}ft = {leftoverSqft.toFixed(2)} sqft
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createLeftoverPiece}
                        onChange={(e) => setCreateLeftoverPiece(e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      Auto-create cut piece
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Sale Note (optional)
            </label>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Customer name, order #, etc."
            />
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <Button
            onClick={() => {
              const requestedLen = Number(lengthFt) + Number(lengthInch || 0) / 12;
              if (requestedLen <= 0) return toast.error('Length zaroori hai');
              if (customerWidthFt <= 0) return toast.error('Width zaroori hai');
              if (requestedLen > Number(remainingLengthFt))
                return toast.error(`Only ${remainingLengthFt}ft remaining`);
              if (customerWidthFt > rollWidthFt)
                return toast.error(`Max width ${rollWidthFt}ft`);
              cutMutation.mutate();
            }}
            loading={cutMutation.isPending}
            className="bg-gradient-to-r from-emerald-700 to-emerald-600"
          >
            <Scissors className="h-4 w-4" /> Confirm Cut
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Adjust Roll Modal ───────────────────────────────────────

function AdjustRollModal({
  rollId, currentRemaining, onClose, onSuccess,
}: {
  rollId: string;
  currentRemaining: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [lengthDeltaFt, setLengthDeltaFt] = useState(0);
  const [lengthDeltaInch, setLengthDeltaInch] = useState(0);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const adjustMutation = useMutation({
    mutationFn: () =>
      carpetRollsApi.adjust(rollId, {
        lengthDeltaFt,
        lengthDeltaInch,
        reason: reason || 'Manual adjustment',
        note: note || undefined,
      }),
    onSuccess: () => {
      toast.success('Roll adjusted');
      onSuccess();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Adjustment failed'),
  });

  const deltaReal = Number(lengthDeltaFt) + Number(lengthDeltaInch || 0) / 12;
  const newRemaining = Number(currentRemaining) + deltaReal;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-br from-amber-700 to-orange-700 text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Adjust Roll</h2>
            <p className="text-xs text-white/80 mt-1">Manual stock correction</p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm">
            <div className="text-[10px] uppercase font-bold text-slate-500">Current Remaining</div>
            <div className="text-lg font-extrabold text-slate-900">
              {Number(currentRemaining).toFixed(2)} ft
            </div>
          </div>

          <Input
            label="Length Delta (ft) *"
            type="number"
            step="1"
            value={lengthDeltaFt}
            onChange={(e) => setLengthDeltaFt(Number(e.target.value))}
            hint="Whole feet (+ to add, - to reduce)"
          />

          <Input
            label="Length Delta (inches)"
            type="number"
            step="1"
            value={lengthDeltaInch}
            onChange={(e) => setLengthDeltaInch(Number(e.target.value))}
            hint="Extra inches portion (0-11)"
          />

          {lengthDeltaFt !== 0 && (
            <div className={`rounded-xl border-2 p-3 ${
              newRemaining < 0
                ? 'bg-rose-50 border-rose-300'
                : lengthDeltaFt < 0
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-emerald-50 border-emerald-300'
            }`}>
              <div className="text-[10px] uppercase font-bold">New Remaining</div>
              <div className="text-lg font-extrabold">
                {newRemaining.toFixed(2)} ft
              </div>
              {newRemaining < 0 && (
                <div className="text-xs font-bold text-rose-700 mt-1">
                  ⚠️ Cannot be negative
                </div>
              )}
            </div>
          )}

          <Input
            label="Reason *"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Damage in corner, count correction"
          />

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Additional Note
            </label>
            <textarea
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional details..."
            />
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <Button
            onClick={() => {
              if (lengthDeltaFt === 0 && lengthDeltaInch === 0) return toast.error('Delta cannot be zero');
              if (!reason.trim()) return toast.error('Reason zaroori hai');
              if (newRemaining < 0) return toast.error('Cannot make remaining negative');
              adjustMutation.mutate();
            }}
            loading={adjustMutation.isPending}
            className="bg-gradient-to-r from-amber-700 to-orange-700"
          >
            <Save className="h-4 w-4" /> Confirm Adjustment
          </Button>
        </div>
      </div>
    </div>
  );
}
