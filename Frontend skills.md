# Frontend Build Guide (Vite + React)

You are building production-quality frontend UI with Vite and React. Examples use TypeScript. If the project is JavaScript, use the same patterns and drop the type annotations (use `.jsx` and PropTypes only if the project already does).

Before writing code, read this whole file. When the user's brief conflicts with anything here, the brief wins.

---

## 0. Operating rules

1. **Never start coding from a one-line brief.** First state, in a few lines: the subject, the audience, and the primary job of the page or app. If any of those is unclear and can't be inferred from the repo, ask one question.
2. **Plan, review, then build.** Write a design plan (section 2), challenge it against the brief, revise, then write code.
3. **Match the existing project.** If the repo already has a design system, tokens, folder structure, or conventions, follow them. Do not introduce a second system.
4. **Don't add dependencies casually.** Check `package.json` first. Prefer the platform (CSS, native elements, the Intl API) over a library. If a new dependency is justified, say why in one sentence.
5. **Finish what you start.** No `TODO` placeholders, no lorem ipsum, no dead buttons, no half-wired state. If something is out of scope, say so explicitly.
6. **Run it.** After changes, run the type check, linter, and build (`npm run build`). Fix what breaks. Do not report done on code you haven't compiled.

---

## 1. Stack and project structure

- **Vite + React 18/19**, function components and hooks only. No class components.
- **TypeScript** by default with `strict: true`. No `any` without a comment explaining why.
- **Routing:** React Router if the app has more than one view. Otherwise none.
- **Styling:** CSS custom properties for tokens + CSS Modules (`Component.module.css`) for component styles. If the project already uses Tailwind, use it and map tokens into the Tailwind theme instead of hardcoding values.
- **Icons:** one icon set per project (e.g. `lucide-react`). Never mix sets. Never use emoji as UI icons.
- **Imports:** use the `@/` alias for `src/`.

```
src/
  main.tsx
  App.tsx
  styles/
    tokens.css        # all design tokens live here, and only here
    base.css          # reset, element defaults, focus styles, font-face
  components/
    ui/               # generic: Button, Input, Dialog, Tabs (no business logic)
    <Feature>/        # feature-specific components, colocated with their CSS
  pages/              # route-level components
  hooks/
  lib/                # pure helpers, API clients, formatters
  assets/
```

Rules:
- One component per file. File name = component name (`PricingTable.tsx`).
- Colocate styles, tests, and small sub-components with the component that owns them.
- Pages compose components. Components don't know which page they're on.
- Keep components under about 150 lines. Past that, split by responsibility, not by line count.

---

## 2. Design process (do this before any code)

### 2.1 Ground the design in the subject

Design from the real subject matter: its industry, materials, vocabulary, and audience. A dashboard for financial analysts and a landing page for a children's toy should look nothing alike. Use real content throughout. If there is no content, write believable copy for this specific subject, not generic filler.

### 2.2 Write a compact design plan

Produce this before building:

- **Color:** 4 to 6 named hex values (background, surface, text, muted text, primary accent, and optionally one secondary or state color).
- **Type:** one or two families, with a role for each. If two, make them clearly different.
- **Layout:** one sentence describing the concept, plus an ASCII wireframe for the main screen. State the alignment (left, centered, justified) and why.
- **Principles:** two or three sentences on what makes this design specific to this brief.

### 2.3 Review the plan against the brief

Ask: if I gave this prompt to myself ten times, would I land on this same palette, type pairing, and layout every time? If yes, it's a default, not a choice. Revise the weakest part and say what you changed and why. Only then write code.

### 2.4 Spend boldness in one place

Pick one memorable element (the hero, one interaction, one typographic treatment) and make everything around it quiet and disciplined. Before finishing, remove one decorative thing.

---

## 3. Avoid the generic AI look

These are defaults, not decisions. Use them only if the brief explicitly asks.

**Palettes**
- Warm cream background (~`#F4F1EA`) with a serif display face and a terracotta accent (~`#D97757`).
- Near-black background with a single acid-green or vermilion accent.
- Purple-to-blue gradient washes as decoration.

**Layout**
- Content chopped into identical rounded cards with the same soft grey shadow.
- One border-radius on every element regardless of hierarchy.
- Broadsheet layouts with hairline rules and zero radius, applied to subjects that have nothing to do with print.
- The hero pattern of big number, small label, supporting stats, gradient accent.

**Typography and chrome**
- Tracked-out ALL-CAPS eyebrow label above every heading.
- One word in a headline set in italic, bold, or a different color.
- Meta strings joined with middle dots (`A · B · C`).
- Labels written as `WORD — fragment`.
- Monospace for small data labels with no data reason.
- `→` appended to every link and button.
- Numbered markers (`01 / 02 / 03`) on content that isn't actually a sequence.
- Tinted near-black (`#0B0B0B`, `#111`) used as a stand-in for a real color decision.

**Motion**
- Fade-and-slide-up on every section.
- Hover lift on every card.

---

## 4. Design tokens

All visual values come from `src/styles/tokens.css`. Components never contain raw hex values, raw pixel font sizes, or one-off spacing numbers.

```css
:root {
  /* Color: replace with the palette from your design plan */
  --color-bg: #ffffff;
  --color-surface: #f6f6f4;
  --color-text: #161616;
  --color-text-muted: #5b5b5b;
  --color-accent: #0a5cff;
  --color-accent-contrast: #ffffff;
  --color-border: #dcdcd8;
  --color-danger: #b42318;

  /* Type */
  --font-display: "Your Display Face", Georgia, serif;
  --font-body: "Your Body Face", system-ui, sans-serif;

  /* Type scale (ratio ~1.25) */
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.563rem;
  --text-2xl: 1.953rem;
  --text-3xl: 2.441rem;
  --text-4xl: clamp(2.5rem, 5vw + 1rem, 4.5rem);

  /* Spacing (4px base) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;

  /* Shape and depth: vary these by element role, not one value for all */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --shadow-raised: 0 1px 2px rgb(0 0 0 / 0.08);
  --shadow-overlay: 0 12px 32px rgb(0 0 0 / 0.18);

  /* Motion */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --ease-out: cubic-bezier(0.2, 0.7, 0.2, 1);
}

/* If the design supports dark mode, redefine the same tokens here */
@media (prefers-color-scheme: dark) {
  :root { /* ... */ }
}
```

Rules:
- Add a token before adding a one-off value. Don't skip this step "just this once".
- Name tokens by role (`--color-text-muted`), not appearance (`--color-grey-500`).
- Text/background pairs must meet WCAG AA contrast (4.5:1 body, 3:1 large text and UI boundaries). Check them.

---

## 5. Typography

- Pick typefaces for this brief, not the ones you'd reach for on any project. Avoid defaulting to Inter, Roboto, Poppins, or Playfair Display unless the brief calls for them.
- Load fonts with `@font-face` and `font-display: swap`, or self-host via `@fontsource/*`. Always specify a real fallback stack.
- One family or two. Don't use a different face for every role.
- Use the scale in section 4. No arbitrary font sizes.
- Body line length under about 80 characters (`max-width: 65ch` is a good default). Serif body text gets slightly more line-height than sans.
- Body line-height 1.5 to 1.65. Headings 1.1 to 1.3.
- Headlines are design elements. Treat their size, weight, width, and spacing as part of the layout, not a neutral wrapper for text.
- Use sentence case for UI text.

---

## 6. Layout and responsiveness

- **Mobile-first.** Write base styles for small screens, then add `min-width` media queries.
- Use CSS Grid for page-level layout and Flexbox for one-dimensional alignment. Don't use absolute positioning for layout.
- Use `gap` instead of margins between siblings.
- Content width: constrain with `max-width` and `padding-inline`, not fixed widths.
- Use `rem`, `%`, `fr`, `ch`, and `clamp()`. Avoid fixed `px` widths on containers.
- Tables, code blocks, and wide media scroll inside their own container. The page body never scrolls sideways.
- Test at 360px, 768px, and 1280px wide. Nothing overlaps, truncates unintentionally, or becomes untappable.
- Touch targets are at least 44×44px.
- Use `100dvh`, not `100vh`, for full-height sections on mobile.

**CSS specificity discipline:** use single-class selectors (`.title`, `.cta`) in CSS Modules. Don't mix element selectors and class selectors that fight over the same property (this commonly breaks section padding and margins). Never use `!important` to fix a conflict; fix the selector.

---

## 7. React patterns

### Components

```tsx
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[styles.button, styles[variant], styles[size], className]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
```

- Props are typed, have sensible defaults, and spread remaining native props onto the root element.
- Use named exports for components.
- Prefer composition (`children`, slots) over long prop lists and boolean flags.
- Derive values during render. Don't copy props into state.
- `useEffect` is for synchronizing with external systems, not for computing values or responding to events. If you can do it in an event handler or during render, do.
- Don't use array index as `key` for lists that can reorder or change.
- Memoize (`useMemo`, `useCallback`, `memo`) only when you've identified a real problem. Not by default.

### State

- Start with local `useState`/`useReducer`. Lift state only when two components need it.
- Use Context for low-frequency global values (theme, auth, locale). Not as a general store.
- Server data: use TanStack Query (or the project's existing solution) rather than hand-rolled `useEffect` + `fetch` + loading flags.
- Forms: controlled inputs for small forms. React Hook Form for large ones. Validate on blur and on submit, not on every keystroke.

### Every data-driven view has four states

Build all four, every time: **loading**, **empty**, **error**, **success**. A view with only the success state is unfinished.

### Code splitting

Lazy-load route-level pages with `React.lazy` and `Suspense`. Provide a meaningful fallback.

---

## 8. Accessibility (non-negotiable quality floor)

- Use semantic elements: `<button>` for actions, `<a>` for navigation, `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>` with a heading. Never `<div onClick>`.
- One `<h1>` per page. Headings descend in order, without skipping levels for styling reasons (style with classes).
- Every input has a visible `<label>`. Placeholders are not labels.
- Every meaningful image has descriptive `alt`. Decorative images have `alt=""`.
- Icon-only buttons have `aria-label`.
- Keyboard: every interactive element is reachable and operable with Tab, Enter, Space, Escape as appropriate. Visible focus styles using `:focus-visible`. Never `outline: none` without a replacement.
- Modals and menus: trap focus, close on Escape, restore focus on close. Use the native `<dialog>` element or a vetted primitive (Radix UI, React Aria) instead of hand-rolling.
- Respect reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- Don't convey meaning by color alone. Pair color with text or an icon.
- Announce async changes (form errors, toasts) with `aria-live` regions.

---

## 9. Motion

- Default to no ambient motion. Use it only to direct attention or to show what changed.
- Motion that responds to a user action (opening, expanding, confirming, reordering) is welcome and should be quick (120 to 250ms).
- At most one orchestrated page-load moment per page.
- Animate `transform` and `opacity`. Avoid animating `width`, `height`, `top`, or `left`.
- For complex choreography or layout animation, use `motion` (Framer Motion) if already installed. Don't add it for a hover effect.

---

## 10. Performance

- Images: set `width` and `height` (prevents layout shift), use `loading="lazy"` below the fold, and prefer `.webp` or `.avif`. Use SVG for icons and logos.
- Import only what you use (`import { Search } from "lucide-react"`, not the whole package).
- Don't ship large libraries for small jobs (no moment.js, no lodash for one function).
- Check the Vite build output. Flag any chunk over about 500 kB.
- Avoid layout thrash: no reading and writing layout properties in a loop.

---

## 11. Copy and microcopy

Words are design content. They exist to make the interface easier to understand and use.

- Write from the user's perspective in plain language. Say "Notifications," not "Webhook config."
- Use active voice and sentence case.
- Buttons say what will happen: "Save changes," not "Submit." The same action keeps the same name throughout the flow (a "Publish" button leads to a "Published" confirmation).
- Errors explain what went wrong and how to fix it. They don't apologize and they aren't vague.
- Empty states invite an action ("No invoices yet. Create your first invoice.").
- No filler ("Welcome to our amazing platform"), no cleverness that costs clarity.
- Each text element does one job.

---

## 12. Definition of done

Before saying a task is complete, confirm each of these:

- [ ] Matches the brief and the approved design plan
- [ ] Uses tokens only. No stray hex values, font sizes, or magic spacing numbers
- [ ] Works at 360px, 768px, and 1280px
- [ ] Keyboard navigable with visible focus; semantic HTML; labels and alt text present
- [ ] Reduced motion respected
- [ ] Loading, empty, error, and success states exist for all data-driven views
- [ ] No console errors or warnings
- [ ] Type check, lint, and `npm run build` all pass
- [ ] No lorem ipsum, TODOs, or dead interactions
- [ ] You removed at least one unnecessary decorative element

In your final message, state what you built, the design choices you made and why, and anything you deliberately left out. Keep it short.

---

## 13. When you're unsure

- Missing requirement that changes the outcome: ask one specific question.
- Missing requirement that doesn't: make a reasonable assumption, state it in one line, and keep going.
- Conflict between this guide and the existing codebase: follow the codebase, and mention the conflict.
