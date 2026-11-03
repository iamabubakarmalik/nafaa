/** Delivery app endpoints under /api/distribution/delivery. The transport is the booker's (unwrapped data). */

import type { Http } from '../../booker/core/api';
import type { DeliverySyncResponse, RecoveryPayload, ReportPayload, Today } from './types';

const BASE = '/distribution/delivery';

export const deliveryApi = (http: Http) => ({
  today: () => http.get<Today>(`${BASE}/today`),
  sync: (body: { reports?: ReportPayload[]; recoveries?: RecoveryPayload[] }) => http.post<DeliverySyncResponse>(`${BASE}/sync`, body),
});
