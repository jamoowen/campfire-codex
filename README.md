# Campfire Codex

Google search is not what it once was - The web is filled with slop and websites filled with ads, cookies and other annoyances.

When trying to find a recipe for something (anything), I find myself exhausted. I wanted a simple easy way to just browse through some recipes made by actual chefs and so I decided to spin this up.

If you have stumbled across it, feel free to use it. It uses local storage to remember your saved recipes and your list of things you decided to cook.

A warm, dungeon-campfire recipe finder built as a React single-page app plus a Cloudflare Worker API.

- **Package manager:** pnpm 11
- **Frontend:** React 19 + Vite 8
- **Hosting:** Cloudflare Workers Static Assets
- **Recipe storage:** private Cloudflare R2 object
- **Saved / cooked / ratings:** browser `localStorage`
- **Accounts:** none
- **Database:** none

> The app is deliberately bot-hostile, not bot-proof. Anything displayed to a human browser can eventually be collected by a sufficiently determined scraper.

## Personal data behavior

The app stores this information only in the visitor's browser:

```text
campfire-codex:journal:v1
```

It contains:

- saved recipe IDs;
- cooked recipe IDs, dates, and counts;
- personal 1–5 star ratings.

There is no server-side user table and no cross-device sync. Clearing browser storage clears the journal. That is the price of having no accounts, and for once the price is literal zero.

## Useful commands

| Command                   | Purpose                                                                     |
| ------------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`                | Run React and the Worker locally through the Cloudflare Vite plugin         |
| `pnpm check`              | Type-check, run automated tests, run the privacy scan, and verify demo data |
| `pnpm test`               | Run local importer and Cloudflare Worker API tests                          |
| `pnpm lint`               | Run Oxlint across browser, Worker, shared, script, and test code            |
| `pnpm lint:fix`           | Apply Oxlint fixes where they are safe                                      |
| `pnpm format:check`       | Check Prettier formatting                                                   |
| `pnpm format`             | Format public/source files with Prettier                                    |
| `pnpm audit`              | Fail on high- or critical-severity dependency advisories                    |
| `pnpm validate`           | Run linting, formatting, checks, and the dependency audit                   |
| `pnpm build`              | Create the production build                                                 |
| `pnpm preview`            | Build and preview production output locally                                 |
| `pnpm deploy`             | Validate, build, and deploy to Cloudflare Workers                           |
| `pnpm cf:login`           | Log in to Cloudflare                                                        |
| `pnpm cf:whoami`          | Show the active Cloudflare account                                          |
| `pnpm cloudflare:setup`   | Create/check R2 and upload the private catalogue                            |
| `pnpm recipes:build`      | Normalize and validate `private/recipes.json`                               |
| `pnpm recipes:seed:local` | Upload the catalogue to local simulated R2                                  |
| `pnpm recipes:upload`     | Upload the catalogue to production R2                                       |
| `pnpm privacy:check`      | Scan public/source files for known private-data markers                     |
| `pnpm clean`              | Remove generated build and local Cloudflare state                           |

## Project map

```text
src/                       React interface
worker/index.ts            Cloudflare Worker API
shared/recipe.ts           Shared TypeScript data contracts
private/recipes.json       Your source data; ignored by Git
private/schema-and-tags.json
                            Companion schema; ignored by Git
scripts/build-recipes.mjs  Normalizes and validates private data
scripts/upload-recipes.mjs Uploads one private R2 object
public/robots.txt          Crawler directives
public/_headers            CSP, no-index, and security headers
public/assets/              Optimized campfire artwork
AGENTS.md                   Rules and intent for future coding agents
ARTWORK.md                  Image-rights notes
wrangler.jsonc              Worker, R2, rate-limit, and SPA configuration
```

## CI and deployment

GitHub Actions validates every pull request and every push to `main` with a frozen pnpm install, linting, Prettier formatting, `pnpm check`, a high/critical dependency audit, build, and a Wrangler dry-run. Only a successful push to `main` builds its own static bundle and deploys the Worker. CI never runs a recipe build, seed, or upload command; production R2 data remains an owner-managed operation.

Before enabling deployment, add these production environment secrets in GitHub: `Settings → Environments → production → Environment secrets`.

- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token scoped to the intended account with **Edit Cloudflare Workers** permission. Create it in Cloudflare's API Tokens page and restrict its account/resource scope to this project where the dashboard allows it.
- `CLOUDFLARE_ACCOUNT_ID`: the target Cloudflare account ID (not a secret in the cryptographic sense, but kept in GitHub Secrets so the workflow has one configuration path).

The importer rejects empty/non-array key ingredients and IDs that cannot be routed safely. Catalogue verification also checks IDs, canonical HTTP(S) source URLs, required ingredients, and forbidden full-method fields. The privacy check rejects forbidden private, generated, and local Wrangler-state paths even when they were force-added to Git.
