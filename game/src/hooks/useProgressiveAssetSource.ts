import { useEffect, useMemo, useState } from 'react';
import { resolveAssetUrl } from '../utils/assets';

const GIF_PATTERN = /\.gif(?:$|[?#])/i;

const isAnimatedGif = (src: string) => GIF_PATTERN.test(src);

export function useProgressiveAssetSource(
  animatedPath?: string | null,
  posterPath?: string | null,
  fallbackPath?: string | null,
) {
  const animatedSrc = useMemo(() => resolveAssetUrl(animatedPath || fallbackPath), [animatedPath, fallbackPath]);
  const posterSrc = useMemo(() => resolveAssetUrl(posterPath || fallbackPath), [posterPath, fallbackPath]);
  const [displaySrc, setDisplaySrc] = useState(() => posterSrc || animatedSrc);
  const [animatedReady, setAnimatedReady] = useState(() => !animatedSrc || !posterSrc || !isAnimatedGif(animatedSrc));

  useEffect(() => {
    if (!animatedSrc) {
      setDisplaySrc('');
      setAnimatedReady(false);
      return undefined;
    }

    if (!posterSrc || !isAnimatedGif(animatedSrc) || posterSrc === animatedSrc) {
      setDisplaySrc(animatedSrc);
      setAnimatedReady(true);
      return undefined;
    }

    let cancelled = false;
    const preloader = new window.Image();

    setDisplaySrc(posterSrc);
    setAnimatedReady(false);

    preloader.onload = () => {
      if (cancelled) return;
      setDisplaySrc(animatedSrc);
      setAnimatedReady(true);
    };

    preloader.onerror = () => {
      if (cancelled) return;
      setDisplaySrc(posterSrc);
      setAnimatedReady(false);
    };

    preloader.src = animatedSrc;

    return () => {
      cancelled = true;
      preloader.onload = null;
      preloader.onerror = null;
    };
  }, [animatedSrc, posterSrc]);

  return {
    animatedReady,
    animatedSrc,
    displaySrc,
    posterSrc,
  };
}
