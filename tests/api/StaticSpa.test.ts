import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { createApp } from '../../src/api/app';
import { resolveStaticRoot } from '../../src/api/staticSpa';
import { createServerApp } from '../../src/api/createServerApp';
import { createInMemoryCandidateRuntime } from '../../src/infrastructure/createCandidateRuntime';

describe('static SPA', () => {
  test('serves built files and client routes without replacing the API', async () => {
    const root = createFixture();
    try {
      const runtime = createInMemoryCandidateRuntime();
      const app = createApp({
        persistence: runtime.persistence,
        queries: runtime.queries,
        useCases: runtime.useCases,
        eventBus: runtime.eventBus,
        staticRoot: root,
      });

      const home = await app.request('/');
      assert.equal(home.status, 200);
      assert.match(home.headers.get('content-type') ?? '', /text\/html/);
      assert.match(await home.text(), /candidate-spa/);
      assert.equal(home.headers.get('cache-control'), 'no-cache');

      const script = await app.request('/assets/app.js');
      assert.equal(script.status, 200);
      assert.match(script.headers.get('content-type') ?? '', /javascript/);
      assert.equal(await script.text(), 'console.log(1)\n');

      const route = await app.request('/interviews/app_1');
      assert.equal(route.status, 200);
      assert.match(await route.text(), /candidate-spa/);

      const missingAsset = await app.request('/assets/missing.js');
      assert.equal(missingAsset.status, 404);
      assert.match(missingAsset.headers.get('content-type') ?? '', /json/);

      const companies = await app.request('/api/companies');
      assert.equal(companies.status, 200);
      assert.ok(Array.isArray(await companies.json()));

      const emptyInterview = await app.request('/api/applications//interviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          startTime: '2026-12-01T01:00:00.000Z',
          endTime: '2026-12-01T02:00:00.000Z',
          formatType: 'ONLINE',
          meetingUrl: 'https://zoom.us/j/1',
        }),
      });
      assert.equal(emptyInterview.status, 404);
      assert.deepEqual(await emptyInterview.json(), { error: '見つかりません。' });

      const health = await app.request('/health');
      assert.equal((await health.json()).status, 'ok');

      const escaped = await app.request('/../package.json');
      assert.equal(escaped.status, 404);
      const encoded = await app.request('/%2e%2e/package.json');
      assert.notEqual(encoded.status, 200);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('development ignores dist unless STATIC_ROOT is set', () => {
    const root = createFixture();
    try {
      assert.equal(resolveStaticRoot({ NODE_ENV: 'development' }, root), undefined);
      assert.equal(resolveStaticRoot({ STATIC_ROOT: root }), root);
      assert.throws(() => resolveStaticRoot({ NODE_ENV: 'production' }, root), /index\.html/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('a normal dev server keeps the JSON index', async () => {
    const started = await createServerApp({ NODE_ENV: 'test' });
    try {
      const home = await started.app.request('/');
      assert.equal((await home.json()).name, 'candidate-interview-api');
      assert.equal(started.staticRoot, undefined);
      assert.equal(started.auth.enabled, false);
    } finally {
      await started.close();
    }
  });
});

function createFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'spa-'));
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>candidate-spa</title>');
  writeFileSync(join(root, 'assets', 'app.js'), 'console.log(1)\n');
  return root;
}
