/** Catalog setup calls: taxonomy (from the inventory api), combos, multi-units, labels, import, bulk edit, quick setup. */

import { uploadsApi } from '../../api/products';

export { taxonomyApi, type TaxonomyItem, type TaxonomyKind } from '../../api/taxonomy';
export const uploadsApiFor = () => uploadsApi;
