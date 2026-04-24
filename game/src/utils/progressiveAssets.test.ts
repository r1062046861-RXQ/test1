import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getProgressiveAssetSources,
  isAssetPreloaded,
  preloadImageAsset,
  primeProgressiveAsset,
  resetProgressiveAssetCache,
} from './progressiveAssets';

class FakeImage {
  static created = 0;

  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  decoding?: string;
  fetchPriority?: 'high' | 'low' | 'auto';

  private _src = '';

  constructor() {
    FakeImage.created += 1;
  }

  set src(value: string) {
    this._src = value;
    queueMicrotask(() => {
      if (value.includes('broken')) {
        this.onerror?.();
        return;
      }
      this.onload?.();
    });
  }

  get src() {
    return this._src;
  }
}

const createFetchResponse = (chunks: number[]) => {
  const totalBytes = chunks.reduce((sum, chunk) => sum + chunk, 0);
  const queue = chunks.map((chunk) => ({ done: false, value: new Uint8Array(chunk) }));

  return {
    ok: true,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-length' ? String(totalBytes) : null),
    },
    body: {
      getReader: () => ({
        read: vi.fn(async () => queue.shift() ?? { done: true, value: undefined }),
      }),
    },
  } as unknown as Response;
};

afterEach(() => {
  resetProgressiveAssetCache();
  vi.unstubAllGlobals();
  FakeImage.created = 0;
});

describe('progressiveAssets', () => {
  it('normalizes animated and poster sources through the asset resolver', () => {
    const sources = getProgressiveAssetSources('/assets/cards_enemy/91.gif', '/assets/cards_enemy/91-poster.png');

    expect(sources.animatedSrc).toBe('/assets/cards_enemy/91.gif');
    expect(sources.posterSrc).toBe('/assets/cards_enemy/91-poster.png');
  });

  it('deduplicates repeated asset preloads through a shared cache', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => createFetchResponse([64, 64])));

    const [first, second] = await Promise.all([
      preloadImageAsset('/assets/cards_enemy/91.gif', { expectedBytes: 128 }),
      preloadImageAsset('/assets/cards_enemy/91.gif', { expectedBytes: 128 }),
    ]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(isAssetPreloaded('/assets/cards_enemy/91.gif')).toBe(true);
  });

  it('reports streaming progress while loading bytes via fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => createFetchResponse([32, 48, 48])));

    const progressEvents: Array<{ loaded: number; total?: number }> = [];
    const loaded = await preloadImageAsset('/assets/cards_enemy/90.gif', {
      expectedBytes: 128,
      onProgress: (loadedBytes, totalBytes) => {
        progressEvents.push({ loaded: loadedBytes, total: totalBytes });
      },
    });

    expect(loaded).toBe(true);
    expect(progressEvents[progressEvents.length - 1]).toEqual({ loaded: 128, total: 128 });
    expect(progressEvents.some((entry) => entry.loaded === 32)).toBe(true);
    expect(progressEvents.some((entry) => entry.loaded === 80)).toBe(true);
  });

  it('falls back to Image preloading when fetch cannot be used', async () => {
    vi.stubGlobal('Image', FakeImage);
    vi.stubGlobal('fetch', undefined);

    const loaded = await preloadImageAsset('data:image/gif;base64,AAAA');

    expect(loaded).toBe(true);
    expect(FakeImage.created).toBe(1);
  });

  it('primes poster and animated GIF together while reusing the same animated request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => createFetchResponse([64, 64])));

    const first = await primeProgressiveAsset('/assets/cards_enemy/91.gif', '/assets/cards_enemy/91-poster.png');
    const second = await primeProgressiveAsset('/assets/cards_enemy/91.gif', '/assets/cards_enemy/91-poster.png');

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(isAssetPreloaded('/assets/cards_enemy/91.gif')).toBe(true);
    expect(isAssetPreloaded('/assets/cards_enemy/91-poster.png')).toBe(true);
  });
});
