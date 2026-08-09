import { StorageDB } from "../models/data.js";
import { createElement, createSubCategoryRow, getCategories, removeSubCategory, updateSubCategoryNames } from "../models/processing.js";

const form = document.querySelector('form');
const container = document.querySelector('.sub-categories-container');
const plusBtn = document.querySelector('.sub-plus-btn');
const drop = document.querySelector(".drop")
const db = new StorageDB('flowRecord', { persist: true, delay: 30 });

const renderCategories = async () => {
    const categories = await getCategories()
    categories.forEach(c => {
        const span = document.createElement('span')
        span.dataset.name = c
        span.textContent = c
        span.className = "category-span"
        drop.append(span)
    })
    handleSelect(".category-span", "#category-input")

}

const handleSelect = async (selector, inputSelector) => {
    document.querySelectorAll(selector)
    .forEach(el => {
        el.addEventListener("click", ev => {
            ev.preventDefault()
            document.querySelector(inputSelector).value = ev.currentTarget.innerText
        })
    })
}

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
    const sub_Categories = inputs.map(i => i.value.trim()).filter(Boolean);
    if (!categoryName) {
        alert('Entrez un nom pour la catégorie');
        document.querySelector('.category-name').focus();
        return;
    }
    if (!sub_Categories.length) {
        alert('Ajoutez au moins une sous-catégorie');
        inputs[0]?.focus();
        return;
    }
    sub_Categories.forEach(async el => {
        const record = 
        {
            taskName : el,
            categoryName :  categoryName,
            sessions: [] 
        }
        await db.insert(record);
    })
    alert(`${sub_Categories.length} tâche(s) Ajoutées à votre panel`);
    form.reset();
    container.innerHTML = '';
    container.appendChild(createSubCategoryRow());
    updateSubCategoryNames();
});
container.appendChild(createSubCategoryRow());
renderCategories()