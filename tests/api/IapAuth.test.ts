import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { createServerApp } from '../../src/api/createServerApp';
import { createApp } from '../../src/api/app';
import {
  IAP_ISSUER,
  IAP_JWT_HEADER,
  resolveIapAuthConfig,
} from '../../src/api/auth/iapAuth';
import { createIapJwtVerifier } from '../../src/api/auth/iapJwt';
import { createInMemoryCandidateRuntime } from '../../src/infrastructure/createCandidateRuntime';

const AUDIENCE = '/projects/123/global/backendServices/456';
const EMAIL = 'kaito.mishina@gmail.com';

describe('IAP auth config', () => {
  test('stays disabled outside production', () => {
    assert.deepEqual(resolveIapAuthConfig({ NODE_ENV: 'development' }), { enabled: false });
    assert.deepEqual(resolveIapAuthConfig({}), { enabled: false });
  });

  test('requires audience and allowed email in production', () => {
    assert.throws(
      () => resolveIapAuthConfig({ NODE_ENV: 'production' }),
      /IAP_AUDIENCE/
    );
    assert.deepEqual(
      resolveIapAuthConfig({
        NODE_ENV: 'production',
        IAP_AUDIENCE: `  ${AUDIENCE}  `,
        IAP_ALLOWED_EMAIL: `  ${EMAIL}  `,
      }),
      { enabled: true, audience: AUDIENCE, allowedEmail: EMAIL }
    );
  });
});

describe('IAP JWT middleware', () => {
  test('rejects missing, invalid, and unexpected users, and allows the configured email', async () => {
    const { verifier, sign } = await testVerifier();
    const runtime = createInMemoryCandidateRuntime();
    const app = createApp({
      persistence: runtime.persistence,
      queries: runtime.queries,
      useCases: runtime.useCases,
      eventBus: runtime.eventBus,
      auth: {
        config: { enabled: true, audience: AUDIENCE, allowedEmail: EMAIL },
        verifier,
      },
    });

    const missing = await app.request('/api/companies');
    assert.equal(missing.status, 401);

    const health = await app.request('/health');
    assert.equal(health.status, 200);

    const forged = await app.request('/api/companies', {
      headers: { [IAP_JWT_HEADER]: 'not-a-jwt' },
    });
    assert.equal(forged.status, 401);

    const wrongAudience = await app.request('/api/companies', {
      headers: { [IAP_JWT_HEADER]: await sign(EMAIL, { audience: '/other' }) },
    });
    assert.equal(wrongAudience.status, 401);

    const wrongIssuer = await app.request('/api/companies', {
      headers: { [IAP_JWT_HEADER]: await sign(EMAIL, { issuer: 'https://example.invalid' }) },
    });
    assert.equal(wrongIssuer.status, 401);

    const stranger = await app.request('/api/companies', {
      headers: { [IAP_JWT_HEADER]: await sign('other@example.com') },
    });
    assert.equal(stranger.status, 403);

    const allowed = await app.request('/api/companies', {
      headers: { [IAP_JWT_HEADER]: await sign('Kaito.Mishina@gmail.com') },
    });
    assert.equal(allowed.status, 200);
    assert.ok(Array.isArray(await allowed.json()));
  });

  test('production server wiring protects pages but leaves the health check open', async () => {
    const root = mkdtempSync(join(tmpdir(), 'iap-spa-'));
    writeFileSync(join(root, 'index.html'), '<!doctype html><title>candidate</title>');
    try {
      await assert.rejects(
        () => createServerApp({ NODE_ENV: 'production', STATIC_ROOT: root }),
        /IAP_AUDIENCE/
      );

      const started = await createServerApp({
        NODE_ENV: 'production',
        STATIC_ROOT: root,
        IAP_AUDIENCE: AUDIENCE,
        IAP_ALLOWED_EMAIL: EMAIL,
      });
      try {
        assert.equal(started.persistence, 'memory');
        assert.equal(started.auth.enabled, true);
        const health = await started.app.request('/health');
        assert.equal(health.status, 200);
        const home = await started.app.request('/');
        assert.equal(home.status, 401);
      } finally {
        await started.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

async function testVerifier(): Promise<{
  verifier: ReturnType<typeof createIapJwtVerifier>;
  sign: (
    email: string,
    overrides?: { audience?: string; issuer?: string }
  ) => Promise<string>;
}> {
  const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
  const jwk = await exportJWK(publicKey);
  jwk.alg = 'ES256';
  jwk.kid = 'test-key';
  jwk.use = 'sig';
  const verifier = createIapJwtVerifier(createLocalJWKSet({ keys: [jwk] }));
  return {
    verifier,
    sign: (email, overrides) => signIapJwt(privateKey, email, overrides),
  };
}

function signIapJwt(
  privateKey: CryptoKey,
  email: string,
  overrides?: { audience?: string; issuer?: string }
): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setIssuer(overrides?.issuer ?? IAP_ISSUER)
    .setAudience(overrides?.audience ?? AUDIENCE)
    .setSubject('accounts.google.com:123')
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(privateKey);
}
