/**
 * Call center: the confirmation call queue, call log, callbacks and agent
 * figures. Calls are dialled through tel: links; the outcome is logged here.
 */

import { apiClient } from '@core/api/client';
import { unwrap } from './online-orders.api';
import type { CustomerRisk } from './online-orders.api';

export type CallOutcome = 'CONFIRMED' | 'NO_ANSWER' | 'BUSY' | 'WRONG_NUMBER' | 'CALL_BACK' | 'CANCELLED';

export interface QueueOrder {
  id: string;
  no: string;
  customerName: string;
  customerPhone: string | null;
  customerCity: string | null;
  total: number;
  cod: boolean;
  receivedAt: string;
  channel: string | null;
  channelType: string | null;
  stage: string | null;
  assignedTo: { id: string; name: string } | null;
  risk: Pick<CustomerRisk, 'level' | 'label' | 'reason'> | null;
  attempts: number;
  score: number | null;
  lastCall: { outcome: CallOutcome; at: string; by: string | null; note: string | null } | null;
  callBackAt: string | null;
}

export interface CallQueue {
  items: QueueOrder[];
  later: QueueOrder[];
  stats: { waiting: number; later: number; risky: number; callsToday: number; confirmedToday: number; noAnswerToday: number };
}

export interface CallRow {
  id: string;
  outcome: CallOutcome;
  note: string | null;
  at: string;
  callBackAt: string | null;
  followUpDoneAt: string | null;
  customerName: string | null;
  customerPhone: string | null;
  agent: { id: string; name: string } | null;
  order: { id: string; no: string; status: string; total: number } | null;
}

export interface AgentRow {
  agentId: string | null;
  name: string | null;
  calls: number;
  orders: number;
  confirmed: number;
  cancelled: number;
  noAnswer: number;
  callBack: number;
  wrongNumber: number;
  confirmRate: number;
  reachRate: number;
}

export const callCenterApi = {
  queue: async (mine: boolean) => unwrap<CallQueue>(await apiClient.get('/online-orders/calls/queue', { params: { mine: mine ? '1' : undefined } })),
  followUps: async (mine: boolean) => unwrap<{ items: CallRow[]; stats: { open: number; due: number } }>(await apiClient.get('/online-orders/calls/follow-ups', { params: { mine: mine ? '1' : undefined } })),
  log: async (q: { orderId?: string; phone?: string; from?: string; to?: string; outcome?: string }) => unwrap<CallRow[]>(await apiClient.get('/online-orders/calls', { params: q })),
  performance: async (q: { from?: string; to?: string }) => unwrap<{ totals: Omit<AgentRow, 'name' | 'agentId'>; agents: AgentRow[] }>(await apiClient.get('/online-orders/calls/performance', { params: q })),
  record: async (body: { orderId?: string; phone?: string; name?: string; outcome: CallOutcome; note?: string; callBackAt?: string | null }) =>
    unwrap<CallRow & { applied: string | null }>(await apiClient.post('/online-orders/calls', body)),
  done: async (id: string, undo = false) => unwrap(await apiClient.post(`/online-orders/calls/${id}/done`, { undo })),
};
