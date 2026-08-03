import { describe, expect, it } from 'vitest';

import { createMomThemeRuntime } from '../../packages/design-tokens/src/runtime';

class MediaQueryStub {
  matches = false;
  listener?: (event: { matches: boolean }) => void;

  addEventListener(_type: 'change', listener: (event: { matches: boolean }) => void): void {
    this.listener = listener;
  }

  emit(matches: boolean): void {
    this.matches = matches;
    this.listener?.({ matches });
  }

  removeEventListener(_type: 'change', listener: (event: { matches: boolean }) => void): void {
    if (this.listener === listener) this.listener = undefined;
  }
}

function documentStub() {
  const classes = new Set<string>();
  const document = {
    documentElement: {
      classList: {
        toggle(name: string, force?: boolean) {
          if (force) classes.add(name);
          else classes.delete(name);
          return classes.has(name);
        },
      },
      dataset: {} as Record<string, string | undefined>,
      style: { colorScheme: '' },
    },
  };
  return { classes, document };
}

describe('MOM Theme Runtime', () => {
  it('在挂载前同步 LIGHT/DARK/SYSTEM 根属性并跟随系统变化', () => {
    const media = new MediaQueryStub();
    const current = documentStub();
    const runtime = createMomThemeRuntime({
      channel: 'ADMIN',
      document: current.document,
      matchMedia: () => media,
      mode: 'LIGHT',
    });

    expect(current.document.documentElement.dataset).toMatchObject({
      momChannel: 'ADMIN',
      momDensity: 'COMFORTABLE',
      momTheme: 'LIGHT',
      momThemeMode: 'LIGHT',
    });

    runtime.setMode('DARK');
    expect(current.classes.has('dark')).toBe(true);
    expect(current.document.documentElement.style.colorScheme).toBe('dark');

    runtime.setMode('SYSTEM');
    media.emit(false);
    expect(runtime.snapshot().resolvedTheme).toBe('LIGHT');
    media.emit(true);
    expect(runtime.snapshot().resolvedTheme).toBe('DARK');

    runtime.destroy();
    media.emit(false);
    expect(runtime.snapshot().resolvedTheme).toBe('DARK');
  });

  it('拒绝 Portal Compact 且不共享应用状态', () => {
    const first = documentStub();
    const second = documentStub();
    const diagnostics: string[] = [];
    const portal = createMomThemeRuntime({
      channel: 'PORTAL',
      density: 'COMPACT',
      document: first.document,
      matchMedia: () => new MediaQueryStub(),
      onDiagnostic: (message) => diagnostics.push(message),
    });
    const admin = createMomThemeRuntime({
      channel: 'ADMIN',
      document: second.document,
      matchMedia: () => new MediaQueryStub(),
    });

    expect(portal.snapshot().density).toBe('COMFORTABLE');
    expect(diagnostics).toHaveLength(1);
    admin.setDensity('COMPACT');
    expect(admin.snapshot().density).toBe('COMPACT');
    expect(portal.snapshot().density).toBe('COMFORTABLE');
  });
});
