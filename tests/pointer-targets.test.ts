// Tests for the pointer-menu targets. Run with:
//   npm test -- tests/pointer-targets.test.ts
//   node --test tests/pointer-targets.test.ts
// (No test runner dependency: uses the Node built-in test module.)

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { POINTER_TARGETS } from '../src/data/pointerTargets.ts';

describe('pointerTargets', () => {
  test('covers each finding card exactly once', () => {
    assert.deepEqual(
      POINTER_TARGETS.map((t) => t.id),
      ['detail-verdict', 'detail-chart', 'detail-words'],
    );
  });

  test('ids are unique with non-empty labels', () => {
    const ids = POINTER_TARGETS.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const t of POINTER_TARGETS) {
      assert.ok(t.label.trim().length > 0);
    }
  });
});
