import { zValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import type { ZodType } from 'zod';

export function statusForDomainError(message: string): 400 | 404 | 409 {
  if (message.includes('見つかりません') || message.includes('存在しません')) {
    return 404;
  }
  if (message.includes('重複') || message.includes('衝突') || message.includes('既に')) {
    return 409;
  }
  return 400;
}

export function domainError(c: Context, message: string) {
  return c.json({ error: message }, statusForDomainError(message));
}

export function jsonBody<T extends ZodType>(schema: T) {
  return zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'リクエストの形式が正しくありません。',
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        400
      );
    }
  });
}
