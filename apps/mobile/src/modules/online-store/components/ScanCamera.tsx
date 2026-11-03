/**
 * Moved to `@/core/hardware/scanner` (`<Scanner variant="inline" />`). This
 * name stays for files that still import it; new code uses Scanner.
 */

import { Scanner, type ScanFlash } from '@/core/hardware/scanner';

export type { ScanFlash };

export function ScanCamera({ onScan, ...rest }: { active: boolean; height?: number; flash?: ScanFlash; onScan: (code: string) => void }) {
  return <Scanner variant="inline" {...rest} onCode={onScan} />;
}
