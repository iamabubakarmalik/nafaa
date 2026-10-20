/**
 * Diagram registry: maps every DiagramSpec kind to its builder.
 *
 * Bespoke kinds are code (one file each in ./bespoke). Adding one means a new
 * file here, a new BESPOKE_DIAGRAM_KINDS value and label keys in the contract
 * (ARCH 4.5). Data-driven kinds (flow, hub, timeline) need no code to reuse.
 */
import type { BespokeDiagramKind, DiagramSpec } from '../../lib/cms/contract/cms-contract';
import { isBespokeDiagramKind } from '../../lib/cms/contract/cms-contract';
import { apiWebhooks } from './bespoke/api-webhooks';
import { fbrInvoice } from './bespoke/fbr-invoice';
import { khataCycle } from './bespoke/khata-cycle';
import { multiBranch } from './bespoke/multi-branch';
import { offlineSync } from './bespoke/offline-sync';
import { orderToCash } from './bespoke/order-to-cash';
import { serviceProcess } from './bespoke/service-process';
import { resolveLabels, type BespokeDiagram } from './bespoke/shared';
import { storeSync } from './bespoke/store-sync';
import { buildFlow } from './data/flow';
import { buildHub } from './data/hub';
import { buildTimeline } from './data/timeline';
import type { BuiltDiagram } from './lib/types';

export const BESPOKE_DIAGRAMS: Record<BespokeDiagramKind, BespokeDiagram> = {
  'offline-sync': offlineSync,
  'fbr-invoice': fbrInvoice,
  'khata-cycle': khataCycle,
  'multi-branch': multiBranch,
  'order-to-cash': orderToCash,
  'store-sync': storeSync,
  'api-webhooks': apiWebhooks,
  'service-process': serviceProcess,
};

export interface BuiltWithClass extends BuiltDiagram {
  rootClass?: string;
}

/** Builds both orientations of a diagram from its (published) spec. */
export function buildDiagram(spec: DiagramSpec): BuiltWithClass {
  if (isBespokeDiagramKind(spec.kind)) {
    const kind = spec.kind;
    const def = BESPOKE_DIAGRAMS[kind];
    const labels = resolveLabels(kind, 'labels' in spec ? spec.labels : undefined);
    return {
      h: def.build(labels, 'h'),
      v: def.build(labels, 'v'),
      summary: def.summary(labels),
      interactive: false,
      rootClass: def.rootClass,
    };
  }
  switch (spec.kind) {
    case 'flow':
      return buildFlow(spec);
    case 'hub':
      return buildHub(spec);
    case 'timeline':
      return buildTimeline(spec);
    default:
      throw new Error(`Unknown diagram kind "${(spec as { kind: string }).kind}"`);
  }
}
