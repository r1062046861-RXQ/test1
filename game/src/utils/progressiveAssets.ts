import { resolveAssetUrl } from './assets';

const GIF_PATTERN = /\.gif(?:$|[?#])/i;

type AssetLoadState = 'pending' | 'loaded' | 'error';

const assetLoadState = new Map<string, AssetLoadState>();
const assetLoadPromises = new Map<string, Promise<boolean>>();

type ImageLike = {
  decoding?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  onload: null | (() => void);
  onerror: null | (() => void);
  src: string;
};

type ImageCtor = new () => ImageLike;

const getImageCtor = (): ImageCtor | null => {
  if (typeof Image !== 'undefined') {
    return Image as unknown as ImageCtor;
  }
  return null;
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
  return assetUrl ? assetLoadState.get(assetUrl) === 'loaded' : false;
};

export const preloadImageAsset = (path?: string | null) => {
  const assetUrl = resolveAssetUrl(path);
  if (!assetUrl) {
    return Promise.resolve(false);
  }

  if (assetLoadState.get(assetUrl) === 'loaded') {
    return Promise.resolve(true);
  }

  const existingPromise = assetLoadPromises.get(assetUrl);
  if (existingPromise) {
    return existingPromise;
  }

  const ImageCtor = getImageCtor();
  if (!ImageCtor) {
    return Promise.resolve(false);
  }

  assetLoadState.set(assetUrl, 'pending');

  const image = new ImageCtor();
  image.decoding = 'async';
  image.fetchPriority = 'high';

  const loadPromise = new Promise<boolean>((resolve) => {
    image.onload = () => {
      assetLoadState.set(assetUrl, 'loaded');
      resolve(true);
    };

    image.onerror = () => {
      assetLoadState.set(assetUrl, 'error');
      assetLoadPromises.delete(assetUrl);
      resolve(false);
    };

    image.src = assetUrl;
  });

  assetLoadPromises.set(assetUrl, loadPromise);
  return loadPromise;
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

export const resetProgressiveAssetCache = () => {
  assetLoadState.clear();
  assetLoadPromises.clear();
};
