import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import type { Context } from 'hono';

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * `STATIC_ROOT` always wins. Production without it serves `dist/`.
 * Development does not serve a leftover `dist/`, so Vite can keep port 3847.
 */
export function resolveStaticRoot(
  env: NodeJS.ProcessEnv,
  cwd = process.cwd()
): string | undefined {
  const configured = env.STATIC_ROOT?.trim();
  if (configured) {
    const root = resolve(cwd, configured);
    assertSpaIndex(root);
    return root;
  }
  if (env.NODE_ENV === 'production') {
    const root = resolve(cwd, 'dist');
    assertSpaIndex(root);
    return root;
  }
  return undefined;
}

export function staticFileResponse(
  c: Context,
  root: string,
  pathname: string
): Response | undefined {
  if (isReservedApiPath(pathname)) {
    return undefined;
  }

  const filePath = pathname === '/' ? safeFile(root, 'index.html') : safeFile(root, pathname);
  if (filePath) {
    return sendFile(c, filePath, pathname === '/' || filePath.endsWith(`${sep}index.html`));
  }
  if (pathname !== '/' && !looksLikeFile(pathname)) {
    const indexPath = safeFile(root, 'index.html');
    if (indexPath) {
      return sendFile(c, indexPath, true);
    }
  }
  return undefined;
}

export function isReservedApiPath(pathname: string): boolean {
  return (
    pathname === '/health' ||
    pathname === '/docs' ||
    pathname.startsWith('/docs/') ||
    pathname === '/openapi.yaml' ||
    pathname === '/api' ||
    pathname.startsWith('/api/')
  );
}

function assertSpaIndex(root: string): void {
  if (!existsSync(join(root, 'index.html'))) {
    throw new Error(`SPA の index.html が見つかりません: ${root}`);
  }
}

function looksLikeFile(pathname: string): boolean {
  const base = pathname.slice(pathname.lastIndexOf('/') + 1);
  return base.includes('.');
}

function safeFile(root: string, pathname: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  if (decoded.includes('\0')) {
    return undefined;
  }

  const relative = decoded.replace(/^\/+/, '');
  if (relative === '' || relative === '.') {
    return undefined;
  }

  let rootReal: string;
  try {
    rootReal = realpathSync(root);
  } catch {
    return undefined;
  }

  const candidate = resolve(rootReal, relative);
  if (!isInside(rootReal, candidate) || !existsSync(candidate)) {
    return undefined;
  }

  let listed: ReturnType<typeof lstatSync>;
  try {
    listed = lstatSync(candidate);
  } catch {
    return undefined;
  }
  if (listed.isSymbolicLink() || !listed.isFile()) {
    return undefined;
  }

  let real: string;
  try {
    real = realpathSync(candidate);
  } catch {
    return undefined;
  }
  if (!isInside(rootReal, real)) {
    return undefined;
  }
  return real;
}

function isInside(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root + sep);
}

function sendFile(c: Context, filePath: string, indexDocument: boolean): Response {
  const extension = extname(filePath).toLowerCase();
  return c.body(readFileSync(filePath), 200, {
    'content-type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
    'cache-control': indexDocument ? 'no-cache' : 'public, max-age=3600',
    'x-content-type-options': 'nosniff',
  });
}
