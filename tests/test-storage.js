import 'fake-indexeddb/auto.js';

// Polyfills for browser globals used by StorageDB
globalThis.window = globalThis;
globalThis.localStorage = globalThis.localStorage || {
  _store: {},
  getItem(k) { return this._store[k] ?? null; },
  setItem(k, v) { this._store[k] = String(v); }
};

import { StorageDB } from '../www/models/data.js';

async function run() {
  try {
    const db = new StorageDB('flowRecord');

    console.log('Inserting record...');
    const r = await db.insert({ taskName: 'TestTask', categoryName: 'Test' });
    console.log('Inserted:', r);

    console.log('Finding all...');
    const all = await db.all();
    console.log('All:', all);

    console.log('FindOne by id...');
    const one = await db.findOne(r._id);
    console.log('FindOne:', one);

    console.log('Update record...');
    const upd = await db.update(r._id, { taskName: 'Updated' });
    console.log('Update result:', upd.length);

    console.log('Find after update...');
    const after = await db.findOne(r._id);
    console.log('After update:', after);

    console.log('Remove record...');
    const rem = await db.remove(r._id);
    console.log('Removed count:', rem);

    console.log('Clear store...');
    await db.clear();
    const empty = await db.all();
    console.log('After clear, count:', empty.length);

    console.log('TESTS PASSED');
    process.exit(0);
  } catch (e) {
    console.error('TEST FAILED', e);
    process.exit(2);
  }
}

run();
