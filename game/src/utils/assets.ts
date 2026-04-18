const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

export function resolveAssetUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('#') || ABSOLUTE_URL_PATTERN.test(path)) {
    return path;
  }

  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

  if (normalizedBase !== '/' && path.startsWith(normalizedBase)) {
    return path;
  }

  return normalizedBase === '/' ? `/${normalizedPath}` : `${normalizedBase}${normalizedPath}`;
}

export function resolveAssetBackground(path?: string | null): string {
  const assetUrl = resolveAssetUrl(path);
  return assetUrl ? `url("${assetUrl}")` : 'none';
}
