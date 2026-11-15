// Tests for the navbar destinations. Run with:
//   npm test -- tests/nav-links.test.ts
//   node --test tests/nav-links.test.ts
// (No test runner dependency: uses the Node built-in test module.)

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { NAV_LINKS } from '../src/data/navLinks.ts';
import { POINTER_TARGETS } from '../src/data/pointerTargets.ts';

describe('navLinks', () => {
  test('links walk the dashboard top to bottom', () => {
    assert.deepEqual(
      NAV_LINKS.map((l) => l.id),
      ['location', 'tracking', 'detail-verdict', 'detail-chart', 'detail-words'],
    );
  });

  test('every pointer target is reachable from the navbar', () => {
    const navIds = new Set(NAV_LINKS.map((l) => l.id));
    for (const t of POINTER_TARGETS) {
      assert.ok(navIds.has(t.id), `pointer target ${t.id} missing from navbar`);
    }
  });

  test('ids are unique with non-empty labels', () => {
    const ids = NAV_LINKS.map((l) => l.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const l of NAV_LINKS) {
      assert.ok(l.label.trim().length > 0);
    }
  });
});
