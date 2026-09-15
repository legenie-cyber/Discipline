
// Classe utilitaire pour simuler une base de données en mémoire
export class StorageDB {
    static db ;

    constructor(name = 'StorageDB', options = {}, metaData) {
        this.name = name;
        this.delay = options.delay ?? 0; // ms, pour simuler latence
        this.persist = options.persist ?? true; // sauvegarde dans indexedDB
        this.store = [];
        this.objectStore = null;
        this._nextId = 1;
        this._id = localStorage.getItem("_id")

        if (!this.persist || !window.indexedDB) console.warn("Votre appareil ne supporte pas une version stable de la base de donnees. \n Ou vous n'avez pas active le stockage permanant de donnees");
        // Ouvrir la base de donnees de facon asynchrone.
        this.ready = new Promise((resolve, reject) => {
            const request = window.indexedDB.open("Discipline", 3);

            request.onerror = (event) => {
                console.error("Erreur ouverture IndexedDB:", event.target.error);
                reject(new Error("Une erreur est survenu dans la creation de la base de donnees\n" + event.target.errorCode));
            };

            request.onupgradeneeded = (event) => {
                const db = StorageDB.db || event.target.result;
                if (!db.objectStoreNames.contains(this.name)) {
                    db.createObjectStore("users", { keyPath: "_id" });
                    db.createObjectStore("flowRecord", { keyPath: "_id" });
                }
                
            };

            request.onsuccess = (event) => {
                this.db = StorageDB.db || event.target.result;
                console.info("Base de donnees ouverte avec succes");

                try {
                    const tx = this.db.transaction(this.name, 'readonly');
                    const store = tx.objectStore(this.name);
                    const getReq = store.get(this._id);
                    getReq.onsuccess = () => {
                        const rec = getReq.result;
                        console.log(rec);
                        if (rec && Array.isArray(rec.data)) {
                            this.store = rec.data;
                            
                            this._nextId = (this.store.reduce((m, r) => Math.max(m, r._id || 0), 0) || 0) + 1;
                        }
                        resolve(true);
                    };
                    getReq.onerror = () => resolve(true);
                } catch (err) {
                    // Si la lecture echoue, on resolve quand meme pour permettre l'utilisation hors ligne
                    console.warn('Lecture initiale impossible', err);
                    resolve(true);
                }
            };
        });
            
    }

    _delay() {
        return new Promise(res => setTimeout(res, this.delay));
    }

    async _persist(doc) {
        await this.ready.catch(() => {});
        if (!this.persist || !this.db) return;
        try {
            const tx = this.db.transaction(this.name, 'readwrite');
            const store = tx.objectStore(this.name);
            const payload = { _id: this._id, data: this.store };
            store.put(payload);
        } catch (err) {
            console.warn('Echec de la persistence IndexedDB', err);
        }
    }

    async insert(doc) {
        await this._delay();
        const record = Object.assign({}, doc);
        if (record._id == null) record._id = this._nextId++;
        record.createdAt = new Date().toISOString();
        this.store.push(record);
        await this._persist();
        return JSON.parse(JSON.stringify(record));
    }

    // filter can be an object for shallow match or a function(doc) => boolean
    async find(filter = null) {
        await this._delay();
        let results = this.store.slice();
        if (filter) {
            if (typeof filter === 'function') results = results.filter(filter);
            else if (typeof filter === 'object') 
            results = results.filter(d => {
                return Object.keys(filter).every(k =>  d[k] == filter[k]);
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

    async patch(selector, callBack) {
        const isId = (typeof selector === "number" || typeof selector === 'string')
        let updated = 0

        this.store = this.store.map(r => {
            //Pour savoir si on est a l'enregistrement concidere
            const match = isId ? (r._id == selector) : Object.keys(selector).every(k => r[k] === selector[k])
            if (match) {
                updated++
                callBack(r);
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
        await this._persist();
        return true;
    }

    async all() {
        return await this.find();
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