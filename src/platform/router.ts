export type AppRoute =
  | { kind: 'home' }
  | { kind: 'game'; slug: string }
  | { kind: 'not_found'; path: string };

export function normalizeBasePath(raw?: string): string {
  const cleaned = (raw ?? '').trim().replace(/^\/+|\/+$/g, '');
  return cleaned ? `/${cleaned}/` : '/';
}

export function stripBasePath(pathname: string, basePath = '/'): string {
  const base = normalizeBasePath(basePath);
  const path = pathname || '/';

  if (base === '/') {
    const clean = path.replace(/\/+$/, '');
    return clean === '' ? '/' : clean;
  }

  const baseNoTrailing = base.slice(0, -1); // e.g. "/oddlot"
  if (path === baseNoTrailing || path === base) {
    return '/';
  }

  if (path.startsWith(base)) {
    const rel = path.slice(base.length - 1).replace(/\/+$/, '');
    return rel === '' ? '/' : rel;
  }

  const clean = path.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

export function parseAppRoute(pathname: string, basePath = '/'): AppRoute {
  const rel = stripBasePath(pathname, basePath);
  if (rel === '/' || rel === '/index.html') {
    return { kind: 'home' };
  }

  const match = /^\/games\/([a-z0-9-]+)$/i.exec(rel);
  if (match) {
    return { kind: 'game', slug: match[1].toLowerCase() };
  }

  return { kind: 'not_found', path: rel };
}

export function buildAppUrl(
  route: AppRoute,
  basePath = '/',
  search = '',
  hash = ''
): string {
  const base = normalizeBasePath(basePath);
  let suffix = '';
  if (route.kind === 'game') {
    suffix = `games/${encodeURIComponent(route.slug)}`;
  } else if (route.kind === 'not_found') {
    suffix = route.path.replace(/^\/+/, '');
  }

  const cleanSearch = search
    ? search.startsWith('?')
      ? search
      : `?${search}`
    : '';
  const cleanHash = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : '';
  return `${base}${suffix}${cleanSearch}${cleanHash}`;
}

export function resolveGitHubRepositoryUrl(
  configuredUrl?: string,
  loc?: { hostname: string; pathname: string }
): string | null {
  const trimmed = (configuredUrl ?? '').trim();
  if (trimmed) return trimmed;

  if (loc && loc.hostname.endsWith('.github.io')) {
    const owner = loc.hostname.replace(/\.github\.io$/i, '');
    const firstSegment = loc.pathname.split('/').filter(Boolean)[0];
    if (owner && firstSegment) {
      return `https://github.com/${owner}/${firstSegment}`;
    }
    if (owner) {
      return `https://github.com/${owner}`;
    }
  }

  return null;
}
