/**
 * Loads the project's brand config from `src/config/brand.ts` and validates it.
 *
 * Cached for the lifetime of the module instance. Throws on first call if the
 * config is invalid (so misconfiguration fails loudly at boot rather than
 * producing broken assets silently).
 */

import type { BrandConfig } from '../types/brand-config';
import { validateBrandConfig, formatValidationErrors } from './validate-config';

let cached: BrandConfig | null = null;

export async function getBrandConfig(): Promise<BrandConfig> {
  if (cached) return cached;

  // Dynamic import so SSR/build boundaries are respected. The project owns
  // src/config/brand.ts; this module imports it via @/config/brand.
  // @ts-expect-error — module path is resolved at the project level
  const mod = await import('@/config/brand');
  const config = (mod.brand ?? mod.default) as BrandConfig;

  if (!config) {
    throw new Error(
      "core-brand: `src/config/brand.ts` must export `brand` (or a default export) of type BrandConfig.",
    );
  }

  const result = validateBrandConfig(config);
  if (!result.ok) {
    throw new Error(
      `core-brand: brand config is invalid:\n${formatValidationErrors(result.errors)}`,
    );
  }

  cached = config;
  return config;
}

/** Test helper — resets the in-memory cache. Do not use in production code. */
export function _resetBrandConfigCache(): void {
  cached = null;
}
