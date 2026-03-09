# Log

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
