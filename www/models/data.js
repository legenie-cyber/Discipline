const DB_NAME = 'Discipline';
const DEFAULT_STORES = ['users', 'flowRecord', 'planing'];

// Transforme une IDBRequest en Promise
const req = (r) => new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
});

// Construit un prédicat à partir d'un id, d'une fonction ou d'un objet { champ: valeur }
const predicate = (selector) => {
    if (typeof selector === 'function') return selector;
    if (typeof selector === 'number' || typeof selector === 'string') return (r) => r._id === Number(selector);
    return (r) => Object.keys(selector).every((k) => r[k] === selector[k]);
};

export class StorageDB {
    static _db = null;                    // connexion partagée
    static _chain = Promise.resolve();    // file d'attente : évite les ouvertures/upgrades concurrents

    constructor(name) {
        if (!window.indexedDB) throw new Error('IndexedDB non supporté sur cet appareil');
        this.name = name;
    }

    // Ouvre la base ; crée les stores par défaut + le store demandé s'ils manquent
    static _open(store, version) {
        return new Promise((resolve, reject) => {
            const r = indexedDB.open(DB_NAME, version);
            r.onupgradeneeded = () => {
                const db = r.result;
                for (const s of new Set([...DEFAULT_STORES, store])) {
                    if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: '_id', autoIncrement: true });
                }
            };
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
            r.onblocked = () => console.warn('StorageDB : mise à jour en attente, une autre connexion à la base est encore ouverte (autre onglet ?)');
        });
    }

    // Garantit que la connexion est ouverte et que le store existe
    static _ensure(store) {
        const step = StorageDB._chain.then(async () => {
            let db = StorageDB._db ?? await StorageDB._open(store);
            if (!db.objectStoreNames.contains(store)) {
                db.close();
                db = await StorageDB._open(store, db.version + 1);
            }
            db.onversionchange = () => {
                db.close();
                if (StorageDB._db === db) StorageDB._db = null;
            };
            StorageDB._db = db;
        });
        StorageDB._chain = step.catch(() => {});
        return step;
    }

    // Exécute `work(store)` dans UNE transaction et ne résout qu'une fois la transaction terminée (commit)
    async _tx(mode, work) {
        await StorageDB._ensure(this.name);
        const tx = StorageDB._db.transaction(this.name, mode);
        return new Promise((resolve, reject) => {
            let result;
            tx.oncomplete = () => resolve(result);
            tx.onabort = () => reject(tx.error);
            work(tx.objectStore(this.name)).then(
                (r) => { result = r; },
                (e) => { reject(e); try { tx.abort(); } catch { /* déjà terminée */ } }
            );
        });
    }

    // Ajoute toujours un nouvel enregistrement ; l'_id est généré par IndexedDB
    insert(doc) {
        const record = { ...doc, createdAt: new Date().toISOString() };
        delete record._id;
        return this._tx('readwrite', async (store) => {
            // Bases créées avant cette version : store sans autoIncrement -> on calcule le prochain _id
            if (!store.autoIncrement) {
                const last = await req(store.openKeyCursor(null, 'prev'));
                record._id = (last?.key ?? 0) + 1;
            }
            const id = await req(store.add(record));
            record._id = id;
            return record;
        });
    }

    // filter : null | id | fonction | objet
    find(filter = null) {
        return this._tx('readonly', async (store) => {
            const all = await req(store.getAll());
            return filter == null ? all : all.filter(predicate(filter));
        });
    }

    async findOne(filter) {
        if (typeof filter === 'number' || typeof filter === 'string') {
            return this._tx('readonly', async (store) => (await req(store.get(Number(filter)))) ?? null);
        }
        return (await this.find(filter))[0] ?? null;
    }

    all() {
        return this.find();
    }

    // patch : objet à fusionner, ou fonction (record) => void qui modifie l'enregistrement
    // Retourne les enregistrements modifiés
    update(selector, patch) {
        const match = predicate(selector);
        return this._tx('readwrite', async (store) => {
            const rows = (await req(store.getAll())).filter(match);
            for (const r of rows) {
                if (typeof patch === 'function') patch(r);
                else Object.assign(r, patch);
                r.updatedAt = new Date().toISOString();
                store.put(r);
            }
            return rows;
        });
    }

    // Retourne le nombre d'enregistrements supprimés
    remove(selector) {
        return this._tx('readwrite', async (store) => {
            if (typeof selector === 'number' || typeof selector === 'string') {
                store.delete(Number(selector));
                return 1;
            }
            const rows = (await req(store.getAll())).filter(predicate(selector));
            for (const r of rows) store.delete(r._id);
            return rows.length;
        });
    }

    clear() {
        return this._tx('readwrite', (store) => req(store.clear()));
    }
}

/* Exemple :
const db = new StorageDB('flowRecord');
await db.insert({ name: 'Tigris' });
await db.insert({ name: 'Mittens' });
console.log(await db.find());
await db.update(1, { name: 'Tigre' });
console.log(await db.findOne({ name: 'Tigre' }));
await db.remove(2);
*/
