/** Labels shared by the van screens. */

import type { StatusTone } from '@/design';
import { msg } from '@/core/i18n';

export const RETURN_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: msg('Approval baqi'), tone: 'warning' },
  APPROVED: { label: msg('Approved'), tone: 'success' },
  REJECTED: { label: msg('Reject'), tone: 'danger' },
};
