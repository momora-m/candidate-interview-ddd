import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { IAP_ISSUER, IAP_JWKS_URL, type IapIdentity, type IapJwtVerifier } from './iapAuth';

/**
 * Verifies the ES256 JWT that Cloud IAP puts in `X-Goog-IAP-JWT-Assertion`.
 * The remote key set is cached by `jose` and fetched only when a token is checked.
 */
export function createIapJwtVerifier(getKey?: JWTVerifyGetKey): IapJwtVerifier {
  const key = getKey ?? createRemoteJWKSet(new URL(IAP_JWKS_URL));

  return {
    async verify(token: string, expectedAudience: string): Promise<IapIdentity> {
      const { payload } = await jwtVerify(token, key, {
        issuer: IAP_ISSUER,
        audience: expectedAudience,
        algorithms: ['ES256'],
      });
      const email = payload.email;
      if (typeof email !== 'string' || email.trim() === '') {
        throw new Error('IAP JWT に email がありません。');
      }
      return {
        email: email.trim(),
        subject: typeof payload.sub === 'string' ? payload.sub : '',
      };
    },
  };
}
