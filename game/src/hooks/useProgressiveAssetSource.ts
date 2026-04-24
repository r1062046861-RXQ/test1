import { useEffect, useMemo, useState } from 'react';
import {
  getProgressiveAssetSources,
  isAnimatedGifSource,
  isAssetPreloaded,
  preloadImageAsset,
} from '../utils/progressiveAssets';

export function useProgressiveAssetSource(
  animatedPath?: string | null,
  posterPath?: string | null,
  fallbackPath?: string | null,
) {
  const { animatedSrc, posterSrc } = useMemo(
    () => getProgressiveAssetSources(animatedPath, posterPath, fallbackPath),
    [animatedPath, posterPath, fallbackPath],
  );
  const initiallyAnimatedReady =
    !animatedSrc || !posterSrc || !isAnimatedGifSource(animatedSrc) || isAssetPreloaded(animatedSrc);
  const [displaySrc, setDisplaySrc] = useState(() =>
    initiallyAnimatedReady ? animatedSrc || posterSrc : posterSrc || animatedSrc,
  );
  const [animatedReady, setAnimatedReady] = useState(() => initiallyAnimatedReady);

  useEffect(() => {
    if (!animatedSrc) {
      setDisplaySrc('');
      setAnimatedReady(false);
      return undefined;
    }

    if (!posterSrc || !isAnimatedGifSource(animatedSrc) || posterSrc === animatedSrc) {
      setDisplaySrc(animatedSrc);
      setAnimatedReady(true);
      return undefined;
    }

    let cancelled = false;
    setDisplaySrc(posterSrc);
    const alreadyReady = isAssetPreloaded(animatedSrc);
    setAnimatedReady(alreadyReady);

    if (alreadyReady) {
      setDisplaySrc(animatedSrc);
      return undefined;
    }

    void preloadImageAsset(animatedSrc).then((loaded) => {
      if (cancelled) return;
      if (loaded) {
        setDisplaySrc(animatedSrc);
        setAnimatedReady(true);
        return;
      }
      setDisplaySrc(posterSrc);
      setAnimatedReady(false);
    });

    return () => {
      cancelled = true;
    };
  }, [animatedSrc, posterSrc]);

  return {
    animatedReady,
    animatedSrc,
    displaySrc,
    posterSrc,
  };
}
