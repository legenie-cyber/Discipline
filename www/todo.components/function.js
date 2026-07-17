/**
 * 
 * @param {string} id id du template 
 * @returns {DocumentFragment}
 */
export function cloneTemplate(id) {
    return document.getElementById(id).content.cloneNode(true)
}
