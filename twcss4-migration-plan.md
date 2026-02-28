## TWCSS4 Migration Plan for Ghost Admin (Decision-Complete)

### Summary
Migrate Tailwind CSS from v3 to v4 for `apps/shade`, `apps/posts`, `apps/stats`, and `apps/activitypub`, while keeping `apps/admin-x-settings` and `apps/admin-x-design-system` on v3.  
This plan also includes the agreed decoupling of `apps/admin` from Shade’s legacy Tailwind/PostCSS config files to avoid breakage during cleanup.

### Scope
In scope: `apps/shade`, `apps/posts`, `apps/stats`, `apps/activitypub`, `apps/admin` (decoupling-only), `apps/admin-x-framework` (shared Vite integration if needed).  
Out of scope: `apps/admin-x-settings`, `apps/admin-x-design-system`, Portal/Comments/Signup/Search/Announcement Bar, Ember CSS architecture redesign.

### Public API / Interface Changes
1. `@tryghost/shade` styling contract becomes CSS-first Tailwind v4 (`@import "tailwindcss"`, `@theme inline`, `@custom-variant dark`).
2. `@tryghost/shade` legacy config exports are removed or deprecated (`tailwind.cjs`, `postcss.config.cjs`) after consumers are decoupled.
3. Vite integration for in-scope apps moves from PostCSS Tailwind to `@tailwindcss/vite`.
4. `tailwind-merge` is upgraded to `^3` in Shade-dependent apps.
5. Class syntax/classname changes are applied repo-wide in in-scope apps (`outline-none`→`outline-hidden`, important suffix form, CSS var shorthand form, etc.).

---

## Phase 0: Preparation and Baseline (1-2 days)

### Tasklist
1. Create branch `tailwind-v4-migration` from latest `main`.
2. Freeze migration scope list and route list for coverage (dashboard, editor, posts, stats, activitypub, settings pages).
3. Confirm runtime prerequisites in CI/local (Node `22.18.0` in CI already satisfies v4 requirement).
4. Build baseline artifacts on `main`:
5. Capture Shade Storybook baseline.
6. Capture Playwright screenshot baseline for critical admin flows.
7. Capture full-page A/B baseline (Backstop or equivalent) for admin routes.
8. Run code audit commands excluding build output directories (`dist`, `es`, `ghost/core/core/built`):
9. Inventory `@apply` usage.
10. Inventory dynamic class construction.
11. Inventory old arbitrary CSS variable syntax (`[--... ]`).
12. Inventory utility classes impacted by v4 rename changes.

### Exit Gate
Baseline snapshots stored and reproducible in CI/local; migration checklist created from audit results.

---

## Phase 1: Decouple Admin + Shared Tooling Edges (0.5-1 day)

### Tasklist
1. Decouple `apps/admin` from `@tryghost/shade/postcss.config.cjs` import.
2. Remove `apps/admin` reliance on `tailwind.config.js` preset pipeline if not used by runtime CSS.
3. Keep `apps/admin/src/index.css` as pure CSS importing `@tryghost/shade/styles.css`.
4. If posts/stats/activitypub shared Vite factory is used, decide single integration point:
5. Preferred: add `@tailwindcss/vite` in `apps/admin-x-framework/src/vite.ts` behind default plugin list for Tailwind apps.
6. Keep override path for apps that should not use Tailwind plugin.
7. Validate admin app build/dev still works before Tailwind v4 changes.

### Exit Gate
`apps/admin` no longer depends on Shade legacy PostCSS/Tailwind config files.

---

## Phase 2: Migrate Shade to Tailwind v4 (2-3 days)

### Tasklist
1. Upgrade Shade dependencies:
2. `tailwindcss@^4`, `@tailwindcss/vite`, `tw-animate-css`, `tailwind-merge@^3`.
3. Remove `tailwindcss-animate`, `postcss-import`, `autoprefixer`, `@tailwindcss/line-clamp` (if unused).
4. Convert `apps/shade/styles.css` to v4 format:
5. Replace `@tailwind base/components/utilities` with `@import "tailwindcss"`.
6. Add `@custom-variant dark (&:where(.dark, .dark *));`.
7. Move `:root` and `.dark` variables out of `@layer base`.
8. Convert HSL tokens to `hsl(...)` values.
9. Add `@theme inline` token mapping block.
10. Keep compatibility base rules for border-color and button cursor to preserve v3 behavior.
11. Replace animation plugin usage:
12. Add `@import "tw-animate-css";`.
13. Verify all component animations (dialog, tooltip, dropdown, popover, sheet, toast).
14. Update Shade Vite config to include `tailwindcss()` plugin.
15. Remove `apps/shade/postcss.config.cjs`.
16. Apply class migration in Shade code:
17. Utility renames and syntax updates.
18. Important modifier suffix conversion.
19. CSS variable shorthand conversion (`w-[--x]` to `w-(--x)` etc.).
20. Update Shade tooling metadata:
21. Update `components.json` for v4-compatible shadcn config shape.
22. Update lint setup so Tailwind lint rules work without runtime `tailwind.config.cjs`.
23. Run Shade verification:
24. `yarn workspace @tryghost/shade lint`
25. `yarn workspace @tryghost/shade test`
26. `yarn workspace @tryghost/shade build`
27. `yarn workspace @tryghost/shade build-storybook`
28. Run visual diff against Shade baseline and resolve regressions.

### Exit Gate
Shade is fully v4, builds/tests/lint pass, and visual diffs are approved.

---

## Phase 3: Migrate Shade Consumers (posts, stats, activitypub) (2-3 days)

### Tasklist (run app-by-app in this exact order: posts → stats → activitypub)
1. Upgrade app dependencies to v4-compatible set (`tailwindcss`, `@tailwindcss/vite`, `tailwind-merge` alignment if present).
2. Remove app `postcss.config.cjs`.
3. Remove app `tailwind.config.cjs` after CSS-first migration is complete.
4. Ensure app CSS entry remains `@import "@tryghost/shade/styles.css";` unless app has local Tailwind directives requiring explicit `@source`.
5. If local Tailwind scanning is needed, add v4 `@source` directives in app CSS.
6. Migrate app-specific classnames/syntax (including ActivityPub custom classes and keyframe references).
7. For `apps/activitypub`, port custom keyframes/animation utility plugin behavior into v4-compatible CSS/plugin approach.
8. Update each app’s ESLint Tailwind rule config away from hard `tailwind.config.cjs` path.
9. Validate each app:
10. `yarn workspace @tryghost/posts lint && yarn workspace @tryghost/posts test:unit && yarn workspace @tryghost/posts build`
11. `yarn workspace @tryghost/stats lint && yarn workspace @tryghost/stats test:unit && yarn workspace @tryghost/stats build`
12. `yarn workspace @tryghost/activitypub lint && yarn workspace @tryghost/activitypub test:unit && yarn workspace @tryghost/activitypub build`
13. Smoke each app mounted inside Ghost admin shell with light/dark mode.

### Exit Gate
All three apps are v4 and pass unit/lint/build + mounted smoke checks.

---

## Phase 4: Cross-App Integration and Regression (1-2 days)

### Tasklist
1. Run full admin route smoke in dev stack (`yarn dev` path).
2. Validate v3 + v4 coexistence:
3. `admin-x-settings` (v3) screens unchanged.
4. Shade apps (v4) render correctly in same browser session.
5. Validate Ember shell chrome remains visually identical.
6. Validate Koenig Lexical editor flows (create/edit/publish).
7. Validate dark-mode propagation from Ember root `.dark` to all migrated apps.
8. Run visual testing layers:
9. Storybook visual diff for Shade.
10. Playwright page snapshots for critical flows.
11. Full-page route diff run (desktop/tablet/mobile).
12. Run repository-level checks:
13. `yarn lint`
14. `yarn test:unit`
15. Targeted e2e suites for affected apps.

### Exit Gate
No unintended visual regressions; all checks green; no integration break between Ember, v3 apps, and v4 apps.

---

## Phase 5: Cleanup, Documentation, and Merge (1 day)

### Tasklist
1. Remove deprecated dependencies from migrated packages.
2. Remove obsolete config files from migrated packages (`postcss.config.cjs`, `tailwind.config.cjs`) once lint/tooling replacements are in place.
3. Remove Shade compatibility exports (`tailwind.cjs`, old PostCSS export) after confirming no remaining imports.
4. Update docs:
5. Root guidance for Tailwind v4 conventions.
6. Shade package docs for CSS-first theming and dark variant pattern.
7. Add migration note stating `admin-x-settings`/`admin-x-design-system` intentionally remain on v3.
8. Update CI/dependency automation for new packages (`@tailwindcss/vite`, `tw-animate-css`).
9. Rebaseline visual testing on migration branch and merge when green.
10. Post-merge monitor for 7 days with fast rollback via merge revert prepared.

### Exit Gate
Main branch green, docs updated, no post-merge regressions during monitoring window.

---

## Test Cases and Scenarios

1. Utility migration correctness: all known renamed utilities render equivalently.
2. Input/button defaults: border color and cursor behavior match pre-migration intent.
3. Animation parity: open/close transitions for dialog/popover/tooltip/dropdown/sheet/toast.
4. Dark mode parity: toggle from Ember reflects in all migrated React apps.
5. Cross-version coexistence: v3 settings views and v4 Shade views do not conflict.
6. Koenig safety: lexical editor remains functionally and visually stable.
7. Responsive parity: desktop/tablet/mobile screenshots match baseline tolerance.
8. Build/tooling parity: no package still resolves deleted Tailwind/PostCSS legacy files.

---

## Assumptions and Defaults Chosen

1. `apps/activitypub` is the correct in-scope path (not `apps/admin-x-activitypub`).
2. `apps/admin` will be decoupled now (your selected option) but not fully migrated as a feature scope.
3. Yarn is used for all dependency/script execution; no npm-based workflow.
4. CI Node version remains 22.x, satisfying Tailwind v4 tooling requirements.
5. Visual tooling stack may be implemented with existing repo conventions if exact PRD tools are unavailable, but coverage gates remain mandatory.
6. No intentional redesigns are allowed; any visual change requires explicit approval as migration side-effect only.
