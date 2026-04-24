import {
  RUNTIME_ASSET_MANIFEST,
  TOTAL_RUNTIME_ASSET_BYTES,
  type RuntimeAssetManifestEntry,
  type RuntimeAssetStage,
} from '../data/runtimeAssetManifest';
import { preloadImageAsset, type PreloadImageAssetOptions } from '../utils/progressiveAssets';

export type RuntimeAssetLoadingStage = RuntimeAssetStage | 'done';

export type AssetLoadingProgress = {
  loadedBytes: number;
  totalBytes: number;
  loadedCount: number;
  totalCount: number;
  finished: boolean;
  visible: boolean;
  currentStage: RuntimeAssetLoadingStage;
  speedBytesPerSecond: number;
};

type Subscriber = () => void;

type RuntimeAssetPreloadFn = (
  path: string,
  options?: PreloadImageAssetOptions,
) => Promise<boolean>;

type RuntimeAssetLoadingControllerOptions = {
  manifest: RuntimeAssetManifestEntry[];
  totalBytes?: number;
  preloadAsset?: RuntimeAssetPreloadFn;
  hideDelayMs?: number;
  speedWindowMs?: number;
  speedTickMs?: number;
};

type StageLoadConfig = {
  fetchPriority: 'high' | 'low';
  parallelCount: number;
};

const STAGE_ORDER: RuntimeAssetStage[] = ['critical', 'static', 'gif'];

const STAGE_LOAD_CONFIG: Record<RuntimeAssetStage, StageLoadConfig> = {
  critical: { fetchPriority: 'high', parallelCount: 4 },
  static: { fetchPriority: 'low', parallelCount: 4 },
  gif: { fetchPriority: 'low', parallelCount: 2 },
};

const HIDE_DELAY_MS = 900;
const SPEED_WINDOW_MS = 3000;
const SPEED_TICK_MS = 250;

const getInitialStage = (manifest: RuntimeAssetManifestEntry[]): RuntimeAssetLoadingStage => {
  const firstEntry = manifest.find((entry) => STAGE_ORDER.includes(entry.stage));
  return firstEntry?.stage ?? 'done';
};

const sumMapValues = (map: Map<string, number>) => Array.from(map.values()).reduce((sum, value) => sum + value, 0);

const shallowEqualProgress = (left: AssetLoadingProgress, right: AssetLoadingProgress) =>
  left.loadedBytes === right.loadedBytes &&
  left.totalBytes === right.totalBytes &&
  left.loadedCount === right.loadedCount &&
  left.totalCount === right.totalCount &&
  left.finished === right.finished &&
  left.visible === right.visible &&
  left.currentStage === right.currentStage &&
  left.speedBytesPerSecond === right.speedBytesPerSecond;

export const createRuntimeAssetLoadingController = ({
  manifest,
  totalBytes = manifest.reduce((sum, entry) => sum + entry.bytes, 0),
  preloadAsset = preloadImageAsset,
  hideDelayMs = HIDE_DELAY_MS,
  speedWindowMs = SPEED_WINDOW_MS,
  speedTickMs = SPEED_TICK_MS,
}: RuntimeAssetLoadingControllerOptions) => {
  const stageEntries = STAGE_ORDER.reduce<Record<RuntimeAssetStage, RuntimeAssetManifestEntry[]>>(
    (groups, stage) => {
      groups[stage] = manifest.filter((entry) => entry.stage === stage);
      return groups;
    },
    {
      critical: [],
      static: [],
      gif: [],
    },
  );

  let snapshot: AssetLoadingProgress = {
    loadedBytes: 0,
    totalBytes,
    loadedCount: 0,
    totalCount: manifest.length,
    finished: manifest.length === 0,
    visible: manifest.length > 0,
    currentStage: getInitialStage(manifest),
    speedBytesPerSecond: 0,
  };

  const subscribers = new Set<Subscriber>();
  const completedEntries = new Set<string>();
  const partialProgress = new Map<string, number>();
  const speedSamples: Array<{ timestamp: number; bytes: number }> = [];

  let completedBytes = 0;
  let started = false;
  let startPromise: Promise<void> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let speedTimer: ReturnType<typeof setInterval> | null = null;

  const now = () => Date.now();

  const emit = () => {
    subscribers.forEach((subscriber) => subscriber());
  };

  const setSnapshot = (nextSnapshot: AssetLoadingProgress) => {
    if (shallowEqualProgress(snapshot, nextSnapshot)) {
      return;
    }
    snapshot = nextSnapshot;
    emit();
  };

  const pruneSpeedSamples = (timestamp: number) => {
    while (speedSamples.length > 0 && timestamp - speedSamples[0]!.timestamp > speedWindowMs) {
      speedSamples.shift();
    }
  };

  const recomputeSpeed = (timestamp: number) => {
    pruneSpeedSamples(timestamp);
    if (snapshot.finished || speedSamples.length === 0) {
      return 0;
    }
    const bytes = speedSamples.reduce((sum, sample) => sum + sample.bytes, 0);
    return Math.max(0, Math.round((bytes / speedWindowMs) * 1000));
  };

  const updateDerivedProgress = (overrides?: Partial<AssetLoadingProgress>) => {
    const nextLoadedBytes = Math.min(totalBytes, completedBytes + sumMapValues(partialProgress));
    const nextSnapshot: AssetLoadingProgress = {
      ...snapshot,
      loadedBytes: nextLoadedBytes,
      speedBytesPerSecond: recomputeSpeed(now()),
      ...overrides,
    };
    setSnapshot(nextSnapshot);
  };

  const recordProgressDelta = (deltaBytes: number) => {
    if (deltaBytes <= 0) {
      return;
    }
    speedSamples.push({ timestamp: now(), bytes: deltaBytes });
  };

  const handleEntryProgress = (entry: RuntimeAssetManifestEntry, entryLoadedBytes: number) => {
    const clampedBytes = Math.max(0, Math.min(entry.bytes, entryLoadedBytes));
    const previousBytes = partialProgress.get(entry.path) ?? 0;
    if (clampedBytes <= previousBytes) {
      return;
    }

    partialProgress.set(entry.path, clampedBytes);
    recordProgressDelta(clampedBytes - previousBytes);
    updateDerivedProgress();
  };

  const completeEntry = (entry: RuntimeAssetManifestEntry, loaded: boolean) => {
    partialProgress.delete(entry.path);

    let nextLoadedCount = snapshot.loadedCount;
    if (loaded && !completedEntries.has(entry.path)) {
      completedEntries.add(entry.path);
      completedBytes += entry.bytes;
      nextLoadedCount += 1;
    }

    updateDerivedProgress({ loadedCount: nextLoadedCount });
  };

  const stopSpeedTicker = () => {
    if (speedTimer !== null) {
      clearInterval(speedTimer);
      speedTimer = null;
    }
  };

  const startSpeedTicker = () => {
    if (speedTimer !== null) {
      return;
    }
    speedTimer = setInterval(() => {
      updateDerivedProgress();
    }, speedTickMs);
  };

  const finalizeLoading = () => {
    stopSpeedTicker();
    updateDerivedProgress({
      currentStage: 'done',
      finished: true,
      speedBytesPerSecond: 0,
    });

    if (hideTimer !== null) {
      clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(() => {
      setSnapshot({
        ...snapshot,
        visible: false,
      });
    }, hideDelayMs);
  };

  const preloadGroup = async (entries: RuntimeAssetManifestEntry[], config: StageLoadConfig) => {
    let nextIndex = 0;
    const worker = async () => {
      while (true) {
        const entry = entries[nextIndex];
        nextIndex += 1;
        if (!entry) {
          return;
        }

        const loaded = await preloadAsset(entry.path, {
          fetchPriority: config.fetchPriority,
          expectedBytes: entry.bytes,
          onProgress: (entryLoadedBytes) => handleEntryProgress(entry, entryLoadedBytes),
        });

        completeEntry(entry, loaded);
      }
    };

    const workerCount = Math.max(1, Math.min(config.parallelCount, entries.length));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
  };

  const start = () => {
    if (started) {
      return startPromise ?? Promise.resolve();
    }

    started = true;
    if (manifest.length === 0) {
      finalizeLoading();
      startPromise = Promise.resolve();
      return startPromise;
    }

    startSpeedTicker();
    startPromise = (async () => {
      for (const stage of STAGE_ORDER) {
        const entries = stageEntries[stage];
        if (entries.length === 0) {
          continue;
        }

        setSnapshot({
          ...snapshot,
          currentStage: stage,
        });
        await preloadGroup(entries, STAGE_LOAD_CONFIG[stage]);
      }

      finalizeLoading();
    })();

    return startPromise;
  };

  const subscribe = (subscriber: Subscriber) => {
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  };

  const getSnapshot = () => snapshot;

  const dispose = () => {
    stopSpeedTicker();
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    subscribers.clear();
  };

  return {
    dispose,
    getSnapshot,
    start,
    subscribe,
  };
};

export const runtimeAssetLoadingController = createRuntimeAssetLoadingController({
  manifest: RUNTIME_ASSET_MANIFEST,
  totalBytes: TOTAL_RUNTIME_ASSET_BYTES,
});
