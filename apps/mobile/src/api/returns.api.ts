import { apiClient } from './client';
import type { PaymentMethod } from './sales.api';

export interface ReturnItem {
  id: string;
  quantity: number;
  refundPrice: number;
  total: number;
  product: {
    id: string;
    name: string;
    unit: string;
    sku?: string | null;
  };
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  reason?: string | null;
  notes?: string | null;
  refundAmount: number;
  refundMethod: PaymentMethod;
  returnedAt: string;
  sale: {
    id: string;
    saleNumber: string;
    total: number;
    customer?: { id: string; name: string; phone?: string | null } | null;
  };
  createdBy?: { id: string; fullName: string } | null;
  items: ReturnItem[];
  createdCutPieces?: string[];
}

export interface CreateReturnItemPayload {
  saleItemId: string;
  quantity: number;
  // Carpet-specific (optional)
  createCutPiece?: boolean;
  cutPieceCondition?: string;
  isDamaged?: boolean;
  cutPieceWidthFt?: number;
  cutPieceLengthFt?: number;
  cutPieceNotes?: string;
}

export interface CreateReturnPayload {
  saleId: string;
  reason?: string;
  refundMethod: PaymentMethod;
  notes?: string;
  items: CreateReturnItemPayload[];
}

function unwrapOne<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const returnsApi = {
  list: (): Promise<SaleReturn[]> =>
    apiClient.get('/returns').then((r) => unwrapArr<SaleReturn>(r)),
  getOne: (id: string): Promise<SaleReturn> =>
    apiClient.get(`/returns/${id}`).then((r) => unwrapOne<SaleReturn>(r)),
  create: (payload: CreateReturnPayload): Promise<SaleReturn> =>
    apiClient.post('/returns', payload).then((r) => unwrapOne<SaleReturn>(r)),
};

// ═══════════════════════════════════════════════════════════
// Carpet note parser (matches web version)
// ═══════════════════════════════════════════════════════════
export interface CarpetInfo {
  isRollCut: boolean;
  isCutPiece: boolean;
  rollNumber?: string;
  pieceCode?: string;
  widthFt?: number;
  lengthFt?: number;
  lengthInch?: number;
  sqft?: number;
}

export function parseCarpetNote(note?: string | null): CarpetInfo {
  const result: CarpetInfo = { isRollCut: false, isCutPiece: false };
  if (!note) return result;

  // "Cut from R-001: 12ft × 8ft 3in = 99.00 sqft"
  const rollMatch = note.match(/Cut from ([\w-]+):\s*([\d.]+)ft\s*×\s*([\d.]+)ft(?:\s*([\d.]+)in)?\s*=\s*([\d.]+)\s*sqft/i);
  if (rollMatch) {
    result.isRollCut = true;
    result.rollNumber = rollMatch[1];
    result.widthFt = parseFloat(rollMatch[2]);
    result.lengthFt = parseFloat(rollMatch[3]);
    result.lengthInch = rollMatch[4] ? parseFloat(rollMatch[4]) : 0;
    result.sqft = parseFloat(rollMatch[5]);
    return result;
  }

  // "Cut piece CP-001 • 12ft × 8ft"
  const pieceMatch = note.match(/Cut piece ([\w-]+)\s*•\s*([\d.]+)ft\s*×\s*([\d.]+)ft/i);
  if (pieceMatch) {
    result.isCutPiece = true;
    result.pieceCode = pieceMatch[1];
    result.widthFt = parseFloat(pieceMatch[2]);
    result.lengthFt = parseFloat(pieceMatch[3]);
    result.sqft = result.widthFt * result.lengthFt;
    return result;
  }

  return result;
}
