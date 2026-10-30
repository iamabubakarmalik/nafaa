/**
 * All roman catalog files merged into one module. The runtime imports this file
 * dynamically, so each locale becomes one chunk loaded only when it is used.
 * Catalog files are owned per area; see core/i18n/README.md.
 */
import { mergeCatalogs, type CatalogFile } from '../merge';

const files = import.meta.glob<CatalogFile>('./*.json', { eager: true, import: 'default' });

export default mergeCatalogs(files);
