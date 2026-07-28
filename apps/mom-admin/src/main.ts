import { initPreferences } from '@vben/preferences';

import { overridesPreferences } from './preferences';

async function initApplication(): Promise<void> {
  const environment = import.meta.env.PROD ? 'prod' : 'dev';
  const version = import.meta.env.VITE_APP_VERSION ?? '0.1.0';
  const namespace = `mom-admin-${version}-${environment}`;

  await initPreferences({
    namespace,
    overrides: overridesPreferences,
  });

  const { bootstrap } = await import('./bootstrap');
  await bootstrap();
}

void initApplication();
