/**
 * Public surface of the diagrams folder (F3). Blocks and templates import
 * from here only. The _dev gallery lives in ./gallery and is imported
 * directly by dev pages so it never reaches production bundles.
 */
export { Diagram, type DiagramProps } from './Diagram';
export { BESPOKE_DIAGRAMS, buildDiagram } from './registry';
