import { roomTypesApi } from './room-types.api';
import { roomsApi } from './rooms.api';
import type { HotelWizardDraft } from '../hooks/useHotelWizard';

export interface HotelWizardSaveResult {
  roomTypeId: string;
  roomTypeName: string;
  roomTypeCode: string;
  roomsCreated: number;
  totalCapacity: number;
  amenityCount: number;
}

/**
 * Atomically create a hotel room type with:
 *   • Room type definition (identity + pricing + capacity)
 *   • Amenities (AC, WiFi, TV, minibar, size, custom features)
 *   • Multiple rooms (bulk-generated or manual)
 *
 * Rollback: deletes the room type if any subsequent step fails.
 */
export async function saveHotelWizard(
  draft: HotelWizardDraft,
): Promise<HotelWizardSaveResult> {
  const { basic, amenities, rooms } = draft;

  // ─── 1. CREATE ROOM TYPE ───────────────────────────────
  const roomType = await roomTypesApi.create({
    code: basic.code.trim().toUpperCase(),
    name: basic.name.trim(),
    type: basic.type,
    description: basic.description.trim() || undefined,
    maxAdults: Number(basic.maxAdults || 1),
    maxChildren: Number(basic.maxChildren || 0),
    maxOccupancy: Number(basic.maxOccupancy || 1),
    bedType: basic.bedType,
    bedCount: Number(basic.bedCount || 1),
    extraBedAllowed: basic.extraBedAllowed,
    extraBedPrice: Number(basic.extraBedPrice || 0),
    sizeSqft: amenities.sizeSqft === '' ? undefined : Number(amenities.sizeSqft),
    sizeSqm: amenities.sizeSqm === '' ? undefined : Number(amenities.sizeSqm),
    basePrice: Number(basic.basePrice || 0),
    weekendPrice: basic.weekendPrice === '' ? undefined : Number(basic.weekendPrice),
    peakPrice: basic.peakPrice === '' ? undefined : Number(basic.peakPrice),
    offSeasonPrice: basic.offSeasonPrice === '' ? undefined : Number(basic.offSeasonPrice),
    hourlyPrice: basic.hourlyPrice === '' ? undefined : Number(basic.hourlyPrice),
    hasAC: amenities.hasAC,
    hasHeater: amenities.hasHeater,
    hasTV: amenities.hasTV,
    hasWifi: amenities.hasWifi,
    hasBalcony: amenities.hasBalcony,
    hasKitchen: amenities.hasKitchen,
    hasBathtub: amenities.hasBathtub,
    hasSafe: amenities.hasSafe,
    hasMinibar: amenities.hasMinibar,
    isPetFriendly: amenities.isPetFriendly,
    isSmoking: amenities.isSmoking,
    amenities: amenities.customAmenities,
    imageUrls: basic.imageUrls,
    isActive: basic.isActive,
  });

  const roomTypeId = roomType.id;

  const rollback = async (reason: unknown) => {
    try { await roomTypesApi.remove(roomTypeId); } catch {}
    throw reason;
  };

  // ─── 2. CREATE ROOMS ────────────────────────────────────
  let roomsCreated = 0;
  if (rooms.addRooms && rooms.rooms.length > 0) {
    for (const room of rooms.rooms) {
      try {
        await roomsApi.create({
          roomTypeId,
          roomNumber: room.roomNumber.trim(),
          floor: room.floor?.trim() || undefined,
          building: room.building?.trim() || undefined,
          wing: room.wing?.trim() || undefined,
          viewType: room.viewType?.trim() || undefined,
          facing: room.facing?.trim() || undefined,
          customPrice: room.customPrice,
          customNotes: room.customNotes?.trim() || undefined,
          status: 'AVAILABLE',
          housekeepingStatus: 'CLEAN',
          isActive: true,
        });
        roomsCreated++;
      } catch (e) {
        await rollback(e);
      }
    }
  }

  const amenityCount = [
    amenities.hasAC, amenities.hasHeater, amenities.hasTV, amenities.hasWifi,
    amenities.hasBalcony, amenities.hasKitchen, amenities.hasBathtub,
    amenities.hasSafe, amenities.hasMinibar,
  ].filter(Boolean).length + amenities.customAmenities.length;

  return {
    roomTypeId,
    roomTypeName: roomType.name,
    roomTypeCode: roomType.code,
    roomsCreated,
    totalCapacity: roomsCreated * Number(basic.maxOccupancy || 0),
    amenityCount,
  };
}
