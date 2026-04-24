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

  it('deduplicates repeated image preloads through a shared cache', async () => {
    vi.stubGlobal('Image', FakeImage);

    const [first, second] = await Promise.all([
      preloadImageAsset('/assets/cards_enemy/91.gif'),
      preloadImageAsset('/assets/cards_enemy/91.gif'),
    ]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(FakeImage.created).toBe(1);
    expect(isAssetPreloaded('/assets/cards_enemy/91.gif')).toBe(true);
  });

  it('primes poster and animated GIF together while reusing the same animated request', async () => {
    vi.stubGlobal('Image', FakeImage);

    const first = await primeProgressiveAsset('/assets/cards_enemy/91.gif', '/assets/cards_enemy/91-poster.png');
    const second = await primeProgressiveAsset('/assets/cards_enemy/91.gif', '/assets/cards_enemy/91-poster.png');

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(FakeImage.created).toBe(2);
    expect(isAssetPreloaded('/assets/cards_enemy/91.gif')).toBe(true);
    expect(isAssetPreloaded('/assets/cards_enemy/91-poster.png')).toBe(true);
  });
});
