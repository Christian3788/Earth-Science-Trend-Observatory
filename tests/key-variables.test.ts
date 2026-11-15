// Tests for the left-panel headline variables. Run with:
//   npm test -- tests/key-variables.test.ts
//   node --test tests/key-variables.test.ts
// (No test runner dependency: uses the Node built-in test module.)

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { EARTH_VARIABLES } from '../src/data/earthCatalog.ts';
import { KEY_VARIABLE_IDS, resolveKeyVariables } from '../src/data/keyVariables.ts';

describe('keyVariables', () => {
  test('pins exactly six headline variables', () => {
    assert.equal(KEY_VARIABLE_IDS.length, 6);
    assert.equal(new Set(KEY_VARIABLE_IDS).size, 6);
  });

  test('every pinned id exists in the catalog', () => {
    const catalogIds = new Set(EARTH_VARIABLES.map((v) => v.id));
    for (const id of KEY_VARIABLE_IDS) {
      assert.ok(catalogIds.has(id), `pinned id ${id} missing from catalog`);
    }
  });

  test('every pinned variable streams live NASA POWER data', () => {
    for (const v of resolveKeyVariables()) {
      assert.equal(v.liveNasaPower, true, `${v.id} is not a live variable`);
    }
  });

  test('resolved list preserves pin order with display labels', () => {
    const resolved = resolveKeyVariables();
    assert.deepEqual(
      resolved.map((v) => v.id),
      [...KEY_VARIABLE_IDS],
    );
    for (const v of resolved) {
      assert.ok(v.shortName.trim().length > 0);
      assert.ok(v.unit.trim().length > 0);
    }
  });

  test('unknown ids are dropped instead of breaking the panel', () => {
    const partial = EARTH_VARIABLES.filter((v) => v.id !== KEY_VARIABLE_IDS[0]);
    const resolved = resolveKeyVariables(partial);
    assert.equal(resolved.length, KEY_VARIABLE_IDS.length - 1);
    assert.ok(!resolved.some((v) => v.id === KEY_VARIABLE_IDS[0]));
  });
});
