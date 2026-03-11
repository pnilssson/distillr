# Design System

## Philosophy

Calm, focused, tool-like. The UI should feel like something built by people who care about craft - not an AI startup template. Take cues from Cursor (utilitarian precision), Claude.ai (generous whitespace, warmth), and Flatmate.se (editorial confidence, that specific green).

No gradients. No animated blobs. No hero illustrations. The product is the UI.

## Mode

**Light mode first.** Clean whites and warm neutrals as the base. Dark mode is a post-MVP addition.

---

## Color

Colors are defined via a custom theme built in tweakcn.com - the generated CSS variables live in `globals.css` - that file is the single source of truth. All components reference variables, never raw color values.

- **Background:** Warm off-white base, not pure `#ffffff`. Surfaces layer slightly to create depth without shadows.
- **Accent:** The Flatmate green - a muted, earthy sage/forest green. Not bright, not neon. Used for primary actions, active states, and focus rings only. Confirm exact hex by inspecting flatmate.se in browser DevTools before configuring tweakcn.
- **Text:** Near-black primary, medium-gray secondary for metadata and labels, light-gray tertiary for placeholders and disabled states.
- **Border:** Very subtle - just enough to define edges. One consistent border token used everywhere.
- **Destructive:** A desaturated, calm red. Used only for delete actions and error states.

**Principle:** The accent green should appear sparingly. If everything is green, nothing is. It earns attention on primary CTAs and active sidebar items only.

---

## Typography

**Font:** Geist (by Vercel) - loaded via `next/font/local`, zero external requests.

- Geist Sans for all UI text
- Geist Mono for timestamps, video IDs, and metadata that benefits from fixed-width rendering

**Scale (4 sizes max):**

- `text-sm` (13px) - labels, metadata, timestamps, helper text
- `text-base` (15px) - body text, chat messages, descriptions
- `text-lg` (18px) - video titles, section headings
- `text-2xl` (24px) - page headings, library names

**Weight:** Regular (400) for body, Medium (500) for emphasis, Semibold (600) for headings only. Keep it editorial, not loud.

**Line height:** Generous for body text (1.6), tighter for UI labels (1.3).

---

## Icons

**Lucide React** - already in the stack. Stroke-based, consistent 1.5px weight throughout.

Rules:

- Icons annotate, they do not decorate
- Sidebar nav items get icons. Action buttons get icons only when the label alone is ambiguous.
- Do not use filled/solid icon variants except for active/selected states
- Size: 16px for inline, 20px for standalone actions

---

## Layout

**Mobile-first. The app must work well on small screens.** This is a constraint from day one, not an afterthought.

**Desktop app shell:**

```
[Sidebar 240px fixed] | [Main content, full remaining width]
```

**Mobile app shell:** A minimal sticky top bar replaces the sidebar on mobile. The top bar shows a sidebar trigger (panel icon) on the left to open the sidebar as a slide-in sheet, and the active library name (or "Distillr" on the dashboard) as context. No bottom navigation bars. Main content takes full screen below the top bar.

**Sidebar contents (desktop, top to bottom):**

- Distillr wordmark
- Library list (scrollable, each item shows name + video count)
- "New Library" action
- Divider
- Account + plan indicator at the bottom

**No top navbar inside the app.** Navigation lives entirely in the sidebar (desktop) or bottom bar (mobile).

**Main content areas:**

- Library home: responsive video grid (2 col mobile, 3-4 col desktop) with status chips
- Chat: single-column message thread on mobile; optional collapsible source panel on desktop
- Settings: single column, max-width ~600px

---

## Accessibility

Follow WCAG 2.1 AA as the baseline. Key rules:

- Every form input must have an associated `<label>` (visible or visually hidden via `sr-only`). Never rely on placeholder text alone.
- Error messages must be linked to their input via `aria-describedby`.
- Interactive elements must have a visible focus ring (shadcn's `outline-ring/50` default covers this).
- Icon-only buttons must have `aria-label` or a visually hidden label.
- Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<header>`) over generic `<div>` for landmark regions.
- Radix UI primitives handle keyboard navigation and ARIA roles for complex widgets (dialogs, dropdowns) - use them, don't reinvent.

---

## Component Principles

- Use shadcn/ui primitives as the base - customize via CSS variables, not by forking components
- Consistent border-radius defined in the tweakcn theme and applied everywhere
- Loading states: skeleton screens preferred over spinners
- Empty states: one short sentence of copy + one action. Never just a blank area.
- Error states: calm and specific - say what failed and what to do next
- Toasts for background job completions (video ready, export done) - not blocking modals

---

## Landing Page

Different energy from the app - more editorial, more breathing room. Still light, still no decorative clutter.

- Hero: a single sharp sentence, not a feature list
- One primary CTA above the fold
- Show the actual app UI in context - no mockup-of-a-mockup
- No stock photography
