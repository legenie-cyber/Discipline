import { StorageDB } from "../models/data.js";

const db = new StorageDB('flowRecord', { persist: true, delay: 30 });
const container = document.querySelector('.sub-categories-container');

export function updateSubCategoryNames() {
    const subCategoryInputLength = document.querySelectorAll(".sub-category-row").length
    container
    .querySelectorAll('.sub-category-input')
    .forEach((input, idx) => {
        input.name = `sub-${idx + 1}`;
        if (input.value.trim()[0]) {
            
            input.value = input.value.trim()[0].toUpperCase() + input.value.trim()?.slice(1)
                  
        } else if(idx !== subCategoryInputLength - 1) {
            let deleteButton = input.nextElementSibling
            deleteButton ? removeSubCategory(deleteButton) : console.log("Delete button not found");
        }
    });
}

export async function getCategories() {
    const records = await db.all()
    const categories = [...new Set(records.map(r => r.categoryName))]
    return categories
}

export function createSubCategoryRow(value = '') {
    const row = document.createElement('div');
    row.className = 'sub-category-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'sub-category-input';
    input.placeholder = 'Entrez une tâche';
    input.value = value;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'remove-sub-category';
    deleteButton.textContent = '✕';

    row.append(input, deleteButton);
    return row;
}

export function getLastSubCategoryInput() {
    const rows = container.querySelectorAll('.sub-category-row');
    return rows[rows.length - 1]?.querySelector('.sub-category-input');
}

export function addSubCategory() {
    const inputs = container.querySelectorAll('.sub-category-input');
    const lastValue = inputs[inputs.length - 1]?.value.trim();
    
    if (!lastValue) {
        alert('Remplissez la dernière tâche avant d\'en ajouter une nouvelle');
        inputs[inputs.length - 1]?.focus();
        return;
    }
    container.appendChild(createSubCategoryRow());
    updateSubCategoryNames();
}

export function removeSubCategory(button) {
    const rows = container.querySelectorAll('.sub-category-row');
    if (rows.length === 1) {
        rows[0].querySelector('.sub-category-input').value = '';
        return;
    }
    button.closest('.sub-category-row').remove();
}

/**
 * 
 * @param {string} id id du template 
 * @returns {DocumentFragment}
 */
export function getContentById(id) {
    return document.getElementById(id).content.cloneNode(true)
}

/**
 * 
 * @param {string} name nom de l'évènement
 * @param {object} options 
 * @param {element} options.detail 
 * @param {boolean} options.bubbles garantit ou pas le système de propagation de l'évènement 
 * @param {boolean} options.cancelable garantit ou pas le "event.PrenventDefault()" à partir d'une condition sur le booléen 'event.defaultPrevented'
 * @param {HTMLElement} root point de départ de l'évnement
 */
export function createAndDispatchEvent(name, options = {}, root){
    options = Object.assign({},{
        detail:'',
        bubbles:false,
        cancelable:true
    },options)
    const event = new CustomEvent(name,options)
    root.dispatchEvent(event)
}

export function createElement(tagName,{id="", className="", innerHtml="", value=""}, data = {}) {
    const element = document.createElement(tagName)
    element.id = id
    element.className = className
    element.innerHtml = innerHtml
    element.value = value

    Object.keys(data).every(k => {
        element.dataset[k] = data[k]
    })
    return element
}

export function handleLongPress(targetElementSelector, callback, duration = 500) {
    const element = document.querySelector(targetElementSelector);
    let longPressTimer;
    
    element.addEventListener("pointerdown", ()=>{

        if (callback) callback()
        else 
        longPressTimer = setTimeout(() => {
            element.parentElement.children.forEach(el => {
                el.classList.remove("active")
            })
            console.log("longPress");
            element.classList.add("active")
        }, duration) 
    })
    
    element.addEventListener("pointerup", ()=>{
        clearTimeout(longPressTimer)
    })
    
    element.addEventListener("pointerleave", ()=>{
        clearTimeout(longPressTimer)
    })
    document.addEventListener("click", (ev)=>{
        if(!element.contains(ev.target) || element !== ev.target){
            element.classList.remove("active")
        }
    })
}

export function createAccount(appTittle, containerSelector =".container" ) {
    const greeting = `Salut! content de voir que tu utilise l'app Discipline. \n En quelques étapes, nous allons créer ton compte.`
    const container = document.querySelector(containerSelector)
    container.innerHTML = `
        <form>
            <div id="greeting" data-step="0" class="active step">
                <label>${greeting}</label>
            </div>
            <div id="name" data-step="1" class="step">
                
                <input type="text" required placeholder="Jane">
            </div>
            <div id="slug" data-step="2" class="step">
                <label>Choisissez un slug</label>
                <select>
                    <option value="Hi">Hi</option>
                    <option value="Hi There">Hi There</option>
                    <option value="Salut">Salut</option>
                    <option value="On y va">On y va</option>
                    <option value="Slug">Slug</option>
                </select>
            </div>
            <div id="email" data-step="1" class="step">
                <label>Commençons par votre nom</label>
                <input type="mail" required placeholder="Jane@gmail.com">
            </div>
            <div id="end">Félicitatioin! \n Votre compte a été bien crée. \n Maintenant vous pouvez commencer a utiliser
            <button type="submit">Suivant<button>
        </form>
    `

}



