import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

export function normalizeBasePath(raw?: string): string {
  const cleaned = (raw ?? '').trim().replace(/^\/+|\/+$/g, '');
  return cleaned ? `/${cleaned}/` : '/';
}

function resolveBasePath(): string {
  if (process.env.VITE_BASE_PATH) {
    return normalizeBasePath(process.env.VITE_BASE_PATH);
  }
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    if (repo && owner && repo.toLowerCase() !== `${owner.toLowerCase()}.github.io`) {
      return `/${repo}/`;
    }
  }
  return '/';
}

function resolveGitHubRepoUrl(): string {
  if (process.env.VITE_GITHUB_REPO_URL) {
    return process.env.VITE_GITHUB_REPO_URL.trim();
  }
  if (process.env.GITHUB_REPOSITORY) {
    return `https://github.com/${process.env.GITHUB_REPOSITORY}`;
  }
  return '';
}

function oddlotSpa404Plugin(basePath: string): Plugin {
  const normalizedBase = normalizeBasePath(basePath);
  return {
    name: 'oddlot-gh-pages-404',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;
      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Oddlot — Redirecting...</title>
    <script>
      (function () {
        var base = ${JSON.stringify(normalizedBase)};
        var loc = window.location;
        var pathname = loc.pathname || '/';
        var rel = pathname.indexOf(base) === 0
          ? pathname.slice(base.length - 1)
          : pathname;
        if (!rel.startsWith('/')) rel = '/' + rel;
        var encodedPath = encodeURIComponent(rel);
        var encodedQuery = loc.search ? '&q=' + encodeURIComponent(loc.search.slice(1)) : '';
        loc.replace(
          loc.protocol + '//' + loc.host + base + '?p=' + encodedPath + encodedQuery + (loc.hash || '')
        );
      })();
    </script>
  </head>
  <body></body>
</html>
`;
      fs.writeFileSync(path.join(distDir, '404.html'), html, 'utf8');
    },
  };
}

export default defineConfig(() => {
  const base = resolveBasePath();
  const githubRepoUrl = resolveGitHubRepoUrl();

  return {
    base,
    plugins: [react(), tailwindcss(), oddlotSpa404Plugin(base)],
    define: {
      'import.meta.env.VITE_GITHUB_REPO_URL': JSON.stringify(githubRepoUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
