import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

describe('S00 可审计基线', () => {
  it('冻结六个 IAM URL 且不重复', async () => {
    const baseline = JSON.parse(
      await readFile(resolve(root, 'quality/s00-contract-baseline.json'), 'utf8'),
    ) as { iamNavigation: Array<{ path: string }> };
    const paths = baseline.iamNavigation.map(({ path }) => path);

    expect(paths).toHaveLength(6);
    expect(new Set(paths).size).toBe(6);
    expect(paths.every((path) => path.startsWith('/iam/'))).toBe(true);
  });

  it('为三应用保留互斥的 Client 和 user_type', async () => {
    const baseline = JSON.parse(
      await readFile(resolve(root, 'quality/s00-contract-baseline.json'), 'utf8'),
    ) as { applications: Array<{ clientId: string; userType: string }> };

    expect(new Set(baseline.applications.map(({ clientId }) => clientId)).size).toBe(3);
    expect(baseline.applications.map(({ userType }) => userType).sort()).toEqual([
      'CUSTOMER',
      'INTERNAL',
      'SUPPLIER',
    ]);
  });
});
