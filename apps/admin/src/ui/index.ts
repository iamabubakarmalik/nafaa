/**
 * Admin page kit: pieces every admin list and detail page shares, on top of
 * the shared design system ('@/design-system/components'). See PAGES.md in
 * apps/admin for the page standard.
 */

export { useListParams, PAGE_SIZES } from './useListParams';
export { ListCard, Pagination } from './ListCard';
export { StatusBadge, statusLabel } from './StatusBadge';
export { DetailList } from './DetailList';
export { downloadCsv, toCsv, fetchAllPages, type CsvColumn } from './csv';
