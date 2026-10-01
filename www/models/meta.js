/**
 * meta.js — source unique pour les métadonnées de l'utilisateur (profil, thème, binôme).
 *
 *  - Vérité        : le store IndexedDB "users" (un enregistrement par compte).
 *  - Identifiant   : localStorage["_id"] pointe vers l'enregistrement du compte courant.
 *  - Cache         : localStorage["metaData"] est un MIROIR lecture seule, pour les accès
 *                    synchrones (appliquer le thème dès le chargement, durée par défaut du chrono).
 *                    Il est réécrit à chaque lecture/écriture de la base : ne jamais l'éditer à la main.
 */
import { StorageDB } from './data.js';

const CACHE_KEY = 'metaData';
const ID_KEY = '_id';

export const THEME_MODES = ['day', 'night', 'nature'];

// Palette d'accent : [accent, accent renforcé]
export const PALETTES = {
    violet: ['#8b5cf6', '#6d28d9'],
    yellow: ['#eab308', '#a16207'],
    pink: ['#ec4899', '#be185d'],
    green: ['#22c55e', '#15803d'],
    blue: ['#3b82f6', '#1d4ed8'],
    red: ['#ef4444', '#b91c1c'],
};

export const defaultMeta = () => ({
    me: { subName: '', slug: '', email: '', defaultTime: { duration: 30, durationTip: 'secondes' } },
    theme: { mode: 'day', color: '', univers: '', papierPeint: '' },
    binome: {
        subName: '',
        authorization: { programmation: false, list: false, state: false, stat: false },
    },
});

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Fusionne `src` dans `target` (en place). Ignore undefined, null et fonctions. */
export const mergeInto = (target, src) => {
    if (!isPlain(src)) return target;
    for (const [k, v] of Object.entries(src)) {
        if (v === undefined || v === null || typeof v === 'function') continue;
        if (isPlain(v)) {
            if (!isPlain(target[k])) target[k] = {};
            mergeInto(target[k], v);
        } else {
            target[k] = v;
        }
    }
    return target;
};

/** Complète n'importe quel enregistrement (ancien, partiel, corrompu) avec les valeurs par défaut */
export const normalize = (raw) => {
    const meta = mergeInto(defaultMeta(), raw);
    if (!THEME_MODES.includes(meta.theme.mode)) meta.theme.mode = 'day';
    const d = Number(meta.me.defaultTime.duration);
    meta.me.defaultTime.duration = d > 0 ? d : 30;
    if (!['secondes', 'minutes', 'heures'].includes(meta.me.defaultTime.durationTip)) {
        meta.me.defaultTime.durationTip = 'secondes';
    }
    return meta;
};

const writeCache = (meta) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(meta)); } catch { /* stockage plein / indisponible */ }
};

export const getUserId = () => {
    const id = Number(localStorage.getItem(ID_KEY));
    return Number.isFinite(id) && id > 0 ? id : null;
};

/** Lecture synchrone (cache) — toujours un objet complet */
export const getCachedMeta = () => {
    try { return normalize(JSON.parse(localStorage.getItem(CACHE_KEY))); }
    catch { return normalize(null); }
};

/** Lecture de référence depuis la base ; rafraîchit le cache. Retourne null si aucun compte. */
export const loadMeta = async () => {
    const id = getUserId();
    if (id === null) return null;
    const record = await new StorageDB('users').findOne(id);
    if (!record) return null;
    const meta = normalize(record);
    meta._id = record._id;
    writeCache(meta);
    return meta;
};

/** Crée le compte (inscription) et mémorise son _id. */
export const createUser = async (partial) => {
    const record = await new StorageDB('users').insert(normalize(partial));
    localStorage.setItem(ID_KEY, record._id);
    writeCache(normalize(record));
    return record;
};

/** Enregistre une modification partielle, ex. saveMeta({ theme: { mode: 'night' } }). */
export const saveMeta = async (changes) => {
    const users = new StorageDB('users');
    const id = getUserId();
    let rows = id === null ? [] : await users.update(id, (r) => mergeInto(r, changes));
    if (rows.length === 0) return createUser(mergeInto(getCachedMeta(), changes)); // compte manquant : on le recrée
    const meta = normalize(rows[0]);
    meta._id = rows[0]._id;
    writeCache(meta);
    return meta;
};

/** Applique le thème (mode, palette, papier peint) à la page courante. */
export const applyTheme = (meta = getCachedMeta()) => {
    const { mode, color, papierPeint } = meta.theme;
    const body = document.body;
    body.classList.remove(...THEME_MODES.map((m) => `theme-${m}`));
    body.classList.add(`theme-${THEME_MODES.includes(mode) ? mode : 'day'}`);

    const root = document.documentElement.style;
    const palette = PALETTES[color];
    if (palette) {
        root.setProperty('--accent', palette[0]);
        root.setProperty('--accent-strong', palette[1]);
    } else {
        root.removeProperty('--accent');
        root.removeProperty('--accent-strong');
    }

    body.style.backgroundImage = papierPeint ? `url("${papierPeint}")` : '';
    document.querySelectorAll('[data-theme]').forEach((b) => b.classList.toggle('active', b.dataset.theme === mode));
};

/** Durée par défaut du chrono, en millisecondes */
export const defaultDurationMs = (meta = getCachedMeta()) => {
    const { duration, durationTip } = meta.me.defaultTime;
    return duration * { secondes: 1000, minutes: 60000, heures: 3600000 }[durationTip];
};
