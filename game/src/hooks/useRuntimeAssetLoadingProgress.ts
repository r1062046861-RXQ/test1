import { useEffect, useMemo, useState } from 'react';
import {
  RUNTIME_ASSET_MANIFEST,
  TOTAL_RUNTIME_ASSET_BYTES,
  type RuntimeAssetManifestEntry,
} from '../data/runtimeAssetManifest';
import { preloadImageAsset } from '../utils/progressiveAssets';

const PRIORITY_ASSET_PATHS = new Set([
  '/assets/background_main_menu.png',
  '/assets/constitutions/balanced.png',
  '/assets/constitutions/yin_deficiency.png',
  '/assets/constitutions/qi_deficiency.png',
  '/assets/author_qr/wang-yi.jpg',
  '/assets/author_qr/ren-xuanqi.jpg',
]);

type AssetLoadingProgress = {
  loadedBytes: number;
  totalBytes: number;
  loadedCount: number;
  totalCount: number;
  finished: boolean;
  visible: boolean;
};

const formatKey = (entry: RuntimeAssetManifestEntry) => `${entry.path}:${entry.bytes}`;

const splitManifestByPriority = (manifest: RuntimeAssetManifestEntry[]) => {
  const priorityEntries: RuntimeAssetManifestEntry[] = [];
  const secondaryEntries: RuntimeAssetManifestEntry[] = [];

  for (const entry of manifest) {
    if (PRIORITY_ASSET_PATHS.has(entry.path)) {
      priorityEntries.push(entry);
      continue;
    }
    secondaryEntries.push(entry);
  }

  return { priorityEntries, secondaryEntries };
};

export function useRuntimeAssetLoadingProgress(): AssetLoadingProgress {
  const { priorityEntries, secondaryEntries } = useMemo(
    () => splitManifestByPriority(RUNTIME_ASSET_MANIFEST),
    [],
  );
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadedKeys = new Set<string>();
    let fadeTimer: number | null = null;

    const markLoaded = (entry: RuntimeAssetManifestEntry, loaded: boolean) => {
      if (cancelled || !loaded) {
        return;
      }

      const key = formatKey(entry);
      if (loadedKeys.has(key)) {
        return;
      }

      loadedKeys.add(key);
      setLoadedBytes((current) => current + entry.bytes);
      setLoadedCount((current) => current + 1);
    };

    const preloadGroup = async (
      entries: RuntimeAssetManifestEntry[],
      fetchPriority: 'high' | 'low',
      parallelCount: number,
    ) => {
      let nextIndex = 0;
      const worker = async () => {
        while (!cancelled) {
          const entry = entries[nextIndex];
          nextIndex += 1;
          if (!entry) {
            return;
          }
          const loaded = await preloadImageAsset(entry.path, { fetchPriority });
          markLoaded(entry, loaded);
        }
      };

      const workerCount = Math.max(1, Math.min(parallelCount, entries.length));
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    };

    const run = async () => {
      await preloadGroup(priorityEntries, 'high', 4);
      await preloadGroup(secondaryEntries, 'low', 3);
      if (cancelled) {
        return;
      }
      setFinished(true);
      fadeTimer = window.setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
      }, 900);
    };

    void run();

    return () => {
      cancelled = true;
      if (fadeTimer !== null) {
        window.clearTimeout(fadeTimer);
      }
    };
  }, [priorityEntries, secondaryEntries]);

  return {
    loadedBytes,
    totalBytes: TOTAL_RUNTIME_ASSET_BYTES,
    loadedCount,
    totalCount: RUNTIME_ASSET_MANIFEST.length,
    finished,
    visible,
  };
}
