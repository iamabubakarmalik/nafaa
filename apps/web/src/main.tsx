/**
 * Entry point. Loads the active language first, then the app (bootstrap.tsx),
 * so text translated at module level is already in the right language.
 */
import './index.css';
import { bootI18n } from '@core/i18n/boot';

bootI18n().then(() => import('./bootstrap'));
