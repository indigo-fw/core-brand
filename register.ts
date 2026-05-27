/**
 * core-brand module registration entrypoint.
 */

// Components
export { BrandLogo } from './components/BrandLogo';
export type { BrandLogoVariant } from './components/BrandLogo';

// Lib
export { getBrandConfig } from './lib/get-brand-config';
export { getBrandMetadata } from './lib/metadata';

// Types
export type {
  BrandConfig,
  BrandConfigIconText,
  BrandConfigTextOnly,
  BrandConfigLockup,
  BrandMode,
  FaviconGlyph,
  WordmarkConfig,
  BrandColors,
  OgImageConfig,
  PressConfig,
} from './types/brand-config';
