/**
 * `bun run indigo brand:generate` — produces every derived brand asset from
 * `src/config/brand.ts`. Idempotent: running twice produces identical output.
 *
 * Outputs:
 *   public/favicon.ico                  (multi-resolution: 16, 32, 48)
 *   public/icon.svg                     (passthrough icon or rendered glyph)
 *   public/icon-192.png                 (Next.js convention)
 *   public/icon-512.png                 (Next.js convention)
 *   public/apple-icon.png               (180×180)
 *   public/og-image.png                 (1200×630 light variant)
 *   public/og-image-dark.png            (1200×630 dark variant)
 *   public/twitter-card.png             (1200×675)
 *   public/site.webmanifest             (PWA metadata)
 *   public/brand/press-kit.zip          (bundle of all asset variants)
 *
 * Required runtime deps (install with `bun add`):
 *   sharp @resvg/resvg-js to-ico archiver satori
 *
 * Validates the brand config first; errors helpfully if assets are missing
 * for the declared mode.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { getBrandConfig } from '../lib/get-brand-config';
import { formatValidationErrors, validateBrandConfig } from '../lib/validate-config';
import type { BrandConfig, FaviconGlyph } from '../types/brand-config';

const PROJECT_ROOT = process.cwd();
const PUBLIC_DIR = resolve(PROJECT_ROOT, 'public');

interface GenerateOptions {
  /** Validate config and report what would change without writing files. */
  check?: boolean;
}

// ─── Public entry ────────────────────────────────────────────────────────────

export async function generateBrandAssets(options: GenerateOptions = {}): Promise<void> {
  console.log('▸ brand:generate — loading config from src/config/brand.ts');
  const brand = await getBrandConfig();
  const validation = validateBrandConfig(brand);

  if (!validation.ok) {
    console.error('\n✗ brand:generate failed — config is invalid:\n');
    console.error(formatValidationErrors(validation.errors));
    process.exit(1);
  }

  if (options.check) {
    console.log('✓ Config valid. Would produce these assets (skipped, --check mode):');
    listExpectedOutputs(brand).forEach((path) => console.log(`  ${path}`));
    return;
  }

  ensureDir(PUBLIC_DIR);
  ensureDir(resolve(PUBLIC_DIR, 'brand'));

  await emitFavicons(brand);
  await emitOgImages(brand);
  await emitWebManifest(brand);
  await emitPressKit(brand);

  console.log('\n✓ brand:generate complete.\n');
  console.log('  Wire Next.js metadata in app/layout.tsx:');
  console.log('    import { getBrandMetadata } from "@/core-brand/lib/metadata";');
  console.log('    export const metadata = await getBrandMetadata({ siteUrl: ... });');
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

function listExpectedOutputs(brand: BrandConfig): string[] {
  return [
    'public/favicon.ico',
    'public/icon.svg',
    'public/icon-192.png',
    'public/icon-512.png',
    'public/apple-icon.png',
    'public/og-image.png',
    'public/og-image-dark.png',
    'public/twitter-card.png',
    'public/site.webmanifest',
    'public/brand/press-kit.zip',
  ];
}

/**
 * Favicon family: pick a square source (SVG file or generated glyph), rasterize
 * to all required sizes, build the multi-res .ico.
 *
 * Implementation notes for the agent finishing this:
 *   - Use `@resvg/resvg-js` to render SVG → PNG (Bun-friendly, no headless browser)
 *   - For the glyph case (text-only mode), generate an SVG string from the glyph
 *     config and feed it through the same pipeline
 *   - `to-ico` accepts an array of PNG buffers (16, 32, 48) and produces an .ico
 *   - The Next.js `icon.svg` should be the source SVG passed through, not
 *     re-rasterized — Next.js will serve it for browsers that support SVG favicons
 */
async function emitFavicons(brand: BrandConfig): Promise<void> {
  const squareSvg = resolveFaviconSource(brand);
  if (!squareSvg) {
    throw new Error('brand:generate: no favicon source resolved (this should have been caught in validation)');
  }

  // Write the SVG icon (Next.js will use this for icon.svg)
  writeFileSync(resolve(PUBLIC_DIR, 'icon.svg'), squareSvg, 'utf-8');
  console.log('  ✓ public/icon.svg');

  // TODO(agent): rasterize with @resvg/resvg-js to PNG buffers at sizes:
  //   16x16, 32x32, 48x48 → to-ico → public/favicon.ico
  //   192x192 → public/icon-192.png
  //   512x512 → public/icon-512.png
  //   180x180 → public/apple-icon.png
  //
  // Example sketch (uncomment and complete after installing deps):
  //
  //   const { Resvg } = await import('@resvg/resvg-js');
  //   const toIco = (await import('to-ico')).default;
  //   const sharp = (await import('sharp')).default;
  //
  //   const rasterize = (size: number): Buffer => {
  //     const resvg = new Resvg(squareSvg, { fitTo: { mode: 'width', value: size } });
  //     return Buffer.from(resvg.render().asPng());
  //   };
  //
  //   const png16 = rasterize(16);
  //   const png32 = rasterize(32);
  //   const png48 = rasterize(48);
  //   const ico = await toIco([png16, png32, png48]);
  //   writeFileSync(resolve(PUBLIC_DIR, 'favicon.ico'), ico);
  //
  //   writeFileSync(resolve(PUBLIC_DIR, 'icon-192.png'), rasterize(192));
  //   writeFileSync(resolve(PUBLIC_DIR, 'icon-512.png'), rasterize(512));
  //   writeFileSync(resolve(PUBLIC_DIR, 'apple-icon.png'), rasterize(180));

  console.warn('  ⚠ favicon.ico / PNG variants not generated — install sharp + @resvg/resvg-js + to-ico and uncomment the rasterization block in cli/generate.ts');
}

/**
 * Resolve the square SVG used as the favicon source.
 * Returns inline SVG string or null.
 *
 * Priority:
 *   1. brand.icon (if present and exists)
 *   2. brand.faviconGlyph (rendered as SVG square)
 */
function resolveFaviconSource(brand: BrandConfig): string | null {
  if ('icon' in brand && brand.icon && existsSync(absPath(brand.icon))) {
    return readFileSync(absPath(brand.icon), 'utf-8');
  }
  if (brand.faviconGlyph) {
    return renderGlyphSvg(brand.faviconGlyph);
  }
  return null;
}

/** Render a faviconGlyph as a complete SVG string suitable for rasterization. */
function renderGlyphSvg(glyph: FaviconGlyph): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="10" fill="${escapeAttr(glyph.bg)}"/>
  <text x="32" y="32" text-anchor="middle" dominant-baseline="central"
        font-family="${escapeAttr(glyph.font)}" font-weight="${glyph.weight}"
        font-size="40" fill="${escapeAttr(glyph.fg)}">${escapeXml(glyph.text)}</text>
</svg>`;
}

/**
 * OG / Twitter card composition.
 *
 * Implementation notes:
 *   - Use `satori` to compose JSX templates into SVG, then `@resvg/resvg-js` to
 *     rasterize to PNG at 1200×630 (OG) and 1200×675 (Twitter).
 *   - Three templates supported:
 *       'gradient-mark' — mark centered on a brand-gradient background + name + tagline
 *       'centered-lockup' — lockup centered on solid bg
 *       'custom-svg' — user provides ogImage.customSvg, we just rasterize it
 */
async function emitOgImages(brand: BrandConfig): Promise<void> {
  // TODO(agent): implement OG composition via satori + resvg-js.
  // Sketch:
  //
  //   import satori from 'satori';
  //   import { Resvg } from '@resvg/resvg-js';
  //
  //   const fontData = readFileSync(resolve(__dirname, '../assets/Inter-Bold.ttf'));
  //   const ogSvg = await satori(
  //     <div style={{ display: 'flex', ... }}>...{brand.name}...</div>,
  //     { width: 1200, height: 630, fonts: [{ name: 'Inter', data: fontData, weight: 700 }] }
  //   );
  //   const png = new Resvg(ogSvg).render().asPng();
  //   writeFileSync(resolve(PUBLIC_DIR, 'og-image.png'), png);
  //   // Repeat for dark variant + Twitter card

  console.warn('  ⚠ og-image.png / og-image-dark.png / twitter-card.png not generated — install satori + @resvg/resvg-js and complete emitOgImages()');
}

/** Web App Manifest (PWA). */
async function emitWebManifest(brand: BrandConfig): Promise<void> {
  const manifest = {
    name: brand.name,
    short_name: brand.name,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: brand.colors.brand,
    background_color: brand.colors.bgLight,
    display: 'standalone',
    start_url: '/',
  };
  writeFileSync(
    resolve(PUBLIC_DIR, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );
  console.log('  ✓ public/site.webmanifest');
}

/** Press-kit zip bundle. */
async function emitPressKit(brand: BrandConfig): Promise<void> {
  // TODO(agent): use `archiver` to zip:
  //   - the source SVG(s)
  //   - icon.svg, icon-192.png, icon-512.png, favicon.ico, apple-icon.png
  //   - og-image.png, og-image-dark.png, twitter-card.png
  //   - a brand.json with the color palette for designers
  //
  // Sketch:
  //   import archiver from 'archiver';
  //   import { createWriteStream } from 'node:fs';
  //
  //   const output = createWriteStream(resolve(PUBLIC_DIR, 'brand/press-kit.zip'));
  //   const archive = archiver('zip', { zlib: { level: 9 } });
  //   archive.pipe(output);
  //   archive.file(resolve(PUBLIC_DIR, 'icon.svg'), { name: 'icon.svg' });
  //   archive.file(resolve(PUBLIC_DIR, 'favicon.ico'), { name: 'favicon.ico' });
  //   // ...
  //   archive.append(JSON.stringify(brand.colors, null, 2), { name: 'colors.json' });
  //   await archive.finalize();

  console.warn('  ⚠ brand/press-kit.zip not generated — install archiver and complete emitPressKit()');
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function absPath(relativePath: string): string {
  const cleaned = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return resolve(PROJECT_ROOT, cleaned);
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
