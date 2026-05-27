# core-brand — TODO / next-up work

This is what's in the scaffold commit and what still needs implementation.

## Done in this commit

- Module structure: `module.config.ts`, `register.ts`, `CLAUDE.md`
- `BrandConfig` discriminated union (`types/brand-config.ts`) — TS-enforced required fields per mode
- Config loader + validator (`lib/get-brand-config.ts`, `lib/validate-config.ts`)
- `<BrandLogo variant="mark|wordmark|lockup|auto" />` (server component, handles all 12 variant×mode combos with fallbacks)
- `getBrandMetadata()` for Next.js `generateMetadata` exports
- CLI command stub `brand:generate` (validates config + writes `icon.svg` + writes `site.webmanifest`)
- CLI wired into `scripts/indigo.ts` as `bun run indigo brand:generate [--check]`
- Module registered in `scripts/indigo/registry.ts` and `indigo.config.ts`
- Default templates in `_templates/config/brand.ts` + `_templates/brand/icon.svg`
- Project files copied to `src/config/brand.ts` and `src/brand/icon.svg` for the framework dev tree

## TODO — runtime asset generation

The CLI currently writes:
- ✓ `public/icon.svg` (passthrough or rendered glyph)
- ✓ `public/site.webmanifest`

The CLI does NOT yet write (sketched in `cli/generate.ts` with `// TODO(agent):` markers):
- `public/favicon.ico` (multi-res, needs `to-ico` + `@resvg/resvg-js`)
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-icon.png` (need `@resvg/resvg-js` rasterization)
- `public/og-image.png`, `public/og-image-dark.png` (need `satori` for JSX-to-SVG composition + `@resvg/resvg-js` for rasterization)
- `public/twitter-card.png` (same pipeline)
- `public/brand/press-kit.zip` (need `archiver`)

To finish: install runtime deps, uncomment the sketches, complete OG templates.

```bash
bun add sharp @resvg/resvg-js to-ico archiver satori
```

## TODO — `/brand` page

Not yet built. Plan (per `prd-core-brand.md`):

1. Register a MDX renderer for `type: brand-page` (see `dev/src/app/CLAUDE.md` renderer pattern)
2. Ship MDX components: `<BrandHero>`, `<BrandLogoDownloads>`, `<BrandPalette>`, `<BrandTypography>`, `<BrandMisuseGrid>`
3. Default content template at `_templates/content/brand.mdx`
4. `/press` → `/brand` redirect in `src/proxy.ts`
5. API route `src/app/api/brand/press-kit.zip/route.ts` that serves the generated ZIP

## TODO — `indigo doctor` integration

Add brand-config validation to the doctor checks (see `scripts/indigo.ts` `doctor()`):
- Verify `src/config/brand.ts` exists and is parseable
- Run `validateBrandConfig()` and report errors as doctor warnings
- Verify asset files declared in the config exist
- Verify generated assets in `public/` are up to date (file mtime vs `brand.ts` mtime)

## TODO — tests

`__tests__/` not yet scaffolded. Cover:
- `validateBrandConfig()` — every error path, all 3 modes
- `BrandLogo` rendering — matrix of (mode × variant) = 12 cases, snapshot tests
- `generateBrandAssets()` — runs against fixture configs, asserts expected files exist + are valid PNG/ICO/SVG

## Once everything's done

Push to the standalone module repo:

```bash
INDIGO_MAINTAINER=1 bun run indigo push core-brand
```

Then ship a release of `indigo-fw/starter` that includes the module by default.

## Acceptance criteria (from the PRD)

- [ ] A fresh `bunx degit indigo-fw/starter` install ships with Indigo's brand pre-generated
- [ ] Edit `src/config/brand.ts` → run `bun run indigo brand:generate` → everything regenerates idempotently
- [ ] All 3 modes work end-to-end
- [ ] `<BrandLogo>` renders correctly for every (mode × variant) combo with sensible fallbacks
- [ ] `bun run indigo doctor` validates the brand config
- [ ] Module is cleanly removable via `indigo remove core-brand`
