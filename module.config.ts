import type { ModuleConfig } from '@/core/lib/module/module-config';

const config: ModuleConfig = {
  id: 'core-brand',
  category: 'primitive',
  routers: [],
  schema: [],
  serverInit: [],
  jobs: [],
  layoutWidgets: [],
  seed: [],
  pageWidgets: [],
  navItems: [],
  projectFiles: [
    'config/brand.ts',
    'brand/icon.svg',
  ],
};

export default config;
