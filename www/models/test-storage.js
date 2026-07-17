// Script de démonstration pour peupler la "categories" DB et vérifier la persistance
import { StorageDB } from './data.js';

(async () => {
  try {
    const db = new StorageDB('categories', { persist: true, delay: 10 });

    // Nettoie puis insère des catégories d'exemple
    await db.clear();

    await db.insert({
      name: 'Etudes',
      subCategories: ['Maths', 'Programmation C', 'Programmation Java']
    });

    await db.insert({
      name: 'Menage',
      subCategories: ['Lessive', 'Vaisselle', 'Divers']
    });

    await db.insert({
      name: 'Lecture',
      subCategories: ['Nos astres opposés', 'Bible']
    });

    const all = await db.all();
    console.log('Données insérées dans StorageDB:', all);

    // Affiche le contenu persistant dans localStorage
    if (typeof localStorage !== 'undefined') {
      console.log('localStorage["categories"] =', localStorage.getItem('categories'));
    } else {
      console.log('localStorage non disponible dans cet environnement.');
    }

    alert('Script de démonstration exécuté — vérifiez la console pour les résultats.');
  } catch (err) {
    console.error('Erreur dans test-storage:', err);
  }
})();
