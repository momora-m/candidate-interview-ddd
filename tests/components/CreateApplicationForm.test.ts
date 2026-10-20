import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ApiError, apiRequest } from '../../src/api/client';
import { resolveSelectedCompanyId } from '../../src/components/Modals/CreateApplicationModal';

describe('application entry form', () => {
  test('fills the company id after the company list arrives', () => {
    assert.equal(resolveSelectedCompanyId([], ''), '');
    assert.equal(
      resolveSelectedCompanyId([{ id: 'company-1' }, { id: 'company-2' }], ''),
      'company-1'
    );
    assert.equal(
      resolveSelectedCompanyId([{ id: 'company-1' }, { id: 'company-2' }], 'company-2'),
      'company-2'
    );
  });

  test('shows the rejected field when the API rejects the request shape', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: 'リクエストの形式が正しくありません。',
          issues: [{ path: 'companyId', message: 'Too small: expected string to have >=1 characters' }],
        }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );

    try {
      await assert.rejects(
        () => apiRequest('/api/applications', { method: 'POST', body: '{}' }),
        (error: unknown) => {
          assert.ok(error instanceof ApiError);
          assert.match(error.message, /リクエストの形式が正しくありません。/);
          assert.match(error.message, /companyId/);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
