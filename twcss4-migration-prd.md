# PRD: Ghost Admin — Tailwind CSS 3 → 4 Migration

**Status:** Draft
**Last updated:** 2026-02-28
**Owner:** Design Engineering

---

## 1. Overview

This document defines the requirements, scope, constraints, and phased execution plan for upgrading Ghost Admin's Tailwind CSS from version 3 to version 4. The migration covers the Shade design system, all React applications consuming Shade (posts, stats, activitypub), and the integration boundary with the Ember.js admin shell.

The old design system (`admin-x-design-system`) and `admin-x-settings` are **explicitly excluded** from this migration. They will remain on Tailwind CSS 3 and will be retired when Settings is rebuilt on Shade in a separate project.

### 1.1 Goals

- Upgrade all Shade-based packages to Tailwind CSS 4 with zero visual regressions.
- Ensure the Ember.js admin shell (which does not use Tailwind) is completely unaffected.
- Ensure `admin-x-settings` and `admin-x-design-system` continue to function on Tailwind CSS 3 without interference.
- Modernize the build pipeline by replacing PostCSS-based Tailwind with the native Vite plugin.
- Establish visual regression testing infrastructure that outlives this migration.

### 1.2 Non-goals

- Migrating `admin-x-design-system` or `admin-x-settings` to Tailwind CSS 4.
- Redesigning or refactoring any UI components (this is a like-for-like upgrade).
- Migrating standalone apps (Portal, Comments UI, Signup Form, Sodo Search, Announcement Bar).
- Upgrading the Ember admin shell's CSS architecture.
- Adopting new Tailwind v4 features (OKLCH colors, 3D transforms, etc.) — those are follow-up work.

---

## 2. Background and motivation

### 2.1 Why upgrade

Tailwind CSS 4 is a ground-up Rust-powered rewrite that delivers 3.8× faster full builds and 182× faster incremental rebuilds. It replaces the JavaScript configuration system with CSS-first `@theme` directives, eliminates the need for PostCSS, and is now the actively maintained version. Tailwind CSS 3 will stop receiving updates.

### 2.2 Why now

- shadcn/ui (the foundation of Shade) already has full Tailwind v4 support and its CLI generates v4-compatible code.
- The `tailwind-merge` library (used in every Shade component) has released v3.0 which supports Tailwind v4 but drops v3 support, creating an inevitable fork point.
- The longer the codebase stays on v3, the more new code is written that will need migration later.

---

## 3. Architecture context

### 3.1 Monorepo structure

Ghost is a Yarn v1 + Nx monorepo. All Tailwind usage lives in the `apps/` directory. The Ember admin shell (`ghost/admin`) does NOT use Tailwind.

### 3.2 Packages in scope

| Package | Path | Role | Design system |
|---|---|---|---|
| **Shade** | `apps/shade` | New design system (shadcn/ui-based) | IS the design system |
| **Posts** | `apps/posts` | Post analytics React app | Consumes Shade |
| **Stats** | `apps/stats` | Statistics React app | Consumes Shade |
| **ActivityPub** | `apps/admin-x-activitypub` | ActivityPub React app | Consumes Shade |

### 3.3 Packages explicitly OUT of scope

| Package | Path | Reason |
|---|---|---|
| `admin-x-design-system` | `apps/admin-x-design-system` | Legacy; will be retired when Settings migrates to Shade |
| `admin-x-settings` | `apps/admin-x-settings` | Depends on old design system; stays on Tailwind v3 |
| `admin-x-framework` | `apps/admin-x-framework` | Shared hooks for old design system apps |
| Portal, Comments UI, Signup Form, Sodo Search, Announcement Bar | Various | Standalone apps outside admin scope |

### 3.4 Ember-React integration model

React apps are mounted **directly into the Ember DOM** — there is no iframe boundary or Shadow DOM isolation for admin-x apps. This means:

- Tailwind's preflight/base styles from React app CSS bundles apply globally to the document.
- Changes to Tailwind's CSS reset (border colors, placeholder opacity, button cursors) will affect elements outside the React apps.
- Multiple Tailwind CSS bundles coexist in the same document (one per React app).
- Dark mode is class-based: the Ember shell toggles `.dark` on the root element; React apps read this class.

The Koenig Lexical editor (also uses Tailwind) scopes all styles under a `.koenig-lexical` class, providing some isolation. Verify it is unaffected.

Some views (e.g., Explore) use **iframes** with `postMessage` — these have full CSS isolation and are low-risk.

### 3.5 Build system

Each React app is built independently by Vite. Built assets (JS/CSS bundles) are served to the Ember shell via `ghost/admin/lib/asset-delivery/index.js`, an Ember CLI addon. There is no shared Tailwind build — each app compiles its own CSS.

---

## 4. Tailwind CSS 4 breaking changes relevant to Ghost

This section catalogs every breaking change an agent must account for. Use this as a checklist during implementation.

### 4.1 Configuration system

| What changed | v3 | v4 | Action required |
|---|---|---|---|
| Config file | `tailwind.config.cjs` (auto-detected) | CSS `@theme` directive | Convert each config to CSS-first, or use `@config` escape hatch |
| Theme values | JS objects in `theme.extend` | `@theme { }` block in CSS (values become CSS custom properties) | Migrate all theme extensions |
| Content detection | `content: [...]` array in JS config | Automatic detection + `@source` directives | Add `@source` for Shade's files in consuming apps |
| Dark mode | `darkMode: ["class"]` in JS config | `@custom-variant dark (&:where(.dark, .dark *));` in CSS | Convert in every app |
| `corePlugins` option | Supported | Removed | Remove any usage |
| `safelist` option | Supported | Replaced by `@source inline("...")` | Convert if used |
| `separator` option | Supported | Removed | Remove if used |

### 4.2 Utility class renames

These are scale shifts where the "bare" utility moved down one step. Every instance must be renamed across all TSX/JSX/CSS files.

| v3 class | v4 replacement | Notes |
|---|---|---|
| `shadow-sm` | `shadow-xs` | |
| `shadow` (bare) | `shadow-sm` | |
| `shadow-md` | `shadow-sm` ... (check full mapping) | Verify each shadow level |
| `rounded-sm` | `rounded-xs` | |
| `rounded` (bare) | `rounded-sm` | |
| `blur-sm` | `blur-xs` | |
| `blur` (bare) | `blur-sm` | |
| `ring` (bare) | `ring-3` | Default ring width dropped from 3px to 1px |
| `outline-none` | `outline-hidden` | Used on every focusable element |
| `bg-gradient-to-*` | `bg-linear-to-*` | Any gradient usage |

### 4.3 Syntax changes

| What changed | v3 syntax | v4 syntax |
|---|---|---|
| Important modifier | `!flex` (prefix) | `flex!` (suffix) |
| CSS variable shorthand | `bg-[--color]` | `bg-(--color)` |
| Variant stacking | Right-to-left | Left-to-right |
| `@apply` with `!important` | `@apply !flex` | `@apply flex!` |

### 4.4 Preflight and default value changes

These are the highest-risk changes because they cause subtle visual regressions that are hard to detect without visual testing.

| Default | v3 value | v4 value | Impact |
|---|---|---|---|
| Border color | `gray-200` | `currentColor` | **HIGH** — every unstyled border shifts color. Will affect Ember shell elements too. |
| Placeholder text color | `gray-400` | Current text color at 50% opacity | Medium — form inputs may look different |
| Button cursor | `pointer` | `default` | Medium — all buttons lose pointer cursor |
| Ring color | `blue-500` | `currentColor` | Low — most components override ring color |
| `hover:` variant | Always fires | Only on hover-capable devices (`@media (hover: hover)`) | Low — primarily affects touch device behavior |
| `space-x/y-*` selector | `:not([hidden]) ~ :not([hidden])` | `:not(:last-child)` | Low — but verify layouts using space utilities |

**Required compatibility CSS** — add this to each app's CSS entry point to preserve v3 behavior:

```css
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop,
  ::file-selector-button {
    border-color: var(--color-gray-200, currentColor);
  }

  button {
    cursor: pointer;
  }
}
```

### 4.5 Plugin changes

| Plugin | v3 usage | v4 action | Priority |
|---|---|---|---|
| `tailwindcss-animate` | `plugins: [require('tailwindcss-animate')]` | **Replace** with `tw-animate-css` (pure CSS drop-in). Add `@import "tw-animate-css"` to CSS. | **CRITICAL** — shadcn/ui animations break without this |
| `@tailwindcss/forms` | Plugin in config | Load via `@plugin "@tailwindcss/forms"`, or remove entirely (shadcn/ui self-styles form elements via Radix primitives) | Medium |
| `@tailwindcss/line-clamp` | Plugin in config | **Remove** — line-clamp is in Tailwind core since v3.3 | Low |

### 4.6 PostCSS and Vite integration

| What changed | v3 | v4 |
|---|---|---|
| Tailwind as PostCSS plugin | `tailwindcss` in `postcss.config.cjs` | No longer a PostCSS plugin |
| Vite integration | PostCSS pipeline | `@tailwindcss/vite` plugin in `vite.config.ts` |
| Autoprefixer | Required as PostCSS plugin | Built-in, remove `autoprefixer` |
| `postcss-import` | Required for `@import` | Built-in, remove `postcss-import` |

**After migration, each app's Vite config should look like:**

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

**Delete from each app:** `postcss.config.cjs`, `tailwind.config.cjs` (once fully migrated to CSS-first config).

### 4.7 CSS variable pattern changes (shadcn/ui specific)

Shade uses the standard shadcn/ui pattern of HSL CSS variables. The v4 migration requires:

1. Move `:root` / `.dark` CSS variable declarations **out of** `@layer base`.
2. Wrap HSL values with the `hsl()` function: `--background: 0 0% 100%` becomes `--background: hsl(0 0% 100%)`.
3. Add an `@theme inline` block that maps CSS variables to Tailwind color token names so utilities like `bg-background` continue to work:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... all shadcn/ui color tokens ... */
  --radius-sm: var(--radius);
  --radius-md: calc(var(--radius) + 2px);
  --radius-lg: calc(var(--radius) + 4px);
}
```

4. Remove `hsl()` wrappers from chart color configs if present (CSS vars now include the function).

### 4.8 Dependency version requirements

| Dependency | Current (approx.) | Required for v4 | Notes |
|---|---|---|---|
| `tailwindcss` | ~3.4.14 | 4.x | Core upgrade |
| `tailwind-merge` | ^2.5.5 | **^3.0.0** | v3 adds v4 support, drops v3 support. Upgrade atomically. |
| `class-variance-authority` | ^0.7.1 | ^0.7.1 (no change) | Framework-agnostic, works with v4. Update class names in variant definitions. |
| `clsx` | 2.1.1 | 2.1.1 (no change) | No Tailwind dependency. |
| `@tailwindcss/vite` | N/A | Install new | Vite plugin replaces PostCSS integration |
| `tw-animate-css` | N/A | Install new | Replaces `tailwindcss-animate` |
| Node.js | Verify | **20+** | Required by `@tailwindcss/upgrade` tool and v4 itself |

---

## 5. The official upgrade tool

The `@tailwindcss/upgrade` CLI automates roughly 90% of mechanical changes.

**Run command:** `npx @tailwindcss/upgrade`  (requires Node.js 20+)

### 5.1 What it handles automatically

- Package version updates in `package.json`
- `@tailwind base/components/utilities` → `@import "tailwindcss"` conversion
- `tailwind.config.js` → `@theme` CSS extraction
- Utility class renames across HTML/JSX/TSX files
- PostCSS config updates
- Important modifier syntax (`!flex` → `flex!`)
- Arbitrary value simplification
- Prefix migration

### 5.2 What it does NOT handle (manual work required)

1. `tailwindcss-animate` → `tw-animate-css` plugin swap
2. shadcn/ui CSS variable format changes (HSL wrappers, `@theme inline` block)
3. Monorepo cross-package content detection (`@source` directives for Shade's files)
4. `darkMode: ["class"]` → `@custom-variant dark` conversion
5. Dynamic class construction (template literals building class names at runtime)
6. Multiple Tailwind instances awareness (doesn't understand cross-package dependencies)

### 5.3 Known gotchas

- The tool can over-aggressively rename things (e.g., renaming a Stimulus `blur->` action to `blur-sm->`). Review every diff line.
- In monorepos, running from a sub-package may fail with "Path is not in cwd" errors. Run from the monorepo root or process each package individually.
- Always run in a dedicated branch.

---

## 6. Execution plan

### Phase 0: Preparation

**Duration:** 1–2 days
**Objective:** Set up infrastructure and establish visual baselines before any Tailwind code changes.

#### Tasks

1. **Create branch:** Create a `tailwind-v4-migration` long-lived feature branch from `main`.

2. **Visual regression tooling — Chromatic/Storybook:**
   - Set up Chromatic (or Loki as a free alternative) for Shade's Storybook.
   - Run a full baseline capture on `main` (Tailwind v3 state).
   - This will be the golden reference for component-level comparisons.

3. **Visual regression tooling — Percy + Playwright:**
   - Add `percySnapshot()` calls to 10–15 critical Playwright E2E flows covering:
     - The main admin dashboard
     - Post editor (Koenig Lexical integration boundary)
     - Post analytics (apps/posts)
     - Stats dashboard (apps/stats)
     - ActivityPub views
     - Settings panels (to verify they're unbroken on v3)
   - Run baseline capture on `main`.

4. **Visual regression tooling — BackstopJS:**
   - Configure BackstopJS for full-admin A/B comparison (reference URL = v3 dev server, test URL = v4 dev server).
   - Capture reference screenshots at desktop, tablet, and mobile viewports.
   - Cover all admin routes that load React content.

5. **Codebase audit:**
   - Search for all `@apply` usage across the monorepo (`grep -r "@apply" apps/shade apps/posts apps/stats apps/admin-x-activitypub`).
   - Search for dynamic class construction patterns (`grep -rn "template literal with Tailwind classes"`).
   - Search for CSS variable shorthand syntax (`grep -rn "\[--" apps/`).
   - Document findings in a migration checklist.

6. **Environment verification:**
   - Confirm Node.js 20+ is available in CI and local dev environments.
   - Verify browser support requirements: Safari 16.4+, Chrome 111+, Firefox 128+ are compatible with Ghost's user analytics.

7. **Document expected visual changes:**
   - Border color shifts (gray-200 → currentColor without compat CSS)
   - Button cursor changes
   - Placeholder text opacity changes
   - Create a checklist of intentional changes vs. regressions.

#### Exit criteria

- All visual baseline captures complete and stored.
- Codebase audit documented.
- Node.js 20+ confirmed in all environments.
- Feature branch created and CI passing.

---

### Phase 1: Shade design system

**Duration:** 2–3 days
**Objective:** Migrate the Shade design system — the foundation all other apps depend on — to Tailwind CSS 4. No consuming app is touched yet.

#### Tasks

1. **Run the upgrade tool:**
   ```bash
   cd apps/shade
   npx @tailwindcss/upgrade
   ```
   Review every line of the diff. Revert any incorrect renames.

2. **Replace `tailwindcss-animate`:**
   - Uninstall: `yarn remove tailwindcss-animate`
   - Install: `yarn add tw-animate-css`
   - In the CSS entry point, add: `@import "tw-animate-css";`
   - Verify all dialog, tooltip, dropdown, popover animations work.

3. **Remove deprecated plugins:**
   - Remove `@tailwindcss/line-clamp` from dependencies and config (in core since v3.3).
   - Evaluate `@tailwindcss/forms` — likely removable since Shade's form components are styled via Radix UI primitives. If still needed, convert to `@plugin "@tailwindcss/forms";` in CSS.

4. **Migrate dark mode configuration:**
   - Remove `darkMode: ["class"]` from JS config.
   - Add to CSS entry point: `@custom-variant dark (&:where(.dark, .dark *));`

5. **Update CSS variable pattern for shadcn/ui v4:**
   - Move `:root` and `.dark` variable blocks out of `@layer base`.
   - Wrap HSL values: `--background: 0 0% 100%` → `--background: hsl(0 0% 100%)`.
   - Add `@theme inline` block mapping all color tokens (see section 4.7).
   - Update chart color configs if they have redundant `hsl()` wrappers.

6. **Upgrade `tailwind-merge`:**
   - Update to `^3.0.0` in `package.json`.
   - Run Shade's test suite to verify `cn()` utility still merges classes correctly.
   - Pay special attention to the renamed utilities (`shadow-sm` → `shadow-xs`, etc.) in merge conflict resolution.

7. **Update Vite configuration:**
   - Install `@tailwindcss/vite`.
   - Replace PostCSS-based Tailwind with the Vite plugin:
     ```ts
     import tailwindcss from "@tailwindcss/vite";
     export default defineConfig({ plugins: [react(), tailwindcss()] });
     ```
   - Delete `postcss.config.cjs`.
   - Remove `autoprefixer` and `postcss-import` from dependencies.

8. **Add compatibility CSS:**
   - Add the border color and button cursor overrides (section 4.4) to Shade's CSS entry point.

9. **Verify Storybook builds:**
   - Ensure Storybook still compiles and renders with the new Tailwind setup.
   - Fix any Storybook-specific Tailwind or PostCSS config.

10. **Run Chromatic visual comparison:**
    - Capture all Storybook stories against the Phase 0 baseline.
    - Batch-approve known intentional changes (border color, shadow scale shifts if compat CSS isn't used).
    - Investigate and fix any unexpected diffs.

11. **Review Shade's public API:**
    - If any exported utility names, CSS variables, or class conventions changed, document them for consuming apps.

#### Exit criteria

- Shade builds successfully with Tailwind CSS 4.
- All Storybook stories pass Chromatic visual comparison (no unintended regressions).
- `cn()` utility works correctly with `tailwind-merge` v3.
- All animations (dialog, tooltip, dropdown, popover enter/exit) work correctly.
- Dark mode toggle works in Storybook.
- Shade's unit/integration tests pass.

---

### Phase 2: Shade-consuming apps (posts, stats, activitypub)

**Duration:** 2–3 days
**Objective:** Migrate all React apps that depend on Shade. These can be done in parallel since they depend on Shade but not on each other.

#### For each app (`apps/posts`, `apps/stats`, `apps/admin-x-activitypub`):

1. **Run the upgrade tool:**
   ```bash
   cd apps/<app-name>
   npx @tailwindcss/upgrade
   ```
   Review diff, revert incorrect renames.

2. **Update Vite config:**
   - Install `@tailwindcss/vite`.
   - Replace PostCSS-based Tailwind with Vite plugin.
   - Delete `postcss.config.cjs`.
   - Remove `autoprefixer` and `postcss-import` from dependencies.

3. **Configure content detection for Shade:**
   - Replace the `content` array path for Shade with an `@source` directive in CSS:
     ```css
     @import "tailwindcss";
     @source "../node_modules/@tryghost/shade/src/**/*.{ts,tsx}";
     ```
   - Verify that all Shade component classes are included in the compiled CSS.

4. **Import Shade's theme:**
   - If Shade exports a `theme.css` or equivalent, import it in the app's CSS entry point.
   - Otherwise, ensure the app's CSS includes the same `@theme inline` and CSS variable blocks, or imports them from Shade.

5. **Migrate dark mode:**
   - Add `@custom-variant dark (&:where(.dark, .dark *));` if not inherited from Shade's CSS.
   - Verify that the Ember shell's `.dark` class correctly propagates to the React app's root element.

6. **Replace plugins:**
   - Same plugin changes as Phase 1 (tailwindcss-animate → tw-animate-css, remove line-clamp, evaluate forms).
   - Likely most of this is inherited from Shade, but verify each app's own config.

7. **Add compatibility CSS:**
   - Same border color and button cursor overrides as Phase 1.

8. **Upgrade `tailwind-merge`:**
   - Ensure the app uses `tailwind-merge` ^3.0.0 (may already be resolved via Shade workspace dependency).

9. **Delete old config files:**
   - Remove `tailwind.config.cjs` and `postcss.config.cjs` once fully on CSS-first config.

10. **Run app-specific tests:**
    - Unit tests, integration tests.
    - Manual smoke test of the app in the full Ghost admin context (not just isolated dev server).

#### Exit criteria (per app)

- App builds successfully with Tailwind CSS 4.
- App renders correctly in isolation (dev server).
- App renders correctly when mounted in the Ember admin shell.
- Dark mode works end-to-end (Ember toggle → React app responds).
- No visual regressions detected by Percy + Playwright snapshots.

---

### Phase 3: Integration testing and Ember admin validation

**Duration:** 1–2 days
**Objective:** Verify the complete Ghost admin works correctly with all React apps now on Tailwind v4, the old design system apps still on v3, and the Ember shell completely unaffected.

#### Tasks

1. **Full admin smoke test:**
   - Boot the complete Ghost admin (Ember shell + all React apps).
   - Navigate every admin route that loads a React app.
   - Verify settings panels (`admin-x-settings` on v3) render correctly alongside Shade apps on v4.

2. **BackstopJS A/B comparison:**
   - Run BackstopJS against the migration branch, comparing to the `main` branch baseline.
   - Review all diffs at desktop, tablet, and mobile viewports.
   - Pay special attention to:
     - Ember shell chrome (sidebar, top bar, navigation) — must be pixel-identical.
     - React-Ember boundary seams (where React content meets Ember layout).
     - Form elements in the Ember admin.

3. **Koenig Lexical editor verification:**
   - The editor uses Tailwind with `.koenig-lexical` scoping.
   - Open the post editor, create/edit a post, verify all editor features.
   - Check that Tailwind v4's cascade layer changes don't break the scoping.

4. **Multi-bundle conflict testing:**
   - Load a page that has multiple React apps' CSS bundles active simultaneously.
   - Check for specificity conflicts or unintended style overrides between v4 bundles and v3 bundles.
   - Specifically test: a settings panel (v3) and a stats dashboard (v4) accessible in the same session.

5. **Dark mode end-to-end:**
   - Toggle dark mode in the admin.
   - Verify all React apps (both Shade v4 and old design system v3) respond correctly.
   - Check for any flash of unstyled content during the toggle.

6. **Iframe-embedded views:**
   - Verify iframe-based views (e.g., Explore) are completely unaffected (they should be).

7. **Percy + Playwright full suite:**
   - Run the complete Playwright E2E suite with Percy snapshots enabled.
   - Review and approve all diffs.

8. **Performance verification:**
   - Compare CSS bundle sizes before and after (v4 should be smaller or equivalent).
   - Verify no increase in initial load time.
   - Spot-check dev server HMR speed improvement.

#### Exit criteria

- BackstopJS shows zero unintended diffs on Ember shell pages.
- All Percy snapshots approved.
- Koenig editor functions correctly.
- Settings (v3) and Shade apps (v4) coexist without CSS conflicts.
- Dark mode works across all apps.
- No performance regressions.

---

### Phase 4: Cleanup and merge

**Duration:** 1 day
**Objective:** Remove migration artifacts, update tooling, merge, and monitor.

#### Tasks

1. **Remove deprecated dependencies from all migrated packages:**
   - `tailwindcss` v3 (replaced by v4)
   - `postcss-import`
   - `autoprefixer`
   - `@tailwindcss/line-clamp`
   - `tailwindcss-animate`

2. **Delete old config files:**
   - All `tailwind.config.cjs` files in migrated packages (if not already deleted).
   - All `postcss.config.cjs` files in migrated packages.

3. **Update developer tooling:**
   - VS Code Tailwind IntelliSense: update settings for CSS-first config.
   - Prettier Tailwind plugin: configure CSS entry points for the new structure.
   - Update `.vscode/settings.json` or equivalent if shared.

4. **Update CI configuration:**
   - Ensure Renovate/Dependabot knows about new package names (`@tailwindcss/vite`, `tw-animate-css`).
   - Verify CI builds pass for all packages.

5. **Update visual testing baselines:**
   - Set the v4 state as the new Chromatic baseline.
   - Update Percy baselines.
   - Update BackstopJS reference images.

6. **Update documentation:**
   - Update `AGENTS.md` and any contributing guides with new Tailwind v4 conventions.
   - Document the CSS-first config pattern for new components.
   - Note that `admin-x-design-system` remains on v3.

7. **Merge and monitor:**
   - Merge the migration branch to `main`.
   - Monitor production for visual issues in the first week.
   - Have a rollback plan (revert the merge commit) ready for the first 48 hours.

#### Exit criteria

- All deprecated dependencies removed.
- CI green on `main` after merge.
- No visual issues reported in production within the first week.
- Developer tooling updated and documented.

---

## 7. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Tailwind v4 preflight changes leak into Ember admin CSS, causing visual regressions in the Ember shell. | High | High | Add compatibility CSS (section 4.4) to every migrated app. Run BackstopJS on all Ember-only pages. Test early in Phase 3. |
| R2 | Multiple Tailwind CSS bundles (v3 and v4) on the same page cause specificity conflicts via CSS cascade layers. | Medium | High | Test settings (v3) and stats (v4) simultaneously. If conflicts occur, add explicit `@layer` ordering or scope v4 styles under a container class. |
| R3 | `tailwind-merge` v3 drops Tailwind v3 support, making atomic upgrade mandatory. | Certain | Medium | Upgrade Shade first (which pins `tailwind-merge` v3), then immediately migrate all consuming apps. Do not leave consuming apps on old `tailwind-merge` v2 while Shade is on v3. |
| R4 | Dynamic class construction patterns are missed by the upgrade tool. | Medium | Medium | Grep for template literals containing Tailwind class fragments. Manually review all matches. |
| R5 | OKLCH color rendering produces subtle color shifts that trigger visual diff tools. | High | Low | This is intentional (Tailwind v4 uses OKLCH for wider gamut). Document as expected. Set lenient thresholds for color-only diffs in visual testing tools. |
| R6 | Koenig Lexical editor styles break due to cascade layer changes. | Low | High | Koenig scopes under `.koenig-lexical` — test the editor explicitly in Phase 3. If issues arise, add `@layer` containment to Koenig's CSS. |
| R7 | The upgrade tool makes incorrect renames in JSX/TSX files. | Medium | Medium | Review every diff line. Run the tool in a clean branch. Use `git diff` before committing. |
| R8 | Storybook's Tailwind integration needs separate config for v4. | Medium | Low | Test Storybook build immediately after Phase 1 changes. Storybook 8+ supports Vite natively. |

---

## 8. Validation strategy

### 8.1 Component level — Chromatic + Storybook

- Every Shade Storybook story becomes a visual test.
- Captures screenshots on every PR, compares against `main` branch baselines.
- Covers: all button variants, form inputs, dialogs, tooltips, dropdowns, tables, cards, dark mode states.
- Disable animations during capture: `* { animation: none !important; transition: none !important; }`.

### 8.2 Page level — Percy + Playwright

- Add `percySnapshot()` to critical Playwright E2E flows.
- Captures cross-browser screenshots (Chrome, Firefox, Safari).
- Covers: full admin pages, React-Ember integration boundaries, settings panels.
- Use deterministic test data to minimize false positives.

### 8.3 Full-admin level — BackstopJS

- A/B comparison: `referenceUrl` points at v3 dev server, `testUrl` points at v4 dev server.
- Captures at desktop (1920×1080), tablet (768×1024), mobile (375×812).
- Covers: every admin route, with special focus on Ember-only pages.

### 8.4 Manual testing checklist

- [ ] Admin dashboard loads, sidebar renders correctly
- [ ] Post editor (Koenig Lexical) — create, edit, publish a post
- [ ] Post analytics dashboard (apps/posts) — all charts, tables, dark mode
- [ ] Stats dashboard (apps/stats) — all views, date pickers, dark mode
- [ ] ActivityPub views — all states
- [ ] Settings panels — verify they still work on Tailwind v3, no visual changes
- [ ] Dark mode toggle — all apps respond correctly
- [ ] Navigation between Ember routes and React-mounted routes
- [ ] Mobile/responsive views of all the above

---

## 9. Estimated effort

| Phase | Duration | Dependencies |
|---|---|---|
| Phase 0: Preparation | 1–2 days | None |
| Phase 1: Shade design system | 2–3 days | Phase 0 complete |
| Phase 2: Consuming apps (parallel) | 2–3 days | Phase 1 complete |
| Phase 3: Integration testing | 1–2 days | Phase 2 complete |
| Phase 4: Cleanup and merge | 1 day | Phase 3 complete |
| **Total** | **7–11 days** | Sequential phases, but Phase 2 apps are parallelizable |

This assumes one experienced frontend engineer. Two engineers can split Phase 2 apps and reduce total wall-clock time by 1–2 days.

---

## 10. Success criteria

The migration is considered complete when:

1. All Shade-based packages compile with Tailwind CSS 4 and `@tailwindcss/vite`.
2. Zero unintended visual regressions detected across all three testing layers.
3. The Ember admin shell is pixel-identical to pre-migration state.
4. `admin-x-settings` continues to function on Tailwind v3 without changes.
5. Dark mode works end-to-end across all apps.
6. All `postcss.config.cjs` and `tailwind.config.cjs` files are removed from migrated packages.
7. CI builds pass for all packages.
8. No visual issues reported in production within one week of merge.

---

## 11. Future work (out of scope for this PRD)

- Adopt Tailwind v4 new features: OKLCH color palette, container queries, 3D transforms.
- Migrate `admin-x-settings` from old design system to Shade (separate project, eliminates v3 dependency entirely).
- Explore CSS cascade layer optimization for better style isolation between React apps and Ember shell.
- Evaluate Shadow DOM adoption for React-in-Ember mounting to eliminate global style leakage permanently.
