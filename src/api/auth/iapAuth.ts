import type { MiddlewareHandler } from 'hono';

export const IAP_JWT_HEADER = 'x-goog-iap-jwt-assertion';
export const IAP_ISSUER = 'https://cloud.google.com/iap';
export const IAP_JWKS_URL = 'https://www.gstatic.com/iap/verify/public_key-jwk';

export interface IapIdentity {
  email: string;
  subject: string;
}

export interface IapJwtVerifier {
  verify(token: string, expectedAudience: string): Promise<IapIdentity>;
}

export interface IapAuthConfig {
  enabled: boolean;
  audience?: string;
  allowedEmail?: string;
}

/**
 * Production requires a verified IAP JWT. Local and test runs leave this off
 * so the API can start without Google.
 */
export function resolveIapAuthConfig(env: NodeJS.ProcessEnv): IapAuthConfig {
  if (env.NODE_ENV !== 'production') {
    return { enabled: false };
  }

  const audience = env.IAP_AUDIENCE?.trim() ?? '';
  const allowedEmail = env.IAP_ALLOWED_EMAIL?.trim() ?? '';
  if (!audience || !allowedEmail) {
    throw new Error(
      'NODE_ENV=production では IAP_AUDIENCE と IAP_ALLOWED_EMAIL を設定してください。'
    );
  }

  return { enabled: true, audience, allowedEmail };
}

export function isIapPublicPath(pathname: string): boolean {
  return pathname === '/health';
}

export function createIapAuthMiddleware(options: {
  config: IapAuthConfig;
  verifier: IapJwtVerifier;
}): MiddlewareHandler {
  const { config, verifier } = options;
  const allowedEmail = config.allowedEmail?.trim().toLowerCase();

  return async (c, next) => {
    if (!config.enabled) {
      await next();
      return;
    }
    if (!config.audience || !allowedEmail) {
      return c.json({ error: '認証設定が不完全です。' }, 401);
    }
    if (isIapPublicPath(c.req.path)) {
      await next();
      return;
    }

    const token = c.req.header(IAP_JWT_HEADER);
    if (!token) {
      return c.json({ error: '認証が必要です。' }, 401);
    }

    let identity: IapIdentity;
    try {
      identity = await verifier.verify(token, config.audience);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      console.error(`IAP JWT の検証に失敗しました: ${message.slice(0, 200)}`);
      return c.json({ error: '認証トークンが無効です。' }, 401);
    }

    if (identity.email.trim().toLowerCase() !== allowedEmail) {
      return c.json({ error: 'このユーザーは許可されていません。' }, 403);
    }

    await next();
  };
}
