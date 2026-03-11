# Log

## 2026-03-11 (Empty library state)

- Replaced "Chat coming soon." placeholder in `LibraryPage` with a proper `EmptyLibraryState` component
- `EmptyLibraryState` mirrors the `DashboardWelcome` empty-state pattern: icon, heading, description, use-case chips, and a primary CTA
- CTA opens `AddSourceDialog` directly from the main content area, giving users an obvious path to populate a new library
- Component lives in `src/features/sources/EmptyLibraryState.tsx`; library page remains a Server Component

## 2026-03-11 (Source display and metadata)

- Added `channel_name` and `title` nullable columns to the `sources` table; generated migration 0002
- On source creation, server fetches YouTube oEmbed metadata (`author_name` + `title`) with a 5 s timeout and graceful null fallback; no API key required
- Channel-type sources set `title` to null and use `channel_name` only; URL handle is used as fallback if oEmbed fails
- Sidebar sources list now shows "Channel Name - Video/Playlist Title" (or just "Channel Name" for channels, or the raw URL as a last resort)
- Each source item in the sidebar is now an external link (`target="_blank"`) to the original YouTube URL

## 2026-03-11 (YouTube Sources)

- Added sources and videos tables to the Drizzle schema with RLS policies and a migration
- Implemented YouTube URL parsing to classify video, playlist, and channel URLs
- Built API routes for managing sources per library
- Added `AddSourceDialog` and a live sources list in `AppSidebar`
- Extended the videos table with metadata fields (title, thumbnail, channel, duration, publish date) and ingestion counters for metering
- Added a GitHub Actions workflow that runs Drizzle migrations on every push to `main` using the `Production` environment

## 2026-03-11 (TanStack Query)

- Installed `@tanstack/react-query` and `@tanstack/react-query-devtools`
- Added `QueryClientProvider` in `src/lib/providers.tsx` using SSR-safe singleton pattern (new instance per server request, shared singleton on client)
- Wrapped root layout with `Providers`; `ReactQueryDevtools` included for development
- Created `src/features/libraries/api.ts` with typed fetch helpers for all library API endpoints
- Created `src/features/libraries/useLibraries.ts` wrapping `useQuery(['libraries'])` per conventions
- Replaced server-side library fetch in `(app)/layout.tsx` with `useLibraries()` in `AppSidebar` and `MobileTopNav`; both share the same cache entry automatically
- Replaced `fetch` + `useState` in `CreateLibraryForm`, `DeleteLibraryDialog`, `RenameLibraryDialog`, and `LoginForm` with `useMutation`; library mutations invalidate `['libraries']` on success
- Removed all `router.refresh()` calls from library CRUD flows - cache invalidation drives reactivity
- Simplified `DashboardPage` to a plain RSC; `DashboardWelcome` derives `hasLibraries` from `useLibraries()`

## 2026-03-11

- Migrated library API routes from direct Supabase JS queries to Drizzle ORM
- Created `src/server/libraries/queries.ts` as a typed data-access layer with `getUserLibraries`, `createLibrary`, `updateLibrary`, and `deleteLibrary`
- Each query enforces ownership via explicit `userId` checks; Supabase is retained for auth only
- Simplified `GET/POST /api/libraries` and `PATCH/DELETE /api/libraries/[libraryId]` route handlers to delegate all DB work to the query layer

## 2026-03-10

- Added `PATCH /api/libraries/[libraryId]` route handler for renaming a library, validated with `createLibrarySchema`
- Built `RenameLibraryDialog`: pre-filled dialog form using React Hook Form + Zod, calls PATCH on submit, refreshes router on success
- Added "Rename library" item to the library ··· dropdown in `AppSidebar`, with `Pencil` icon and separator above "Delete library"
- Added `Trash2` icon to "Delete library" dropdown item; both items use `cursor-pointer`
- Removed redundant `<header>` from `LibraryPage` — active library is highlighted in sidebar

## 2026-03-09 (UI Polish + App Shell)

- Installed shadcn sidebar, dialog, and dropdown-menu components via CLI
- Created `src/app/(app)/layout.tsx` as the shared authenticated app shell with `SidebarProvider`
- Built `AppSidebar` component: library list navigation, "+" to create, user email + sign out in footer
- Built `NewLibraryDialog`: wraps `CreateLibraryForm` in a Dialog, triggered from sidebar
- Built `DashboardWelcome`: replaces `LibrariesDashboard` on the main dashboard, shows empty state or "select a library" prompt
- Redesigned login page: removed Card wrapper, bare centered form (no bounding box)
- Redesigned landing page: removed eyebrow label, replaced 3-col feature grid with editorial text rows
- Redesigned `EmptyLibrariesState`: removed Card wrapper, centered with floating use-case pills
- Redesigned `LibraryList`: replaced Card grid with hover rows + kebab dropdown, delete off the main view
- Added `TooltipProvider` to root layout (required by shadcn sidebar)

## 2026-03-09

- Project documentation structure established
- Bootstrapped Next.js App Router project with Tailwind and shadcn/ui base setup
- Added Supabase magic-link authentication flow (login page, callback route, middleware protection)
- Added first core domain schema for libraries in Drizzle with generated-policy support for RLS
- Implemented server Route Handlers for listing, creating, and deleting libraries with Zod validation
- Added first product analytics hook by capturing `library_created` via PostHog server utility
- Aligned Supabase keys with current quickstart guidance using publishable key env naming
- Adopted PostHog Next.js best practices: client instrumentation setup and server event flush/shutdown behavior
- Standardized forms on React Hook Form plus Zod resolver and updated docs to reflect the form stack
- Removed base-ui generated UI primitives and setup-only packages to keep dependencies aligned with the documented stack
- Re-initialized shadcn with Radix base and re-generated UI primitives via CLI to avoid manual edits in `src/components/ui`
- Removed hardcoded PostHog host fallbacks and moved host configuration fully to environment variables

## 2026-03-09 (Analytics Hardening)

- Moved PostHog identify to `AppSidebar` so authenticated routes consistently bind events to the signed-in user
- Added `posthog.reset()` on sign out to avoid identity carry-over between users on shared devices
- Added safe error handling in server analytics capture and shutdown so product flows do not fail if PostHog is unavailable
