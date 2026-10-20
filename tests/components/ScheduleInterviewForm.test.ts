import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { resolveSelectedApplicationId } from '../../src/components/resolveSelectedApplicationId';

const applications = [
  { id: 'app-1', isTerminal: false },
  { id: 'app-2', isTerminal: false },
  { id: 'app-3', isTerminal: true },
];

describe('interview schedule form', () => {
  test('fills the application id after the list arrives', () => {
    assert.equal(resolveSelectedApplicationId([], ''), '');
    assert.equal(resolveSelectedApplicationId(applications, ''), 'app-1');
    assert.equal(resolveSelectedApplicationId(applications, 'app-2'), 'app-2');
    assert.equal(resolveSelectedApplicationId(applications, 'app-3'), 'app-1');
    assert.equal(resolveSelectedApplicationId(applications, 'missing', 'app-2'), 'app-2');
    assert.equal(resolveSelectedApplicationId(applications, 'app-1', 'app-2'), 'app-1');
  });
});
