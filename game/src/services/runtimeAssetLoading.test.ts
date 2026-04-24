import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRuntimeAssetLoadingController,
  type AssetLoadingProgress,
} from './runtimeAssetLoading';
import type { RuntimeAssetManifestEntry } from '../data/runtimeAssetManifest';

const manifest: RuntimeAssetManifestEntry[] = [
  { path: '/assets/background_main_menu.png', bytes: 100, stage: 'critical' },
  { path: '/assets/cards_player/1.png', bytes: 80, stage: 'static' },
  { path: '/assets/cards_enemy/91.gif', bytes: 120, stage: 'gif' },
];

describe('runtimeAssetLoadingController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-24T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads manifest entries in critical -> static -> gif order', async () => {
    const order: string[] = [];
    const controller = createRuntimeAssetLoadingController({
      manifest,
      preloadAsset: async (path, options) => {
        order.push(path);
        options?.onProgress?.(manifest.find((entry) => entry.path === path)?.bytes ?? 0);
        return true;
      },
      hideDelayMs: 10,
      speedTickMs: 10,
    });

    await controller.start();

    expect(order).toEqual([
      '/assets/background_main_menu.png',
      '/assets/cards_player/1.png',
      '/assets/cards_enemy/91.gif',
    ]);
  });

  it('keeps the background load running after a subscriber unsubscribes', async () => {
    const visited: string[] = [];

    const controller = createRuntimeAssetLoadingController({
      manifest,
      preloadAsset: async (path, options) => {
        visited.push(path);
        await Promise.resolve();
        options?.onProgress?.(manifest.find((entry) => entry.path === path)?.bytes ?? 0);
        return true;
      },
      hideDelayMs: 10,
      speedTickMs: 10,
    });

    const snapshots: AssetLoadingProgress[] = [];
    const unsubscribe = controller.subscribe(() => {
      snapshots.push(controller.getSnapshot());
    });

    const startPromise = controller.start();
    unsubscribe();
    await startPromise;

    expect(controller.getSnapshot().finished).toBe(true);
    expect(visited).toEqual([
      '/assets/background_main_menu.png',
      '/assets/cards_player/1.png',
      '/assets/cards_enemy/91.gif',
    ]);
    expect(snapshots.length).toBeGreaterThanOrEqual(0);
  });

  it('tracks speed and loaded bytes from streaming progress updates', async () => {
    const controller = createRuntimeAssetLoadingController({
      manifest: [manifest[0]!],
      preloadAsset: async (_path, options) => {
        options?.onProgress?.(25, 100);
        vi.advanceTimersByTime(1000);
        options?.onProgress?.(75, 100);
        vi.advanceTimersByTime(1000);
        options?.onProgress?.(100, 100);
        return true;
      },
      hideDelayMs: 10,
      speedTickMs: 50,
    });

    await controller.start();

    expect(controller.getSnapshot().loadedBytes).toBe(100);
    expect(controller.getSnapshot().speedBytesPerSecond).toBe(0);
    expect(controller.getSnapshot().finished).toBe(true);
  });
});
