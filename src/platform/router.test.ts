import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAppUrl,
  normalizeBasePath,
  parseAppRoute,
  resolveGitHubRepositoryUrl,
  stripBasePath,
} from './router';

test('normalizeBasePath handles empty, root, and repository subpaths', () => {
  assert.equal(normalizeBasePath(undefined), '/');
  assert.equal(normalizeBasePath('/'), '/');
  assert.equal(normalizeBasePath('//'), '/');
  assert.equal(normalizeBasePath('oddlot'), '/oddlot/');
  assert.equal(normalizeBasePath('/oddlot/'), '/oddlot/');
  assert.equal(normalizeBasePath('/Oddlot//'), '/Oddlot/');
});

test('parseAppRoute resolves root and subpath routes accurately', () => {
  assert.deepEqual(parseAppRoute('/', '/'), { kind: 'home' });
  assert.deepEqual(parseAppRoute('/games/skypop', '/'), { kind: 'game', slug: 'skypop' });
  assert.deepEqual(parseAppRoute('/games/skypop/', '/'), { kind: 'game', slug: 'skypop' });

  // Hosted under /oddlot/ GitHub Pages subpath
  assert.deepEqual(parseAppRoute('/oddlot', '/oddlot/'), { kind: 'home' });
  assert.deepEqual(parseAppRoute('/oddlot/', '/oddlot/'), { kind: 'home' });
  assert.deepEqual(parseAppRoute('/oddlot/games/skypop', '/oddlot/'), {
    kind: 'game',
    slug: 'skypop',
  });
  assert.deepEqual(parseAppRoute('/oddlot/games/meteor-shower', '/oddlot/'), {
    kind: 'game',
    slug: 'meteor-shower',
  });

  // Unknown route
  assert.deepEqual(parseAppRoute('/oddlot/unknown/page', '/oddlot/'), {
    kind: 'not_found',
    path: '/unknown/page',
  });
});

test('buildAppUrl preserves basePath, search, and hash cleanly', () => {
  assert.equal(buildAppUrl({ kind: 'home' }, '/'), '/');
  assert.equal(buildAppUrl({ kind: 'home' }, '/oddlot/'), '/oddlot/');
  assert.equal(
    buildAppUrl({ kind: 'game', slug: 'skypop' }, '/oddlot/', 'autostart=1'),
    '/oddlot/games/skypop?autostart=1'
  );
  assert.equal(
    buildAppUrl({ kind: 'home' }, '/oddlot/', '', '#games'),
    '/oddlot/#games'
  );
  assert.equal(stripBasePath('/oddlot/games/skypop', '/oddlot/'), '/games/skypop');
});

test('resolveGitHubRepositoryUrl uses configured URL or infers from *.github.io host', () => {
  assert.equal(
    resolveGitHubRepositoryUrl('https://github.com/acme/oddlot'),
    'https://github.com/acme/oddlot'
  );
  assert.equal(
    resolveGitHubRepositoryUrl('', {
      hostname: 'alice.github.io',
      pathname: '/oddlot/games/skypop',
    }),
    'https://github.com/alice/oddlot'
  );
  assert.equal(
    resolveGitHubRepositoryUrl('', {
      hostname: 'localhost',
      pathname: '/',
    }),
    null
  );
});
