async function startApplication(): Promise<void> {
  const { bootstrap } = await import('./bootstrap');
  await bootstrap();
}

void startApplication();
