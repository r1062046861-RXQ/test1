import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRuntimeId } from './id';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createRuntimeId', () => {
  it('uses crypto.randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'known-id');
    vi.stubGlobal('crypto', {
      randomUUID,
      getRandomValues: vi.fn(),
    });

    expect(createRuntimeId('enemy_')).toBe('enemy_known-id');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = index;
        }
        return bytes;
      },
    });

    expect(createRuntimeId()).toMatch(UUID_PATTERN);
  });

  it('falls back to Math.random when crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);

    expect(createRuntimeId()).toMatch(UUID_PATTERN);
  });
});
