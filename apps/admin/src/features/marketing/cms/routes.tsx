/**
 * Website (CMS) routes under /marketing/website. Entries and the editor live
 * here (agent M1). The resource screens (overview, media, FAQs, menus,
 * redirects, settings, customers) belong to agent M2; they are found by file
 * name at build time, so this file compiles before and after they land.
 *
 * Expected M2 files (the first `*Page.tsx` in each folder is used; its
 * default export or first export ending in "Page" is rendered):
 *   dashboard/CmsDashboardPage.tsx   media/MediaLibraryPage.tsx   faqs/FaqsPage.tsx
 *   menus/MenusPage.tsx              redirects/RedirectsPage.tsx  settings/SettingsPage.tsx
 *   customers/CustomersPage.tsx
 * Each is mounted at `<folder>/*`, so it may use nested <Routes> for detail views.
 */
import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Construction, Loader2 } from 'lucide-react';
import { EntryListPage } from './entries/EntryListPage';
import { EntryEditorPage } from './editor/EntryEditorPage';

type PageModule = Record<string, unknown>;

const M2_PAGES = import.meta.glob<PageModule>([
  './dashboard/*Page.tsx',
  './media/*Page.tsx',
  './faqs/*Page.tsx',
  './menus/*Page.tsx',
  './redirects/*Page.tsx',
  './settings/*Page.tsx',
  './customers/*Page.tsx',
]);

const M2_FOLDERS = {
  dashboard: 'Website overview',
  media: 'Media library',
  faqs: 'FAQs',
  menus: 'Menus',
  redirects: 'Redirects',
  settings: 'Website settings',
  customers: 'Customers & testimonials',
} as const;
type M2Folder = keyof typeof M2_FOLDERS;

function pickComponent(mod: PageModule): ComponentType | null {
  if (typeof mod.default === 'function') return mod.default as ComponentType;
  const named = Object.entries(mod).find(([k, v]) => k.endsWith('Page') && typeof v === 'function');
  return named ? (named[1] as ComponentType) : null;
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
      <Construction className="mx-auto h-8 w-8 text-neutral-300" />
      <p className="mt-3 font-semibold text-neutral-800">{title}</p>
      <p className="mt-1 text-sm text-neutral-500">Ye screen abhi ban rahi hai.</p>
    </div>
  );
}

const lazyPages = new Map<M2Folder, ComponentType>();
function m2Page(folder: M2Folder): ComponentType {
  const cached = lazyPages.get(folder);
  if (cached) return cached;
  const key = Object.keys(M2_PAGES)
    .filter((k) => k.startsWith(`./${folder}/`))
    .sort()[0];
  const title = M2_FOLDERS[folder];
  const Comp: ComponentType = key
    ? lazy(async () => {
        const mod = await (M2_PAGES[key] as () => Promise<PageModule>)();
        const C = pickComponent(mod);
        return { default: C ?? (() => <Placeholder title={title} />) };
      })
    : () => <Placeholder title={title} />;
  lazyPages.set(folder, Comp);
  return Comp;
}

function M2Route({ folder }: { folder: M2Folder }) {
  const Page = m2Page(folder);
  return (
    <Suspense
      fallback={
        <div className="grid h-60 place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      }
    >
      <Page />
    </Suspense>
  );
}

/** Mounted in App.tsx as <Route path="website/*" element={<CmsRoutes />} />. */
export function CmsRoutes() {
  return (
    <Routes>
      <Route index element={<M2Route folder="dashboard" />} />
      <Route path="entries" element={<Navigate to="../pages" replace />} />
      <Route path="entries/:id" element={<EntryEditorPage />} />
      <Route path="media/*" element={<M2Route folder="media" />} />
      <Route path="faqs/*" element={<M2Route folder="faqs" />} />
      <Route path="menus/*" element={<M2Route folder="menus" />} />
      <Route path="redirects/*" element={<M2Route folder="redirects" />} />
      <Route path="settings/*" element={<M2Route folder="settings" />} />
      <Route path="customers/*" element={<M2Route folder="customers" />} />
      <Route path=":section" element={<EntryListPage />} />
    </Routes>
  );
}
