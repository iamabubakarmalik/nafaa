import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RoomType, BedType } from '../api/room-types.api';

const DRAFT_KEY = 'nafaa.hotel-wizard.draft';

export type WizardStep = 1 | 2 | 3;

export interface HotelWizardBasic {
  code: string;
  name: string;
  type: RoomType;
  description: string;
  maxAdults: number | '';
  maxChildren: number | '';
  maxOccupancy: number | '';
  bedType: BedType;
  bedCount: number | '';
  extraBedAllowed: boolean;
  extraBedPrice: number | '';
  basePrice: number | '';
  weekendPrice: number | '';
  peakPrice: number | '';
  offSeasonPrice: number | '';
  hourlyPrice: number | '';
  imageUrls: string[];
  isActive: boolean;
}

export interface HotelWizardAmenities {
  hasAC: boolean;
  hasHeater: boolean;
  hasTV: boolean;
  hasWifi: boolean;
  hasBalcony: boolean;
  hasKitchen: boolean;
  hasBathtub: boolean;
  hasSafe: boolean;
  hasMinibar: boolean;
  isPetFriendly: boolean;
  isSmoking: boolean;
  sizeSqft: number | '';
  sizeSqm: number | '';
  customAmenities: string[];
}

export interface HotelWizardRoomEntry {
  tempId: string;
  roomNumber: string;
  floor?: string;
  building?: string;
  wing?: string;
  viewType?: string;
  facing?: string;
  customPrice?: number;
  customNotes?: string;
}

export interface HotelWizardRooms {
  addRooms: boolean;
  bulkMode: 'range' | 'manual';
  // Range mode
  floorStart: number | '';
  floorEnd: number | '';
  roomsPerFloor: number | '';
  roomNumberPrefix: string;
  roomNumberStart: number | '';
  building: string;
  wing: string;
  viewType: string;
  facing: string;
  // Manual entries
  rooms: HotelWizardRoomEntry[];
}

export interface HotelWizardDraft {
  step: WizardStep;
  basic: HotelWizardBasic;
  amenities: HotelWizardAmenities;
  rooms: HotelWizardRooms;
  savedAt: number;
}

const emptyBasic = (): HotelWizardBasic => ({
  code: '', name: '', type: 'DOUBLE', description: '',
  maxAdults: 2, maxChildren: 0, maxOccupancy: 2,
  bedType: 'DOUBLE_BED', bedCount: 1,
  extraBedAllowed: false, extraBedPrice: 0,
  basePrice: '', weekendPrice: '', peakPrice: '', offSeasonPrice: '', hourlyPrice: '',
  imageUrls: [],
  isActive: true,
});

const emptyAmenities = (): HotelWizardAmenities => ({
  hasAC: true, hasHeater: false, hasTV: true, hasWifi: true,
  hasBalcony: false, hasKitchen: false, hasBathtub: false,
  hasSafe: false, hasMinibar: false,
  isPetFriendly: false, isSmoking: false,
  sizeSqft: '', sizeSqm: '',
  customAmenities: [],
});

const emptyRooms = (): HotelWizardRooms => ({
  addRooms: false,
  bulkMode: 'range',
  floorStart: 1, floorEnd: 1,
  roomsPerFloor: 10,
  roomNumberPrefix: '',
  roomNumberStart: 101,
  building: '', wing: '', viewType: '', facing: '',
  rooms: [],
});

const emptyDraft = (): HotelWizardDraft => ({
  step: 1,
  basic: emptyBasic(),
  amenities: emptyAmenities(),
  rooms: emptyRooms(),
  savedAt: Date.now(),
});

const genId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface UseHotelWizardOpts {
  autoLoadDraft?: boolean;
  onDraftLoaded?: () => void;
}

export function useHotelWizard(opts: UseHotelWizardOpts = {}) {
  const [draft, setDraft] = useState<HotelWizardDraft>(emptyDraft);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    if (!opts.autoLoadDraft) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HotelWizardDraft;
        if (parsed && parsed.basic) {
          const safe: HotelWizardDraft = {
            ...emptyDraft(),
            ...parsed,
            basic: { ...emptyBasic(), ...parsed.basic },
            amenities: { ...emptyAmenities(), ...parsed.amenities },
            rooms: { ...emptyRooms(), ...parsed.rooms },
          };
          setDraft(safe);
          setDraftRestored(true);
          opts.onDraftLoaded?.();
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  const goToStep = useCallback((step: WizardStep) => setDraft((d) => ({ ...d, step })), []);
  const nextStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: (d.step < 3 ? d.step + 1 : 3) as WizardStep }));
  }, []);
  const prevStep = useCallback(() => {
    setDraft((d) => ({ ...d, step: (d.step > 1 ? d.step - 1 : 1) as WizardStep }));
  }, []);

  const updateBasic = useCallback((patch: Partial<HotelWizardBasic>) => {
    setDraft((d) => ({ ...d, basic: { ...d.basic, ...patch } }));
  }, []);

  const updateAmenities = useCallback((patch: Partial<HotelWizardAmenities>) => {
    setDraft((d) => ({ ...d, amenities: { ...d.amenities, ...patch } }));
  }, []);

  const toggleCustomAmenity = useCallback((amenity: string) => {
    setDraft((d) => ({
      ...d,
      amenities: {
        ...d.amenities,
        customAmenities: d.amenities.customAmenities.includes(amenity)
          ? d.amenities.customAmenities.filter((a) => a !== amenity)
          : [...d.amenities.customAmenities, amenity],
      },
    }));
  }, []);

  const addCustomAmenity = useCallback((amenity: string) => {
    const trimmed = amenity.trim();
    if (!trimmed) return;
    setDraft((d) => {
      if (d.amenities.customAmenities.includes(trimmed)) return d;
      return {
        ...d,
        amenities: { ...d.amenities, customAmenities: [...d.amenities.customAmenities, trimmed] },
      };
    });
  }, []);

  const setAddRooms = useCallback((v: boolean) => {
    setDraft((d) => (v ? { ...d, rooms: { ...d.rooms, addRooms: true } } : { ...d, rooms: { ...emptyRooms() } }));
  }, []);

  const updateRoomsConfig = useCallback((patch: Partial<HotelWizardRooms>) => {
    setDraft((d) => ({ ...d, rooms: { ...d.rooms, ...patch } }));
  }, []);

  const addRoomEntry = useCallback((entry: Omit<HotelWizardRoomEntry, 'tempId'>) => {
    setDraft((d) => ({
      ...d,
      rooms: {
        ...d.rooms,
        rooms: [...d.rooms.rooms, { ...entry, tempId: genId() }],
      },
    }));
  }, []);

  const updateRoomEntry = useCallback((tempId: string, patch: Partial<HotelWizardRoomEntry>) => {
    setDraft((d) => ({
      ...d,
      rooms: {
        ...d.rooms,
        rooms: d.rooms.rooms.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)),
      },
    }));
  }, []);

  const removeRoomEntry = useCallback((tempId: string) => {
    setDraft((d) => ({
      ...d,
      rooms: {
        ...d.rooms,
        rooms: d.rooms.rooms.filter((r) => r.tempId !== tempId),
      },
    }));
  }, []);

  const generateFromRange = useCallback(() => {
    setDraft((d) => {
      const start = Number(d.rooms.floorStart || 1);
      const end = Number(d.rooms.floorEnd || 1);
      const perFloor = Number(d.rooms.roomsPerFloor || 10);
      const numStart = Number(d.rooms.roomNumberStart || 101);
      const prefix = d.rooms.roomNumberPrefix || '';

      const generated: HotelWizardRoomEntry[] = [];
      for (let floor = start; floor <= end; floor++) {
        for (let i = 0; i < perFloor; i++) {
          const baseNum = numStart + (floor - start) * 100 + i;
          generated.push({
            tempId: genId(),
            roomNumber: `${prefix}${baseNum}`,
            floor: String(floor),
            building: d.rooms.building || undefined,
            wing: d.rooms.wing || undefined,
            viewType: d.rooms.viewType || undefined,
            facing: d.rooms.facing || undefined,
          });
        }
      }
      return { ...d, rooms: { ...d.rooms, rooms: generated } };
    });
  }, []);

  const clearRooms = useCallback(() => {
    setDraft((d) => ({ ...d, rooms: { ...d.rooms, rooms: [] } }));
  }, []);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftRestored(false);
  }, []);

  const validation = useMemo(() => {
    const step1Errors: string[] = [];
    if (!draft.basic.code.trim()) step1Errors.push('Code required (e.g. DLX)');
    if (!draft.basic.name.trim()) step1Errors.push('Room type name required');
    if (!draft.basic.basePrice || Number(draft.basic.basePrice) <= 0) {
      step1Errors.push('Base price required');
    }
    if (!draft.basic.maxOccupancy || Number(draft.basic.maxOccupancy) <= 0) {
      step1Errors.push('Max occupancy required');
    }

    const step2Errors: string[] = [];

    const step3Errors: string[] = [];
    if (draft.rooms.addRooms && draft.rooms.rooms.length > 0) {
      const numbers = new Set<string>();
      for (const r of draft.rooms.rooms) {
        if (!r.roomNumber.trim()) {
          step3Errors.push('Room number missing');
        } else {
          const key = r.roomNumber.trim().toLowerCase();
          if (numbers.has(key)) step3Errors.push(`Duplicate room number: ${r.roomNumber}`);
          numbers.add(key);
        }
      }
    }

    return {
      step1: { valid: step1Errors.length === 0, errors: step1Errors },
      step2: { valid: step2Errors.length === 0, errors: step2Errors },
      step3: { valid: step3Errors.length === 0, errors: step3Errors },
      allValid: step1Errors.length === 0 && step2Errors.length === 0 && step3Errors.length === 0,
    };
  }, [draft]);

  const stats = useMemo(() => {
    const roomCount = draft.rooms.addRooms ? draft.rooms.rooms.length : 0;
    const basePrice = Number(draft.basic.basePrice || 0);
    const totalDailyRevenue = roomCount * basePrice;
    const monthlyPotential = totalDailyRevenue * 30;

    const amenityCount = [
      draft.amenities.hasAC, draft.amenities.hasHeater, draft.amenities.hasTV,
      draft.amenities.hasWifi, draft.amenities.hasBalcony, draft.amenities.hasKitchen,
      draft.amenities.hasBathtub, draft.amenities.hasSafe, draft.amenities.hasMinibar,
    ].filter(Boolean).length + draft.amenities.customAmenities.length;

    return {
      roomCount, basePrice, totalDailyRevenue, monthlyPotential,
      amenityCount,
      capacity: Number(draft.basic.maxOccupancy || 0) * roomCount,
    };
  }, [draft]);

  return {
    draft, draftRestored, validation, stats,
    goToStep, nextStep, prevStep,
    updateBasic,
    updateAmenities, toggleCustomAmenity, addCustomAmenity,
    setAddRooms, updateRoomsConfig,
    addRoomEntry, updateRoomEntry, removeRoomEntry,
    generateFromRange, clearRooms,
    reset,
  };
}
