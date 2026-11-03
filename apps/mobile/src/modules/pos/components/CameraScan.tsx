/**
 * Moved to `@/core/hardware/scanner` (`<Scanner />`). This name stays for the
 * industry packs that still import it; new code uses Scanner.
 */

import type { ReactNode } from 'react';
import { Scanner, type ScanResult } from '@/core/hardware/scanner';

export function CameraScan(props: { title: string; onCode: (code: string) => ScanResult; onClose: () => void; continuous?: boolean; footer?: ReactNode }) {
  return <Scanner {...props} />;
}
