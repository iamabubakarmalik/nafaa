import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const src = path.resolve(__dirname, './src');
const web = path.resolve(__dirname, '../web/src');

/*
 * The partner portal uses the merchant app's design system directly
 * (apps/web/src/design-system), the same way apps/admin does. The few web
 * modules those files import are pointed at small bridges in src/design.
 * Order matters: specific entries come before the general '@' alias.
 * Keep in step with the "paths" in tsconfig.json.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\/design-system$/, replacement: `${src}/design/ds-entry.ts` },
      { find: /^@\/design-system\//, replacement: `${web}/design-system/` },
      { find: '@core/i18n', replacement: `${src}/design/i18n-bridge.ts` },
      { find: '@core/lib/cn', replacement: `${src}/lib/cn.ts` },
      { find: '@core/lib/shortcuts', replacement: `${web}/core/lib/shortcuts.ts` },
      { find: '@core/lib/dateRange', replacement: `${web}/core/lib/dateRange.ts` },
      { find: '@core/lib/business-day', replacement: `${web}/core/lib/business-day.ts` },
      { find: '@modules/organization/settings/api/settings.api', replacement: `${src}/design/settings-api-bridge.ts` },
      { find: '@', replacement: src },
    ],
    // Shared design-system files live under apps/web; make sure both apps' imports land on one copy.
    dedupe: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'zustand', 'lucide-react', 'clsx', 'tailwind-merge'],
  },
  server: {
    port: 5175,
    host: true,
  },
});
