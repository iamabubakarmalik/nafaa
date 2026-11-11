# Nafaa admin panel

The internal panel for the Nafaa team: shops, billing, online store, marketing site, messages, mobile apps, system and staff.

```
pnpm --filter @nafaa/admin dev     # http://localhost:5174, API from VITE_API_URL (default http://localhost:4000/api)
pnpm --filter @nafaa/admin build
```

- `src/shell`: sidebar, workspaces, top bar, Ctrl+K search. The menu lives in `shell/navigation/nav-config.ts`.
- `src/features/<area>`: one folder per area (pages, components, lib).
- `src/ui`: the admin page kit (list state in the URL, list card, status badge, CSV export).
- `src/design`: the bridge to the shared design system in `apps/web/src/design-system` (see its README).
- `PAGES.md`: the standard every page follows.
- Access: every page and API route needs a permission. See `apps/api/src/admin/access/admin-permissions.ts`.
