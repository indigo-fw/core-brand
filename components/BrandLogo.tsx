/**
 * <BrandLogo /> — the navbar/footer/email logo primitive.
 *
 * Reads the project's brand config and renders the requested variant,
 * with sensible fallbacks for any (mode × variant) combination.
 *
 * Examples:
 *
 *   <BrandLogo variant="auto" className="h-8 w-auto" />     // navbar default
 *   <BrandLogo variant="mark" className="h-6 w-auto" />     // mark-only
 *   <BrandLogo variant="wordmark" className="text-lg" />    // wordmark-only
 *   <BrandLogo variant="lockup" className="h-10 w-auto" />  // full lockup
 *
 * Variant × mode behavior:
 *
 *                 | icon+text       | text-only         | lockup
 *   --------------+-----------------+-------------------+---------------------
 *   mark          | render `icon`   | render glyph sq   | render `icon` or glyph
 *   wordmark      | render text     | render text       | render text (fallback)
 *   lockup        | icon + text     | wordmark only     | render `lockup` SVG
 *   auto          | lockup→mark @sm | wordmark always   | lockup always
 *
 * This is a SERVER component (no hooks) — it reads the brand config on the
 * server and emits inline SVG / text. No JS shipped to the client.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getBrandConfig } from '../lib/get-brand-config';
import type { BrandConfig, FaviconGlyph, WordmarkConfig } from '../types/brand-config';

export type BrandLogoVariant = 'mark' | 'wordmark' | 'lockup' | 'auto';

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
}

const PROJECT_ROOT = process.cwd();

function readSvg(relativePath: string): string {
  const cleaned = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  try {
    return readFileSync(resolve(PROJECT_ROOT, cleaned), 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Inline an SVG file as JSX-compatible markup. We strip the root <svg> element's
 * width/height so CSS (h-8 etc.) controls sizing, and inject the provided className.
 */
function InlineSvg({ source, className, ariaLabel }: { source: string; className?: string; ariaLabel: string }) {
  if (!source) return null;
  // Strip width/height on root <svg> so CSS controls sizing; preserve viewBox.
  const cleaned = source
    .replace(/\swidth=["'][^"']*["']/i, '')
    .replace(/\sheight=["'][^"']*["']/i, '')
    .replace(/^<svg/i, `<svg class="${className ?? ''}" role="img" aria-label="${ariaLabel}"`);
  return <span dangerouslySetInnerHTML={{ __html: cleaned }} />;
}

/** Render a faviconGlyph as an inline SVG square — used as a fallback mark. */
function GlyphSquare({ glyph, className, ariaLabel }: { glyph: FaviconGlyph; className?: string; ariaLabel: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <rect width="64" height="64" rx="10" fill={glyph.bg} />
      <text
        x="32"
        y="32"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={glyph.font}
        fontWeight={glyph.weight}
        fontSize="40"
        fill={glyph.fg}
      >
        {glyph.text}
      </text>
    </svg>
  );
}

/** Render the live-text wordmark using the brand's wordmark font. */
function Wordmark({ wordmark, fallbackText, className }: { wordmark: WordmarkConfig | undefined; fallbackText: string; className?: string }) {
  const text = wordmark?.text ?? fallbackText;
  const style: React.CSSProperties = {};
  if (wordmark) {
    style.fontFamily = wordmark.font;
    style.fontWeight = wordmark.weight;
    if (typeof wordmark.tracking === 'number') {
      style.letterSpacing = `${wordmark.tracking}em`;
    }
  }
  return (
    <span className={className} style={style}>
      {text}
    </span>
  );
}

// ─── Variant renderers per mode ──────────────────────────────────────────────

function renderMark(brand: BrandConfig, className?: string) {
  if (brand.mode === 'icon+text') {
    return <InlineSvg source={readSvg(brand.icon)} className={className} ariaLabel={brand.name} />;
  }
  if (brand.mode === 'text-only') {
    return <GlyphSquare glyph={brand.faviconGlyph} className={className} ariaLabel={brand.name} />;
  }
  // lockup mode
  if (brand.icon) {
    return <InlineSvg source={readSvg(brand.icon)} className={className} ariaLabel={brand.name} />;
  }
  if (brand.faviconGlyph) {
    return <GlyphSquare glyph={brand.faviconGlyph} className={className} ariaLabel={brand.name} />;
  }
  return null;
}

function renderWordmark(brand: BrandConfig, className?: string) {
  const wordmark = 'wordmark' in brand ? brand.wordmark : undefined;
  return <Wordmark wordmark={wordmark} fallbackText={brand.name} className={className} />;
}

function renderLockup(brand: BrandConfig, className?: string) {
  if (brand.mode === 'lockup') {
    return <InlineSvg source={readSvg(brand.lockup)} className={className} ariaLabel={brand.name} />;
  }
  if (brand.mode === 'icon+text') {
    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}>
        {renderMark(brand, 'h-[1em] w-auto')}
        {renderWordmark(brand)}
      </span>
    );
  }
  // text-only — degrade to wordmark
  return renderWordmark(brand, className);
}

// ─── Public component ───────────────────────────────────────────────────────

export async function BrandLogo({ variant = 'lockup', className }: BrandLogoProps) {
  const brand = await getBrandConfig();

  if (variant === 'auto') {
    // Render lockup at sm+, mark on mobile, via CSS-only switch (no JS).
    return (
      <>
        <span className="hidden sm:inline-flex">{renderLockup(brand, className)}</span>
        <span className="sm:hidden inline-flex">{renderMark(brand, className)}</span>
      </>
    );
  }
  if (variant === 'mark') return renderMark(brand, className);
  if (variant === 'wordmark') return renderWordmark(brand, className);
  return renderLockup(brand, className);
}
