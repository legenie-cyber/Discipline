/**
 * 
 * @param {string} name nom de l'évènement
 * @param {object} options 
 * @param {element} options.detail 
 * @param {boolean} options.bubbles garantit ou pas le système de propagation de l'évènement 
 * @param {boolean} options.cancelable garantit ou pas le "event.PrenventDefault()" à partir d'une condition sur le booléen 'event.defaultPrevented'
 * @param {HTMLElement} root point de départ de l'évnement
 */
function createAndDispatchEvent(name, options = {}, root){
    options = Object.assign({},{
        detail:'',
        bubbles:false,
        cancelable:true
    },options)
    const event = new CustomEvent(name,options)
    root.dispatchEvent(event)
}

export class toDoList {

    filter = {type:''}
    itemList
    items = []
    /**
     * @param {HTMLElement} element 
     */
    constructor(element, autoStyle = false) {
        if (autoStyle) document.style += this.renderStyle
        this.element = (typeof element === HTMLElement )? element : document.querySelector(element)
        this.element.innerHTML = this.renderTodoList() /**Injecte la structure dans sur la page */ 
        
        this.itemList = this.element.querySelector('.list-group')
        this.form = this.element.querySelector('form')

        // this.element.append(this.#items) /**Injecte la liste des taches */
        this.addTask
        this.todoLayout()
        this.element.addEventListener('newenter', ev => this.dispatchQuery)
    }

    get renderStyle(){
        return `*{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root{
            --primary: blue;
            --secondary: white;
            --third: red;
        }



        #ToDoList{
            display: flex;
            flex-direction: column;
            gap: 1rem;
            justify-content: center;
            align-items: center;
            padding: 50px;
            min-width: 380px;
            max-width: 700px;
            height: max-content;
            padding-right: 100px;

        }

        form, #buttons ,label{
            width: 120%;
        }

        button{
            background-color: var(--primary);
            border-radius: 5px;
            color: white;
            border: none;
            padding: 5px;
        }

        button:hover{
            scale: 1.1;
        }
        input{
            width: 80%;
            height: 100%;
            padding: 5px;
            border-radius: 5px;
            border: 1px solid black;
        }

        #buttons button{
            background-color: var(--secondary);
            color: var(--primary);
            border: 1px solid var(--primary);
            transition: all 0.3s ease-in-out;
        }

        #buttons button:hover{
            color: var(--secondary);
            background-color: var(--primary);
        }

        .active{
            color: var(--secondary) !important;
            background-color: var(--primary) !important;
        }

        .list-group{
            padding: 3px;
        }

        label{
            display: flex;
            align-items: center;
            padding: 0;
            border: 1px solid silver;
            position: relative;
            padding: 7px;
            box-sizing: border-box;
            overflow: hidden;
        }

        .check-task{
            width: max-content;
            margin-right: 15px;
            scale: 1.2;
        }

        .nom-Tache{
            width: 300px;
        }

        .delete{
            position: absolute;
            right: 2px;
            background-color: var(--third);
            width: 26px;
            font-weight: 800;
        }

        .delete:hover{
            background-color: rgb(213, 5, 5);
        }

        .buttonChange{
            background-Color : blue;
            color : white;
        }

        .msg-error{
            padding: 20px;
            margin: 10px;
            color: red;
            border-radius: 20px;
            background-color: rgba(255, 0, 0, 0.317);
        }

        .show-todo .is-completed,
        .show-done label:not(.is-completed){
            transition: display .5s;
            display: none !important;
        }

        .list-group{
            transition: all .5s linear;
        }`
    }

    renderTodoList(){
        return `
        <form action="">
            <input type="text" placeholder="Entrer votre tache" name="title" required >
            <button type="submit">Ajouter</button>
        </form>
        <main>
            <div id="buttons">
                <button class="all active" >Toutes</button>
                <button class="todo">A faire</button>
                <button class="done">Faites</button>
            </div>
            <div class="list-group"></div>
            
        </main>`
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
        this.task = document.createElement("label")
        this.task.for = "check-task"
        this.task.innerHTML = this.renderItem()
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

    renderItem(){
        return `
            <input type="checkbox" class="check-task" name="check-task">
            <span class="nom-Tache"></span>
            <button class="delete">X</button>
        `
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

