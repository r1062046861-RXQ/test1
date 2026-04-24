import { describe, expect, it } from 'vitest';
import { RUNTIME_ASSET_MANIFEST, TOTAL_RUNTIME_ASSET_BYTES } from './runtimeAssetManifest';

describe('runtimeAssetManifest', () => {
  it('contains runtime asset entries with a matching total byte count', () => {
    const summedBytes = RUNTIME_ASSET_MANIFEST.reduce((sum, entry) => sum + entry.bytes, 0);
    const stages = new Set(RUNTIME_ASSET_MANIFEST.map((entry) => entry.stage));
    const stageSummedBytes = RUNTIME_ASSET_MANIFEST.reduce((sum, entry) => sum + entry.bytes, 0);

    expect(RUNTIME_ASSET_MANIFEST.length).toBeGreaterThan(0);
    expect(summedBytes).toBe(TOTAL_RUNTIME_ASSET_BYTES);
    expect(stageSummedBytes).toBe(TOTAL_RUNTIME_ASSET_BYTES);
    expect(stages.has('critical')).toBe(true);
    expect(stages.has('static')).toBe(true);
    expect(stages.has('gif')).toBe(true);
    expect(RUNTIME_ASSET_MANIFEST.some((entry) => entry.path === '/assets/background_main_menu.png')).toBe(true);
    expect(
      RUNTIME_ASSET_MANIFEST.some(
        (entry) => entry.path === '/assets/background_main_menu.png' && entry.stage === 'critical',
      ),
    ).toBe(true);
  });
});
