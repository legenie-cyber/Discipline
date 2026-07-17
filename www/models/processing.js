
const container = document.querySelector('.sub-categories-container');

export function updateSubCategoryNames() {

    container.querySelectorAll('.sub-category-input').forEach((input, idx) => {
        input.name = `sub-${idx + 1}`;
        input.value = input.value.trim()[0].toUpperCase() + input.value.trim().slice(1)
              
    });
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

