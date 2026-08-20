# AGENTS.md — Campfire Codex

This file is the operating brief for coding agents working in this repository. Read it before changing code.

## Product intention

Campfire Codex is a small, warm, campfire-and-dungeon recipe finder for personal/non-commercial use. The tone is concise, dry, sardonic, and affectionate rather than loud or meme-heavy.

The visual mood may be informed by cosy fantasy cooking stories, but this must remain an original product.

## Non-negotiable behavior

1. No account, login, profile, analytics identity, or server-side user record.
2. Saved recipes, cooked history, cooked count, and personal ratings stay in browser `localStorage`.
3. Recipe source JSON stays out of public Git history.
4. Production recipe data stays in a private R2 bucket.
5. The browser never receives the original source JSON as a single downloadable object.
6. Full copied recipe methods are not stored or reproduced. Link to canonical sources.
7. Keep the product simple enough for one person to run cheaply.
8. Do not add a database, ORM, auth provider, CMS, or state-management framework without an explicit requirement.
9. Use pnpm. Do not replace it with npm, yarn, Bun, or another package manager.
10. Maintain restrictive crawler and bot controls unless the owner explicitly relaxes them.

## Current architecture

```text
React 19 SPA
  ├─ search / filters / pagination
  ├─ detail drawer
  └─ localStorage journal
         │
         ▼
Cloudflare Vite plugin
         │
         ▼
Cloudflare Worker API
  ├─ GET /api/health
  ├─ GET /api/meta
  ├─ GET /api/search
  └─ GET /api/recipes/:id
         │
         ▼
Private R2 object
  └─ catalog/v1.json
```

Files of interest:

- `src/App.tsx`: app orchestration and URL state
- `src/storage.ts`: localStorage journal and its migration boundary
- `src/api.ts`: browser API client
- `worker/index.ts`: API, search, anti-automation checks, and rate limiting
- `shared/recipe.ts`: browser/Worker data contracts
- `scripts/build-recipes.mjs`: private-source normalization
- `scripts/upload-recipes.mjs`: local/remote R2 upload
- `public/_headers`: static security and no-index headers
- `public/robots.txt`: crawler and content-use directives
- `README.md`: owner-facing operating instructions

## Data boundaries

### Private and ignored

- `private/recipes.json`
- `private/schema-and-tags.json`
- `private/pop-culture-index.json`
- `.recipe-build/`
- `.wrangler/`

Never move private recipe files into `src`, `public`, `data`, docs, fixtures, tests, screenshots, or committed generated output.

Before finishing any data-related task, run:

```bash
pnpm privacy:check
```

### Public demo data

`data/demo-catalog.json` contains fictional entries and is safe to commit. The Worker falls back to this file when R2 is empty or unavailable.

### Import contract

The importer accepts either a top-level recipe array or `{ "metadata": ..., "recipes": [...] }`.

Required fields:

- stable unique `id`
- `name`
- `chef`
- canonical `source_url`
- `key_ingredients` array

`key_ingredients` are normalized search/shopping terms, not a verbatim exhaustive ingredient list. Preserve that distinction in UI copy and code.

Forbidden output fields include:

- `method`
- `methods`
- `instructions`
- `directions`
- `steps`

Do not weaken this check casually.

## API contract

Keep API responses same-origin, JSON-only, paginated, and no-store.

### `/api/meta`

Returns dataset counts, available facets, and whether data came from R2 or demo fallback.

### `/api/search`

Returns at most 24 summaries per page. Current query support:

- text query
- collection IDs
- chef
- cuisine
- protein
- dish type
- dietary classification
- difficulty
- time category
- supermarket availability
- quick 30 minutes or less
- under ten key ingredients
- single vessel
- one pot or pan
- traybake
- screen food
- sort and pagination

Do not add a bulk `all-recipes`, export, GraphQL introspection, or unrestricted cursor endpoint.

### `/api/recipes/:id`

Returns one normalized record. Full methods remain external.

When changing API types, update all three locations together:

1. `shared/recipe.ts`
2. `worker/index.ts`
3. `src/api.ts` and consumers

## Local journal contract

Storage key:

```text
campfire-codex:journal:v1
```

Current limits are deliberately small. Preserve sanitization, bounds, and cross-tab synchronization.

If the shape changes:

1. increment the storage version/key;
2. provide a safe migration;
3. keep old malformed data from crashing the app;
4. document the behavior in README.

Do not sync this data to Cloudflare unless the owner explicitly accepts accounts and server-side persistence.

## Design system and voice

### Visual direction

- charcoal, soot, parchment, brass, ember, moss, and old steel
- warm light against dark surfaces
- elegant fantasy field-guide feeling
- large readable editorial typography
- restrained texture rather than noisy cosplay UI
- original pot, fire, pantry, ledger, and provisions metaphors
- one strong hero image rather than decorative image clutter

Avoid:

- generic SaaS blue/purple gradients
- glassmorphism everywhere
- bento-card spam
- tiny low-contrast text
- novelty medieval fonts for body copy
- fake RPG statistics that do not help recipe finding

### Voice

Use short, useful sardonic lines. Examples of the desired register:

- “No account. No prophecy. Just dinner.”
- “Future you now has obligations.”
- “The sink rejoices.”
- “Apply a filter before winter.”

Do not turn every label into a joke. Controls must remain immediately understandable and accessible.

## Bot protection posture

The goal is strong deterrence without accounts.

Preserve:

- `robots.txt` disallow rules and negative content signals;
- no-index headers;
- private R2;
- same-origin request checks;
- common automation user-agent rejection;
- per-IP Worker rate limiting;
- response pagination and maximum page limits;
- no bulk dump endpoint;
- strict CSP and frame protection.

Remember: request headers can be forged. These controls raise cost; they do not make public browser-visible data secret.

Localhost is intentionally exempt from browser/automation checks so development and testing work.

Do not add broad CORS headers to `/api/*`.

## Tooling policy

The project intentionally tracks a modern stack and pins exact versions for repeatability.

Before updating dependencies:

1. verify current official releases and Cloudflare compatibility;
2. read migration notes for pnpm, Vite, React, Wrangler, and the Cloudflare Vite plugin;
3. keep exact versions in `package.json`;
4. update `pnpm-workspace.yaml` only after auditing any package that requests an install script;
5. generate and commit the lockfile;
6. run the complete validation sequence below.

Do not add compatibility flags to Wrangler unless current Cloudflare documentation requires them for the chosen compatibility date.

## Definition of done

Run from a clean checkout:

```bash
pnpm install
pnpm recipes:seed:local
pnpm check
pnpm build
pnpm preview
```

Then verify at desktop and mobile widths:

1. demo fallback works with empty local R2;
2. private local R2 shows the complete imported catalogue;
3. text search works;
4. every facet changes results;
5. quick toggles work alone and together;
6. sorting works;
7. pagination works;
8. a recipe opens from a card and a direct `?recipe=` URL;
9. browser back/forward updates the drawer;
10. save state persists after reload;
11. cooked state and “cooked again” counts persist;
12. ratings persist;
13. saved and cooked collection ordering is correct;
14. cross-tab localStorage updates appear;
15. keyboard `/` focuses search;
16. Escape closes modals;
17. visible focus states are clear;
18. no mobile overflow or clipped controls;
19. security headers and `robots.txt` are present in preview/deployment;
20. API responses never expose the ignored source file wholesale.

Also run:

```bash
pnpm recipes:build
node scripts/verify-catalog.mjs .recipe-build/catalog-v1.json
pnpm privacy:check
```

## README obligation

Any change to setup, JSON shape, Cloudflare configuration, commands, storage behavior, bucket names, or security controls must update `README.md` in the same change.

The owner should not need to infer deployment steps from code.
