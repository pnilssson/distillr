# Log

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
