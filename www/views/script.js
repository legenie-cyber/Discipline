import { StorageDB } from "../models/data.js";
import { addSubCategory, createSubCategoryRow, removeSubCategory, updateSubCategoryNames } from "../models/processing.js";

const form = document.querySelector('form');
const container = document.querySelector('.sub-categories-container');
const plusBtn = document.querySelector('.sub-plus-btn');
const db = new StorageDB('categories', { persist: true, delay: 30 });
const themeButtons = document.querySelectorAll('[data-theme]');

const applyTheme = name => {
    document.body.classList.remove('theme-day', 'theme-night', 'theme-nature');
    document.body.classList.add(`theme-${name}`);
    localStorage.setItem('appTheme', name);
    themeButtons.forEach(button => button.classList.toggle('active', button.dataset.theme === name));
};

const initTheme = () => {
    const savedTheme = localStorage.getItem('appTheme') || 'day';
    applyTheme(savedTheme);
    themeButtons.forEach(button => button.addEventListener('click', () => applyTheme(button.dataset.theme)));
};

plusBtn.addEventListener('click', e => {
    e.preventDefault();
    
    container.appendChild(createSubCategoryRow());
    updateSubCategoryNames();
});

container.addEventListener('click', e => {
    if (e.target.classList.contains('remove-sub-category')) {
        removeSubCategory(e.target);
    }
});

form.addEventListener('submit', async e => {
    e.preventDefault();

    const categoryName = document.querySelector('.category-name').value.trim();
    const inputs = Array.from(document.querySelectorAll('.sub-category-input'));
    const subCategories = inputs.map(i => i.value.trim()).filter(Boolean);

    if (!categoryName) {
        alert('Entrez un nom pour la catégorie');
        document.querySelector('.category-name').focus();
        return;
    }

    if (!subCategories.length) {
        alert('Ajoutez au moins une sous-catégorie');
        inputs[0]?.focus();
        return;
    }

    await db.insert({ name: categoryName, subCategories });
    alert(`Catégorie "${categoryName}" créée avec ${subCategories.length} tâche(s)`);
    
    form.reset();
    container.innerHTML = '';
    container.appendChild(createSubCategoryRow());
    updateSubCategoryNames();
});

container.appendChild(createSubCategoryRow());
updateSubCategoryNames();
initTheme();