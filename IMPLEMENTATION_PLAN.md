# Implementation Plan — Portfolio Developments

Covers the three items in `NEEDED_DEVELOPPEMENTS.md`:
1. Auto-translation of project description/problem/solution, synced with the site language switcher.
2. Split Project Details fetching — text data first, images lazy-loaded.
3. Loading spinner on Projects list & Project Details pages.

Approach decided: translate **at save time** (admin create/edit) using the **DeepL API**, storing all 3 language variants so switching site language is instant with no refetch.

Implement in the order below — each part is self-contained and buildable/testable on its own before moving to the next.

---

## Part 1 — Database schema (`backend/src/db.js`)

Add two fields to `portfolio_projects`, mirrored across Mongo/Postgres/SQLite (SQLite is the active backend per `backend/.env`):
- `translations` — JSON blob: `{ ar: {description,problem,solution}, en: {...}, fr: {...} }`. Same pattern as the existing `stack`/`images` JSON-text columns.
- `source_lang` (`sourceLang` in Mongo) — `'ar'|'en'|'fr'`, default `'ar'`. Set once at creation, never changed afterward.

Changes:
- [x] Mongoose schema (~line 89): add `translations: { type: Mixed, default: {} }`, `sourceLang: { type: String, default: 'ar' }`.
- [x] Postgres `CREATE TABLE` (~line 276) + `migrate()`: add `translations TEXT DEFAULT '{}'`, `source_lang TEXT NOT NULL DEFAULT 'ar'` via `ALTER TABLE ADD COLUMN IF NOT EXISTS`.
- [x] SQLite `CREATE TABLE` (~line 375) + `migrate()`: same two columns via try/catch `ALTER TABLE ADD COLUMN` (existing pattern, e.g. `kind TEXT NOT NULL DEFAULT 'new'`).
- [x] `mapPortfolioProject` / `mapMongoPortfolio` (~lines 765, 780): parse/pass through `translations` (JSON.parse on sqlite/pg) and `sourceLang`.
- [x] `createPortfolioProject` (~814): accept + persist `translations`, `sourceLang`.
- [x] `updatePortfolioProject` (~833): add `translations` to `PORTFOLIO_UPDATABLE` + the JSON-stringify special-case (alongside `stack`/`images`). Do **not** add `sourceLang` — immutable.
- [x] New helper `getPortfolioProjectMetaBySlug(slug)` — full row minus `images`.
- [x] New helper `getPortfolioProjectImagesBySlug(slug)` — just `images` (or `null` if not found).
- [x] Keep existing `getPortfolioProjectBySlug` (full row) as-is — still used by admin edit flow and `PUT` diffing.

**Verify**: restart backend, confirm no migration errors, confirm existing portfolio projects still load via the current (unchanged) routes.

✅ Done — verified: SQLite migration adds both columns cleanly on an existing DB, `getPortfolioProjectMetaBySlug` returns no `images` key, `getPortfolioProjectImagesBySlug` returns just the array, and `getPortfolioProjectBySlug` is unchanged.

---

## Part 2 — DeepL translation module (`backend/src/translate.js`, new)

- [x] Create `backend/src/translate.js` exporting `translateProjectText(fields, sourceLang)`.
- [x] `DEEPL_API_KEY` read from env; auto-select free (`api-free.deepl.com`) vs pro (`api.deepl.com`) endpoint via the `:fx` key suffix convention.
- [x] Language codes: source `{ar:'AR', en:'EN', fr:'FR'}`, target `{ar:'AR', en:'EN-US', fr:'FR'}`.
- [x] One HTTP request **per target language** (not per field) — DeepL accepts multiple `text=` params per call.
- [x] Filter out empty fields before calling DeepL; they're stored as `''`.
- [x] `AbortController` timeout (~8s). On any failure (network/timeout/non-2xx), `console.warn` and omit that language from the result — must **never throw** (a translation failure must not block saving the project).
- [ ] Manual step (not automated): add `DEEPL_API_KEY=...` to `backend/.env`. **← you still need to do this** (placeholder comment added to `.env`).

**Verify**: call `translateProjectText({description:'test'}, 'ar')` from a scratch script or temporary route, confirm it returns `en`/`fr` translations without throwing when the key is valid, and returns `{}` gracefully when the key is missing/invalid.

✅ Done — verified `translateProjectText` returns `{}` and logs a warning (never throws) when `DEEPL_API_KEY` is unset. Not yet tested against a real key since none is configured.

---

## Part 3 — Wire translation into the portfolio routes (`backend/src/routes/portfolio.js`)

- [x] `POST /`: accept optional `sourceLang` in body (default `'ar'`), call `translateProjectText` on sanitized fields, persist `translations = { [sourceLang]: cleanFields, ...otherTranslations }` and `sourceLang`.
- [x] `PUT /:id`: **diff-based** — only fields that changed vs. the existing row get re-sent to DeepL; merge into existing `translations` rather than overwriting wholesale. `sourceLang` is never changed here.
- [x] `GET /` (list) and `GET /:slug` (detail): include `translations` and `sourceLang` in the response payload.

**Verify (manual test case — important)**: create a project in Arabic, confirm `translations.en`/`translations.fr` are populated. Then edit **only** the `problem` field via `PUT`, and confirm `description`'s `en`/`fr` translations are unchanged afterward (this is the part most likely to have a merge bug).

✅ Done — verified live against the real DeepL key already in `.env`: created a project via `POST /` with Arabic text, `translations.en`/`translations.fr` populated correctly. Then `PUT` with only `problem` changed — confirmed `description`/`solution` translations were untouched in the merged result, only `problem`'s en/fr updated. Test projects deleted afterward.

---

## Part 4 — Split image loading (backend)

- [x] Reshape `GET /:slug` to call `getPortfolioProjectMetaBySlug` — response has **no `images` key**.
- [x] Add new route `GET /:slug/images` → `{ images: [...] }` via `getPortfolioProjectImagesBySlug`.

**Verify**: `curl` (or browser) `GET /api/portfolio/<slug>` returns text fields but no images array; `GET /api/portfolio/<slug>/images` returns the images array separately.

✅ Done — verified against the live local SQLite DB: `GET /api/portfolio/<slug>` returns no `images` key, `GET /api/portfolio/<slug>/images` returns `{ images: [...] }` with the correct count.

---

## Part 5 — `Spinner` component (frontend)

- [ ] Add `Spinner({ size = 32, style = {} })` to `frontend/src/components/UI.jsx` (alongside `Card`/`Btn`/`Badge`).
- [ ] Add `@keyframes solvix-spin` to `frontend/src/styles/global.js` (next to the existing `@keyframes pulse`).

**Verify**: temporarily render `<Spinner />` anywhere and confirm it renders/animates correctly before wiring it into pages.

---

## Part 6 — Frontend: `ProjectDetails.jsx` (split fetch + translations + spinner)

- [ ] Add shared helper `frontend/src/utils/projectText.js` exporting `pickText(project, lang)` — reads `project.translations?.[lang]`, falls back to plain `description`/`problem`/`solution` if missing.
- [ ] Replace the single fetch effect with two independent, parallel effects: `project`/`metaLoading`/`notFound` from `GET /:slug`, and `images`/`imagesLoading` from `GET /:slug/images`.
- [ ] Render text (title/description/problem/solution) via `pickText(project, lang)` instead of `project.description` etc., so switching `lang` re-renders instantly with no refetch.
- [ ] Replace the `"..."` loading placeholder with `<Spinner />`, gated on `metaLoading` only (independent of images).
- [ ] Update `Carousel` (same file) to accept an `images`/`loading` prop pair; show `<Spinner />` instead of the 🖼️ emoji while `imagesLoading` and no images yet.

**Verify**: open a project details page on a throttled network — title/description/problem/solution should appear before images finish loading, with a spinner over the image area meanwhile. Switch the site language and confirm text updates instantly (no network request in the browser devtools).

---

## Part 7 — Frontend: `Projects.jsx` (list page spinner + translations)

- [ ] Show `<Spinner />` while `loading` (currently renders nothing).
- [ ] Swap each card's `project.description` for `pickText(project, lang).description`.

**Verify**: reload the Projects page on a throttled network, confirm a spinner shows before the grid renders; switch language and confirm card descriptions update instantly.

---

## Part 8 — Admin dashboard fix (`frontend/src/dashboard/Dashboard.jsx`) — required, not optional

This is required because the admin edit form currently reuses the same `GET /:slug` route to prefill its image gallery — once that route stops returning `images` (Part 4), the edit form would silently open with an empty image list and saving would wipe existing images.

- [ ] `PortfolioTab.openEdit` (~line 1482): fetch both `GET /:slug` and `GET /:slug/images` in parallel (`Promise.all`), merge into `{ ...metaData.project, images: imagesData.images }`.
- [ ] `PortfolioForm` (~line 1536): add a source-language default/selector, defaulting to the dashboard's current `lang` prop, shown **only when creating** a new project (`!project`) — `sourceLang` is immutable after creation.
- [ ] `save()`: include `sourceLang` in the POST body only when creating (not on `PUT`).

**Verify**: open the edit form for an existing project with images, confirm images still show, can be reordered/removed, and saving doesn't wipe them. Create a new project, confirm the source-language selector works and translations populate correctly.

---

## Risks / notes

- DeepL free-tier quota: translation only happens on admin save (not per page view), and edits only re-translate changed fields — should comfortably fit a low-traffic B2B site's usage.
- `sourceLang` is immutable by design; correcting a wrongly-picked source language isn't supported (would need deleting/recreating the project).
- Backward compatibility: pre-existing rows default to `translations = {}` / `source_lang = 'ar'`; `pickText()`'s fallback means old projects still display correctly (untranslated) immediately — no backfill script required.

### Critical files
- `backend/src/db.js`
- `backend/src/routes/portfolio.js`
- `backend/src/translate.js` (new)
- `frontend/src/pages/ProjectDetails.jsx`
- `frontend/src/pages/Projects.jsx`
- `frontend/src/dashboard/Dashboard.jsx`
- `frontend/src/components/UI.jsx`
- `frontend/src/utils/projectText.js` (new)
