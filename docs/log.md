# Log

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
