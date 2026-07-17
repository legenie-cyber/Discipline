
// Classe utilitaire pour simuler une base de données en mémoire
export class StorageDB {
    constructor(name = 'StorageDB', options = {}) {
        this.name = name;
        this.delay = options.delay ?? 50; // ms, pour simuler latence
        this.persist = options.persist ?? true; // sauvegarde dans localStorage
        this.store = [];
        this._nextId = 1;

        // Vérifie la disponibilité de localStorage de façon robuste
        const hasLocalStorage = (typeof window !== 'undefined' && window.localStorage) || (typeof localStorage !== 'undefined' && localStorage);

        if (this.persist && hasLocalStorage) {
            try {
                const raw = localStorage.getItem(this.name);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        this.store = parsed;
                        this._nextId = (this.store.reduce((m, r) => Math.max(m, r._id || 0), 0) || 0) + 1;
                    }
                }
            } catch (e) {
                // ignore
            }
        }
    }

    _delay() {
        return new Promise(res => setTimeout(res, this.delay));
    }

    _persist() {
        if (this.persist && typeof localStorage !== 'undefined') {
            localStorage.setItem(this.name, JSON.stringify(this.store));
        }
    }

    async insert(doc) {
        await this._delay();
        const record = Object.assign({}, doc);
        if (record._id == null) record._id = this._nextId++;
        record.createdAt = new Date().toISOString();
        this.store.push(record);
        this._persist();
        return JSON.parse(JSON.stringify(record));
    }

    // filter can be an object for shallow match or a function(doc) => boolean
    async find(filter = null) {
        await this._delay();
        let results = this.store.slice();
        if (filter) {
            if (typeof filter === 'function') results = results.filter(filter);
            else if (typeof filter === 'object') results = results.filter(d => {
                return Object.keys(filter).every(k => d[k] === filter[k]);
            });
        }
        return JSON.parse(JSON.stringify(results));
    }

    async findOne(filter) {
        await this._delay();
        const results = await this.find(filter);
        return results.length ? results[0] : null;
    }

    // update by id or by filter (object/function). returns number of updated records.
    async update(selector, patch) {
        await this._delay();
        const isId = (typeof selector === 'number' || typeof selector === 'string');
        let updated = 0;
        this.store = this.store.map(r => {
            const match = isId ? (r._id == selector) : (typeof selector === 'function' ? selector(r) : Object.keys(selector).every(k => r[k] === selector[k]));
            if (match) {
                updated++;
                return Object.assign({}, r, patch, {updatedAt: new Date().toISOString()});
            }
            return r;
        });
        if (updated) this._persist();
        return {updated, rows: JSON.parse(JSON.stringify(this.store))};
    }

    // remove by id or filter. returns number removed.
    async remove(selector) {
        await this._delay();
        const before = this.store.length;
        const isId = (typeof selector === 'number' || typeof selector === 'string');
        this.store = this.store.filter(r => {
            const match = isId ? (r._id == selector) : (typeof selector === 'function' ? selector(r) : Object.keys(selector).every(k => r[k] === selector[k]));
            return !match;
        });
        const removed = before - this.store.length;
        if (removed) this._persist();
        return {removed};
    }

    async clear() {
        await this._delay();
        this.store = [];
        this._nextId = 1;
        this._persist();
        return true;
    }

    async all() {
        return this.find();
    }
}

/* Exemple d'utilisation :
const db = new StorageDB('cats', {persist: false, delay: 30});
(async () => {
  await db.insert({name: 'Tigris'});
  await db.insert({name: 'Mittens'});
  console.log(await db.find());
  await db.update(1, {name: 'Tigre'});
  console.log(await db.findOne({name: 'Tigre'}));
  await db.remove(2);
  console.log(await db.all());
})();
*/