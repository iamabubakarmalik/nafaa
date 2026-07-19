import { useState } from 'react';
import {
  Home, Plus, Trash2, AlertCircle, ToggleLeft, ToggleRight,
  Info, Zap, Grid3x3, Building, Wand2, RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { formatPKRFull } from '@/lib/format';
import type {
  HotelWizardBasic, HotelWizardRooms, HotelWizardRoomEntry,
} from '../../hooks/useHotelWizard';

interface Props {
  basic: HotelWizardBasic;
  rooms: HotelWizardRooms;
  onToggleAddRooms: (v: boolean) => void;
  onUpdateConfig: (patch: Partial<HotelWizardRooms>) => void;
  onAddRoom: (entry: Omit<HotelWizardRoomEntry, 'tempId'>) => void;
  onUpdateRoom: (tempId: string, patch: Partial<HotelWizardRoomEntry>) => void;
  onRemoveRoom: (tempId: string) => void;
  onGenerateFromRange: () => void;
  onClearRooms: () => void;
  errors: string[];
}

export function HotelWizardStep3Rooms({
  basic, rooms, onToggleAddRooms, onUpdateConfig,
  onAddRoom, onUpdateRoom, onRemoveRoom,
  onGenerateFromRange, onClearRooms, errors,
}: Props) {
  const [manualNumber, setManualNumber] = useState('');
  const [manualFloor, setManualFloor] = useState('');

  const previewCount = Number(rooms.floorEnd || 1) - Number(rooms.floorStart || 1) + 1;
  const totalPreview = Math.max(previewCount, 0) * Number(rooms.roomsPerFloor || 0);

  const addManual = () => {
    const num = manualNumber.trim();
    if (!num) return;
    onAddRoom({
      roomNumber: num,
      floor: manualFloor || undefined,
      building: rooms.building || undefined,
      wing: rooms.wing || undefined,
      viewType: rooms.viewType || undefined,
      facing: rooms.facing || undefined,
    });
    setManualNumber('');
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Home className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-indigo-900 text-sm">Bulk Add Rooms</h3>
          <p className="text-xs text-indigo-800 font-semibold mt-0.5 leading-relaxed">
            Ye room type ke andar individual rooms banaye. Optional hai —
            skip karo to sirf room type ban jayega.
          </p>
        </div>
      </div>

      {/* Toggle */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Home className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Add Rooms Now?</h3>
            <p className="text-sm text-slate-600 font-semibold mt-0.5">
              Room type banane ke sath physical rooms bhi create karain
            </p>
          </div>
          <button
            type="button" onClick={() => onToggleAddRooms(!rooms.addRooms)}
            className={[
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0',
              rooms.addRooms ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}
          >
            {rooms.addRooms ? (<><ToggleRight className="h-5 w-5" /> Yes, add rooms</>)
              : (<><ToggleLeft className="h-5 w-5" /> Skip for now</>)}
          </button>
        </div>

        {!rooms.addRooms && (
          <div className="mt-4 rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <div className="font-extrabold mb-0.5">Skip mode</div>
              <div className="font-semibold">
                Sirf room type save hoga. Rooms baad mein Rooms page se add kar sakte hain.
              </div>
            </div>
          </div>
        )}
      </section>

      {rooms.addRooms && (
        <>
          {/* Mode selector */}
          <section className="grid sm:grid-cols-2 gap-3">
            <button
              type="button" onClick={() => onUpdateConfig({ bulkMode: 'range' })}
              className={[
                'rounded-2xl border-2 p-4 text-left transition',
                rooms.bulkMode === 'range'
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-indigo-300',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <div className={[
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                  rooms.bulkMode === 'range' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700',
                ].join(' ')}>
                  <Wand2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-slate-900 text-sm">Auto Generate</div>
                  <div className="text-[11px] text-slate-600 font-semibold">Floor range + rooms per floor</div>
                </div>
              </div>
            </button>

            <button
              type="button" onClick={() => onUpdateConfig({ bulkMode: 'manual' })}
              className={[
                'rounded-2xl border-2 p-4 text-left transition',
                rooms.bulkMode === 'manual'
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-purple-300',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <div className={[
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                  rooms.bulkMode === 'manual' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700',
                ].join(' ')}>
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-slate-900 text-sm">Manual Entry</div>
                  <div className="text-[11px] text-slate-600 font-semibold">One room at a time</div>
                </div>
              </div>
            </button>
          </section>

          {/* Shared building/wing/view */}
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shadow-md">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Common Details</h3>
                <p className="text-xs text-slate-500 font-semibold">Applies to all generated rooms</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-3">
              <Input
                label="Building"
                value={rooms.building}
                onChange={(e) => onUpdateConfig({ building: e.target.value })}
                placeholder="Main / Annex"
              />
              <Input
                label="Wing"
                value={rooms.wing}
                onChange={(e) => onUpdateConfig({ wing: e.target.value })}
                placeholder="North / East"
              />
              <Input
                label="View Type"
                value={rooms.viewType}
                onChange={(e) => onUpdateConfig({ viewType: e.target.value })}
                placeholder="Sea / Garden"
              />
              <Input
                label="Facing"
                value={rooms.facing}
                onChange={(e) => onUpdateConfig({ facing: e.target.value })}
                placeholder="South / North"
              />
            </div>
          </section>

          {/* Range Mode */}
          {rooms.bulkMode === 'range' && (
            <section className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b-2 border-indigo-100">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-700 text-white flex items-center justify-center shadow-md">
                  <Grid3x3 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-extrabold text-indigo-900 text-base">Auto-Generate Rules</h3>
                  <p className="text-xs text-indigo-700 font-semibold">Floor pattern define karo</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <Input
                  label="Floor Start"
                  type="number" min="1"
                  value={rooms.floorStart}
                  onChange={(e) => onUpdateConfig({ floorStart: e.target.value === '' ? '' : Number(e.target.value) })}
                  hint="e.g. 1"
                />
                <Input
                  label="Floor End"
                  type="number" min="1"
                  value={rooms.floorEnd}
                  onChange={(e) => onUpdateConfig({ floorEnd: e.target.value === '' ? '' : Number(e.target.value) })}
                  hint="e.g. 5"
                />
                <Input
                  label="Rooms per Floor"
                  type="number" min="1"
                  value={rooms.roomsPerFloor}
                  onChange={(e) => onUpdateConfig({ roomsPerFloor: e.target.value === '' ? '' : Number(e.target.value) })}
                  hint="e.g. 10"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Room Number Prefix"
                  value={rooms.roomNumberPrefix}
                  onChange={(e) => onUpdateConfig({ roomNumberPrefix: e.target.value })}
                  placeholder="Optional (e.g. A-)"
                  hint="Empty for plain numbers"
                />
                <Input
                  label="Starting Number"
                  type="number"
                  value={rooms.roomNumberStart}
                  onChange={(e) => onUpdateConfig({ roomNumberStart: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="101"
                  hint="First room on first floor"
                />
              </div>

              {totalPreview > 0 && (
                <div className="rounded-xl bg-indigo-100 border-2 border-indigo-300 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-indigo-700">Preview</div>
                      <div className="text-2xl font-extrabold text-indigo-900 tabular-nums">
                        {totalPreview} rooms
                      </div>
                      <div className="text-[10px] font-bold text-indigo-700">
                        Across {previewCount} floor{previewCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-extrabold text-emerald-700">Est. daily revenue</div>
                      <div className="text-xl font-extrabold text-emerald-700 tabular-nums">
                        {formatPKRFull(totalPreview * Number(basic.basePrice || 0))}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-indigo-700">
                    Example: {rooms.roomNumberPrefix || ''}{Number(rooms.roomNumberStart || 101)},{' '}
                    {rooms.roomNumberPrefix || ''}{Number(rooms.roomNumberStart || 101) + 1}, ...
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button" onClick={onGenerateFromRange}
                  disabled={totalPreview === 0}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                >
                  <Zap className="h-4 w-4" />
                  Generate {totalPreview} Rooms
                </button>
                {rooms.rooms.length > 0 && (
                  <button
                    type="button" onClick={onClearRooms}
                    className="h-11 px-4 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-extrabold text-sm inline-flex items-center gap-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Manual Mode */}
          {rooms.bulkMode === 'manual' && (
            <section className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 space-y-3">
              <div className="flex items-center gap-3 pb-2 border-b-2 border-purple-100">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center shadow-md">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-extrabold text-purple-900 text-base">Add One Room at a Time</h3>
                  <p className="text-xs text-purple-700 font-semibold">Type room number + floor and press Enter</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-[1fr_120px_auto] gap-2 items-end">
                <Input
                  label="Room Number"
                  value={manualNumber}
                  onChange={(e) => setManualNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addManual())}
                  placeholder="101, A-201, Suite-01..."
                />
                <Input
                  label="Floor"
                  value={manualFloor}
                  onChange={(e) => setManualFloor(e.target.value)}
                  placeholder="1"
                />
                <button
                  type="button" onClick={addManual}
                  disabled={!manualNumber.trim()}
                  className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </section>
          )}

          {/* Rooms List */}
          {rooms.rooms.length > 0 ? (
            <section className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-600">Rooms to Create</div>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {rooms.rooms.length} room{rooms.rooms.length !== 1 ? 's' : ''} ready
                  </h4>
                </div>
                <button
                  type="button" onClick={onClearRooms}
                  className="h-8 px-3 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Clear All
                </button>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Room #</th>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Floor</th>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Building</th>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Wing</th>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">View</th>
                      <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Custom Price</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rooms.rooms.map((room) => (
                      <tr key={room.tempId} className="hover:bg-indigo-50/50">
                        <td className="px-2 py-1.5">
                          <input
                            value={room.roomNumber}
                            onChange={(e) => onUpdateRoom(room.tempId, { roomNumber: e.target.value })}
                            className="w-24 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={room.floor ?? ''}
                            onChange={(e) => onUpdateRoom(room.tempId, { floor: e.target.value })}
                            className="w-14 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={room.building ?? ''}
                            onChange={(e) => onUpdateRoom(room.tempId, { building: e.target.value })}
                            className="w-20 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={room.wing ?? ''}
                            onChange={(e) => onUpdateRoom(room.tempId, { wing: e.target.value })}
                            className="w-20 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={room.viewType ?? ''}
                            onChange={(e) => onUpdateRoom(room.tempId, { viewType: e.target.value })}
                            className="w-24 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number" step="0.01"
                            value={room.customPrice ?? ''}
                            onChange={(e) => onUpdateRoom(room.tempId, { customPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                            placeholder={String(basic.basePrice || 0)}
                            className="w-24 h-8 rounded-lg border-2 border-emerald-200 px-2 text-xs font-extrabold tabular-nums text-right focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button" onClick={() => onRemoveRoom(room.tempId)}
                            className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Home className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <div className="font-extrabold text-slate-700 text-sm">No rooms added yet</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">
                {rooms.bulkMode === 'range' ? 'Set floor range and click Generate' : 'Type room number and click Add'}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
