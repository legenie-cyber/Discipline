// Appliqué sur chaque page : thème + salutation (slug / prénom).
// Toute la logique des métadonnées vit dans meta.js.
import { applyTheme, getCachedMeta, loadMeta } from './meta.js';

// 1. Immédiat : thème depuis le cache (pas d'attente de la base)
applyTheme(getCachedMeta());

// 2. Aperçu en direct quand on clique sur un bouton de mode (inscription, réglages).
//    L'enregistrement est fait par la page concernée.
document.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => {
        const meta = getCachedMeta();
        meta.theme.mode = button.dataset.theme;
        applyTheme(meta);
    });
});

// 3. Référence : la base. Met à jour le thème et la salutation.
const fillGreeting = (meta) => {
    const slugEl = document.querySelector('.slug');
    const subNameEl = document.querySelector('.sub-name');
    if (slugEl && meta.me.slug) slugEl.textContent = meta.me.slug;
    if (subNameEl && meta.me.subName) subNameEl.textContent = meta.me.subName;
};

loadMeta()
    .then((meta) => {
        if (!meta) return; // pas encore de compte (page d'inscription)
        applyTheme(meta);
        fillGreeting(meta);
    })
    .catch((error) => console.error('Impossible de charger les métadonnées', error));
