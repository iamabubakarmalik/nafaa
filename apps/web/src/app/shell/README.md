# App shell

The frame around every signed-in page.

```
shell/
  AppShell.tsx           Grid layout: sidebar, top bar, scrolling content, settings frame
  useShellBoot.ts        Background services started once after sign-in
  useSidebarState.ts     Expanded / icon-rail state (auto below 1280px, Ctrl/⌘+B to override)
  navigation/
    nav-config.ts        Every menu group, item and settings page (single source)
    useVisibleNav.ts     Filters navigation by workspace, role and permissions
    useNavMemory.ts      Recent and pinned pages (per device)
  sidebar/
    Sidebar.tsx          Expanded sidebar; switches to SidebarRail when collapsed
    SidebarRail.tsx      72px icon rail with hover/tap flyouts
    MobileSidebar.tsx    Slide-in drawer below 1024px
    NavParts.tsx         Rows, group headers, footer links
    NavBadges.tsx        Counters and tags next to items
    BrandMark.tsx        Industry icon on the brand color
  topbar/
    Topbar.tsx           Bar layout and responsive label rules
    GlobalSearch, ShopSelector, SyncStatusIndicator, NotificationBell,
    QuickActionsDropdown, ProfileDropdown, WorkspaceSwitcher
  settings/
    SettingsShell.tsx    Full-screen settings frame
  ui/                    IconButton, Kbd, Panel, Avatar, useDismiss
```

Colors come from design tokens: `bg-shell-canvas`, `bg-shell-sidebar`,
`bg-shell-bar`, `border-shell-line` for surfaces and `brand-*` for accents
(see `src/design-system`). Adding a page to the menu means adding it to
`navigation/nav-config.ts` (core) or to the industry pack's `navGroups`.
