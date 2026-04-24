import { resolveAssetUrl } from './assets';

const GIF_PATTERN = /\.gif(?:$|[?#])/i;
const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

type AssetLoadState = 'pending' | 'loaded' | 'error';
type AssetProgressListener = (loadedBytes: number, totalBytes?: number) => void;

export type PreloadImageAssetOptions = {
  fetchPriority?: 'high' | 'low' | 'auto';
  expectedBytes?: number;
  onProgress?: AssetProgressListener;
};

type ImageLike = {
  decoding?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  onload: null | (() => void);
  onerror: null | (() => void);
  src: string;
};

type ImageCtor = new () => ImageLike;

type AssetRequestRecord = {
  state: AssetLoadState;
  promise: Promise<boolean>;
  loadedBytes: number;
  totalBytes?: number;
  listeners: Set<AssetProgressListener>;
};

const assetRequests = new Map<string, AssetRequestRecord>();

const getImageCtor = (): ImageCtor | null => {
  if (typeof Image !== 'undefined') {
    return Image as unknown as ImageCtor;
  }
  return null;
};

const getKnownBytes = (record: AssetRequestRecord) => record.totalBytes ?? record.loadedBytes;

const notifyListeners = (record: AssetRequestRecord) => {
  const knownBytes = getKnownBytes(record);
  record.listeners.forEach((listener) => listener(record.loadedBytes, knownBytes || undefined));
};

const attachProgressListener = (record: AssetRequestRecord, listener?: AssetProgressListener) => {
  if (!listener) return;
  record.listeners.add(listener);
  const knownBytes = getKnownBytes(record);
  listener(record.loadedBytes, knownBytes || undefined);
};

const updateRecordProgress = (record: AssetRequestRecord, loadedBytes: number, totalBytes?: number) => {
  record.loadedBytes = Math.max(record.loadedBytes, loadedBytes);
  if (typeof totalBytes === 'number' && Number.isFinite(totalBytes) && totalBytes > 0) {
    record.totalBytes = totalBytes;
  }
  notifyListeners(record);
};

const canStreamFetchAsset = (assetUrl: string) => {
  if (typeof fetch !== 'function') {
    return false;
  }
  if (!assetUrl || assetUrl.startsWith('data:') || assetUrl.startsWith('blob:') || assetUrl.startsWith('#')) {
    return false;
  }
  if (ABSOLUTE_URL_PATTERN.test(assetUrl) && typeof window !== 'undefined') {
    try {
      const resolved = new URL(assetUrl, window.location.href);
      return resolved.origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return true;
};

const readResponseWithProgress = async (
  response: Response,
  record: AssetRequestRecord,
  expectedBytes?: number,
) => {
  const headerLength = response.headers.get('content-length');
  const resolvedTotalBytes = expectedBytes ?? (headerLength ? Number(headerLength) : undefined);
  if (typeof resolvedTotalBytes === 'number' && Number.isFinite(resolvedTotalBytes) && resolvedTotalBytes > 0) {
    record.totalBytes = resolvedTotalBytes;
  }

  if (response.body?.getReader) {
    const reader = response.body.getReader();
    let streamedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      streamedBytes += value?.byteLength ?? 0;
      updateRecordProgress(record, Math.min(streamedBytes, record.totalBytes ?? streamedBytes), record.totalBytes);
    }

    updateRecordProgress(
      record,
      Math.min(record.totalBytes ?? streamedBytes, streamedBytes),
      record.totalBytes ?? streamedBytes,
    );
    return true;
  }

  const payload = await response.arrayBuffer();
  const bytes = payload.byteLength;
  updateRecordProgress(record, Math.min(record.totalBytes ?? bytes, bytes), record.totalBytes ?? bytes);
  return true;
};

const preloadWithImage = (
  assetUrl: string,
  record: AssetRequestRecord,
  options?: PreloadImageAssetOptions,
) => {
  const ImageCtor = getImageCtor();
  if (!ImageCtor) {
    return Promise.resolve(false);
  }

  const image = new ImageCtor();
  image.decoding = 'async';
  image.fetchPriority = options?.fetchPriority ?? 'high';

  return new Promise<boolean>((resolve) => {
    image.onload = () => {
      const finalBytes = options?.expectedBytes ?? record.totalBytes ?? record.loadedBytes;
      updateRecordProgress(record, finalBytes, finalBytes);
      resolve(true);
    };

    image.onerror = () => {
      resolve(false);
    };

    image.src = assetUrl;
  });
};

const preloadWithFetch = async (
  assetUrl: string,
  record: AssetRequestRecord,
  options?: PreloadImageAssetOptions,
) => {
  if (!canStreamFetchAsset(assetUrl)) {
    return preloadWithImage(assetUrl, record, options);
  }

  try {
    const response = await fetch(assetUrl, {
      cache: 'default',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      return preloadWithImage(assetUrl, record, options);
    }

    return await readResponseWithProgress(response, record, options?.expectedBytes);
  } catch {
    return preloadWithImage(assetUrl, record, options);
  }
};

export const isAnimatedGifSource = (src: string) => GIF_PATTERN.test(src);

export const getProgressiveAssetSources = (
  animatedPath?: string | null,
  posterPath?: string | null,
  fallbackPath?: string | null,
) => {
  const animatedSrc = resolveAssetUrl(animatedPath || fallbackPath);
  const posterSrc = resolveAssetUrl(posterPath || fallbackPath);

  return {
    animatedSrc,
    posterSrc,
  };
};

export const isAssetPreloaded = (path?: string | null) => {
  const assetUrl = resolveAssetUrl(path);
  return assetUrl ? assetRequests.get(assetUrl)?.state === 'loaded' : false;
};

export const preloadImageAsset = (path?: string | null, options?: PreloadImageAssetOptions) => {
  const assetUrl = resolveAssetUrl(path);
  if (!assetUrl) {
    return Promise.resolve(false);
  }

  const existingRecord = assetRequests.get(assetUrl);
  if (existingRecord) {
    if (
      typeof options?.expectedBytes === 'number' &&
      Number.isFinite(options.expectedBytes) &&
      options.expectedBytes > 0 &&
      !existingRecord.totalBytes
    ) {
      existingRecord.totalBytes = options.expectedBytes;
    }
    attachProgressListener(existingRecord, options?.onProgress);
    if (existingRecord.state === 'loaded') {
      const finalBytes = options?.expectedBytes ?? existingRecord.totalBytes ?? existingRecord.loadedBytes;
      if (finalBytes > 0) {
        updateRecordProgress(existingRecord, finalBytes, finalBytes);
      }
      return Promise.resolve(true);
    }
    return existingRecord.promise;
  }

  const record: AssetRequestRecord = {
    state: 'pending',
    promise: Promise.resolve(false),
    loadedBytes: 0,
    totalBytes:
      typeof options?.expectedBytes === 'number' && Number.isFinite(options.expectedBytes) && options.expectedBytes > 0
        ? options.expectedBytes
        : undefined,
    listeners: new Set<AssetProgressListener>(),
  };

  attachProgressListener(record, options?.onProgress);

  record.promise = preloadWithFetch(assetUrl, record, options).then((loaded) => {
    if (loaded) {
      record.state = 'loaded';
      const finalBytes = record.totalBytes ?? options?.expectedBytes ?? record.loadedBytes;
      if (finalBytes > 0) {
        updateRecordProgress(record, finalBytes, finalBytes);
      }
      return true;
    }

    record.state = 'error';
    assetRequests.delete(assetUrl);
    return false;
  });

  assetRequests.set(assetUrl, record);
  return record.promise;
};

export const primeProgressiveAsset = (
  animatedPath?: string | null,
  posterPath?: string | null,
  fallbackPath?: string | null,
) => {
  const { animatedSrc, posterSrc } = getProgressiveAssetSources(animatedPath, posterPath, fallbackPath);

  if (!animatedSrc) {
    return Promise.resolve(false);
  }

  if (posterSrc && posterSrc !== animatedSrc) {
    void preloadImageAsset(posterSrc);
  }

  if (!posterSrc || !isAnimatedGifSource(animatedSrc) || posterSrc === animatedSrc) {
    return preloadImageAsset(animatedSrc);
  }

  return preloadImageAsset(animatedSrc);
};

export const preloadRuntimeAssetBatch = async (
  assetPaths: Array<{ path: string; bytes?: number }>,
  onProgress?: (loadedCount: number, totalCount: number, assetPath: string, loaded: boolean) => void,
) => {
  const totalCount = assetPaths.length;
  let loadedCount = 0;

  for (const asset of assetPaths) {
    const loaded = await preloadImageAsset(asset.path, {
      fetchPriority: 'low',
      expectedBytes: asset.bytes,
    });
    loadedCount += 1;
    onProgress?.(loadedCount, totalCount, asset.path, loaded);
  }
};

export const resetProgressiveAssetCache = () => {
  assetRequests.clear();
};
