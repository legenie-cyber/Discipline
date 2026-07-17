// /**
//  * @param {string} id 
//  * @returns {}
//  */
// function getContentById(id) {
//     return document.getElementById(id).content.cloneNode(true)
// }

// /**
//  * 
//  * @param {string} name nom de l'évènement
//  * @param {object} options 
//  * @param {element} options.detail 
//  * @param {boolean} options.bubbles garantit ou pas le système de propagation de l'évènement 
//  * @param {boolean} options.cancelable garantit ou pas le "event.PrenventDefault()" à partir d'une condition sur le booléen 'event.defaultPrevented'
//  * @param {HTMLElement} root point de départ de l'évnement
//  */
// function createAndDispatchEvent(name, options = {}, root){
//     options = Object.assign({},{
//         detail:'',
//         bubbles:false,
//         cancelable:true
//     },options)
//     const event = new CustomEvent(name,options)
//     root.dispatchEvent(event)
// }
import { createAndDispatchEvent, getContentById } from "../models/processing.js";

export class toDoList {

    filter = {type:''}
    itemList
    items = []
    /**
     * @param {HTMLElement} element 
     */
    constructor(element) {
        this.element = element
        this.element.append(getContentById('todolist-layout')) /**Injecte la structure dans sur la page */ 
        this.itemList = this.element.querySelector('.list-group')
        this.form = this.element.querySelector('form')

        // this.element.append(this.#items) /**Injecte la liste des taches */
        this.addTask
        this.todoLayout()
        this.element.addEventListener('newenter', ev => this.dispatchQuery)
    }
    /**
     * Permet l'ajout d'une tache soit suite a la soumission du formulaire ou a la saisie de la touche entrer
     */
    get addTask(){ 
        this.form.addEventListener('submit', event =>{
            event.preventDefault()
            let data = new FormData(this.form).get('title').trim()
            let tache = new item(data, this.items);
            this.itemList.prepend(tache.task)
            this.form.reset()
            createAndDispatchEvent('newenter', {bubbles:true}, this.form)
        })

       
        this.form.focus
    }

    todoLayout(){
        const buttons = this.element.querySelector('#buttons')
        buttons.querySelectorAll('button')
         .forEach(button => {
            button.addEventListener('click', e => this.menuLayout(e.currentTarget))
        });

    }

    /**
     * @param {HTMLButtonElement} element 
     */
    menuLayout(button){
        // supprime la classe acive sur les autres boutons qui ne sont pas sélectionné
        for(let child of button.parentElement.children) {
            child.classList.remove('active')
        }
        button.classList.add('active')

        if (button.classList.contains('todo')) {
            this.itemList.classList.add('show-todo')
            this.itemList.classList.remove('show-done')
            this.filter.type = 'todo'
        } else if (button.classList.contains('done')) {

            this.itemList.classList.add('show-done')
            this.itemList.classList.remove('show-todo')
            this.filter.type = 'done'
        }
        else{
             this.itemList.classList.remove('show-done')
            this.itemList.classList.remove('show-todo')
            this.filter.type = 'all'
        }
    }

    // affiche la boite de dialogue à partie de l'évènement crée pour des cas précis de position des tâches
    get dispatchQuery(){
        // ne marge que lors d'une nouvelle entrée sous l'onglet 'faites'
        if (this.filter.type === 'done') {
            alert('votre tache ne figure pas encore dans cet onglet')
        } 
    }
}

class item{
    
    taskName
    task
    items = []
    
    /**
     * @param {string} nomTache 
    */
    constructor(nomTache, items) {
        this.task = getContentById('todolist-item').firstElementChild
        this.taskName = this.task.querySelector('span')
        this.taskName.innerText = nomTache
        // this.items = items
        // this.items.push(nomTache)
        
        let deleteButton = this.task.querySelector('.delete')
        deleteButton.addEventListener('click', event => {this.task.remove()})

        let input = this.task.querySelector('input')
        input.addEventListener('change', event => this.toggle(event.currentTarget))
        this.taskName.addEventListener('click', event => this.taskModification)
    }

    /**
     * change l'état de la tache
     * @param {HTMLInputElement} checkBox 
     */
    toggle(checkBox){
        if (checkBox.checked) {
            this.task.classList.add('is-completed')
        }else{
            this.task.classList.remove('is-completed')
        }
    }

    get taskModification(){

        let newName = prompt('Entrez la modification à faire sur le nom de la t\âche', this.taskName.innerText)
        if (newName === null) {
            return
        }
        // this.items =  this.items.map(el => { 
        //     if (el === this.taskName.innerText){
        //         return newName
        //     } else{
        //         return this.taskName.innerText
        //     }
        // })

        this.taskName.innerText = newName
        // console.log(this.items);
        
    }

}

