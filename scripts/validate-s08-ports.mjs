import { readFile } from 'node:fs/promises';

const applications = [
  ['apps/mom-admin/vite.config.ts', 5555, 'mom-admin-web', 'INTERNAL'],
  ['apps/supplier-portal/vite.config.ts', 5556, 'mom-supplier-web', 'SUPPLIER'],
  ['apps/customer-portal/vite.config.ts', 5557, 'mom-customer-web', 'CUSTOMER'],
];

for (const [vitePath, port, clientId, userType] of applications) {
  const vite = await readFile(vitePath, 'utf8');
  const runtime = await readFile(vitePath.replace('vite.config.ts', 'src/runtime.ts'), 'utf8');
  if (!vite.includes(`port: ${port}`)) throw new Error(`${vitePath} must preserve port ${port}`);
  if (!runtime.includes(clientId) || !runtime.includes(userType)) {
    throw new Error(`${vitePath} must preserve ${clientId}/${userType}`);
  }
}
