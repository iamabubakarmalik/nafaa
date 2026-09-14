import { installationsApi } from './installations.api';
import { serviceRequestsApi } from './service-requests.api';
import { applianceSerialApi } from './serial-tracking.api';

/* ═════════════════════════════════════════════════════════════
   APPLIANCES — OFFLINE SAFE WRAPPERS
   ─────────────────────────────────────────────────────────────
   Masla: POS par sale to `offlineSalesApi` se hoti thi (offline
   me queue ho jati thi), lekin sale ke BAAD ke teen kaam —
   installation book karna, serial ko SOLD karna, aur service
   request banana — seedhe API call thay jo `try/catch {}` me
   lipte hue thay.

   Natija: internet na ho to sale ho jati thi lekin installation
   aur serial ka record **khamoshi se zaya** ho jata tha. Customer
   intezar karta rehta aur dukaan ko pata hi nahi chalta.

   Ab ye wrappers network fail hone par kaam sync queue me daal
   dete hain — internet aate hi khud chala jata hai, aur offline
   history me bhi nazar aata hai.
   ═════════════════════════════════════════════════════════════ */

/** Network ka masla hai (server ka jawab nahi) — ya asli 4xx error? */
const isNetFail = (e: any): boolean => {
  const s = e?.response?.status;
  return !s || s === 0 || s === 408 || s >= 502;
};

async function queue(
  type: 'CREATE_INSTALLATION' | 'CREATE_SERVICE_REQUEST' | 'UPDATE_APPLIANCE_SERIAL',
  endpoint: string,
  method: 'POST' | 'PATCH',
  payload: any,
) {
  const { queueGenericMutation } = await import('@core/lib/offline/syncEngine');
  await queueGenericMutation({ type, endpoint, method, payload });
}

export interface OfflineResult<T> {
  /** Server par ho gaya? `false` matlab queue me para hai */
  synced: boolean;
  data?: T;
}

export const offlineAppliancesApi = {
  /**
   * Installation book karna.
   * Offline ho to queue me — sale ke sath jo installation wada
   * kiya gaya wo zaya nahi hota.
   */
  async createInstallation(payload: any): Promise<OfflineResult<any>> {
    try {
      const data = await installationsApi.create(payload);
      return { synced: true, data };
    } catch (e) {
      if (!isNetFail(e)) throw e;
      await queue('CREATE_INSTALLATION', '/appliances/installations', 'POST', payload);
      return { synced: false };
    }
  },

  /** Service/repair request — offline me bhi darj ho jati hai */
  async createServiceRequest(payload: any): Promise<OfflineResult<any>> {
    try {
      const data = await serviceRequestsApi.create(payload);
      return { synced: true, data };
    } catch (e) {
      if (!isNetFail(e)) throw e;
      await queue('CREATE_SERVICE_REQUEST', '/appliances/service-requests', 'POST', payload);
      return { synced: false };
    }
  },

  /**
   * Serial ka record badalna (aksar bikne par SOLD karna).
   * Offline me queue — warna wo unit stock me para rehta hai
   * jabke bik chuka hota hai.
   */
  async updateSerial(id: string, payload: any): Promise<OfflineResult<any>> {
    try {
      const data = await applianceSerialApi.update(id, payload);
      return { synced: true, data };
    } catch (e) {
      if (!isNetFail(e)) throw e;
      await queue('UPDATE_APPLIANCE_SERIAL', `/appliances/serial-tracking/${id}`, 'PATCH', payload);
      return { synced: false };
    }
  },
};
