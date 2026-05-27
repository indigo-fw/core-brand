# core-brand — CLAUDE.md

Single source of truth → all brand assets + components + `/brand` page.

`src/core-brand/` is a git subtree from `indigo-fw/core-brand`. Do not modify per-project.

```bash
git subtree pull --prefix=src/core-brand git@github.com:indigo-fw/core-brand.git main --squash
git subtree push --prefix=src/core-brand git@github.com:indigo-fw/core-brand.git main
```

## What this module does

Project authors edit ONE config file (`src/config/brand.ts`) and run ONE command (`bun run indigo brand:generate`) to produce:

- Favicons — `public/favicon.ico` (multi-res), `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`
- Apple touch icon — `public/apple-icon.png` (180×180)
- OG / social images — `public/og-image.png` (1200×630 light + dark), `public/twitter-card.png`
- Web manifest — `public/site.webmanifest`
- Press kit — `public/brand/press-kit.zip` (bundle of all asset variants)

Plus a `<BrandLogo>` React component the navbar/footer/emails consume.
Plus a `/brand` page (MDX-rendered) for partners/journalists.

## Three modes

The config declares one of three input modes:

| Mode          | What the user has                          | Required fields                      |
|---------------|--------------------------------------------|--------------------------------------|
| `icon+text`   | square SVG icon + wordmark string          | `icon`, `wordmark.text`              |
| `text-only`   | just text                                  | `name`, **`faviconGlyph`**           |
| `lockup`      | one horizontal SVG (icon + text composed)  | `lockup`, **plus `icon` OR `faviconGlyph`** |

The CLI validates the chosen mode and errors helpfully if assets are missing.
**Never auto-crop a lockup into a favicon** — produces bad results; force the user to provide a square source.

## Key files

- `module.config.ts` — module registration
- `register.ts` — public exports
- `types/brand-config.ts` — discriminated union for the 3 modes
- `lib/get-brand-config.ts` — loads `src/config/brand.ts`, validates against mode schema
- `lib/metadata.ts` — `getBrandMetadata()` for Next.js `generateMetadata` exports
- `components/BrandLogo.tsx` — `<BrandLogo variant="mark|wordmark|lockup|auto" />`
- `cli/generate.ts` — the `brand:generate` command implementation
- `_templates/config/brand.ts` — default config installed at scaffold time
- `_templates/brand/icon.svg` — default Indigo icon (JigsawConverge)

## CLI

```bash
bun run indigo brand:generate          # regenerate all assets from brand.ts
bun run indigo brand:generate --check  # validate config + report what would change (no writes)
```

Idempotent. Safe to re-run after editing `brand.ts`.

## Component

```tsx
import { BrandLogo } from '@/core-brand/components/BrandLogo';

<BrandLogo variant="auto" className="h-8 w-auto" />
```

`variant`:
- `mark` — square icon only
- `wordmark` — text only
- `lockup` — icon + wordmark horizontally
- `auto` — lockup on `sm+`, mark on mobile (default in navbar)

Renders correctly for every (mode × variant) combination with sensible fallbacks (text-only mode renders the `faviconGlyph` square when `variant="mark"` is asked for, etc).

## Dependencies (runtime)

- `sharp` — PNG resizing
- `@resvg/resvg-js` — SVG → PNG rasterization
- `to-ico` — multi-resolution `.ico`
- `archiver` — press-kit ZIP
- `satori` — OG image composition (JSX → SVG)

Add to `package.json` when installing the module.

## What's NOT in this module (out of scope)

- In-browser image editor (users edit SVGs in Figma/Illustrator)
- AI-generated logos
- Multi-tenant / multi-brand support (deferred until `core-multisite` integration)
- Auto-cropping non-square sources

## Removal

`indigo remove core-brand` removes:
- This subtree
- `src/config/brand.ts` (per `projectFiles`)
- `src/brand/icon.svg` (per `projectFiles`)
- Generated assets in `public/` stay — they're not module property, they're build artifacts

The navbar's `<BrandLogo>` import will go red after removal; navigate to `src/app/(public)/layout.tsx` and either restore an inline SVG or install a different brand provider.
