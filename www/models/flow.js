import { toDoList } from "./todo-script.js";
import { getContentById } from "./processing.js";
import { Timer, TimerKeeper } from "./TimerManager.js";
import { StorageDB } from "./data.js";
/**
 * Permet de creer plusieurs todo List en parallele
 */
class Flow {
    constructor(taskModule = {}, toDoListWrapper) {
        if (!taskModule) {
            throw new Error("L'objet fournit n'est pas supportee ou est vide");
        }

        this._modules = taskModule
        this._wrapper = toDoListWrapper
        this.renderModule(this._modules)
        this.keeper = new TimerKeeper();
        this.db = new StorageDB("flowRecord")

    }

    renderModule(modules) {
        Array.from(modules).forEach((module, id)=>{
            const flowItem = new Item(module, id)
            this._wrapper.append(flowItem.element)

        })
    }
}

class Item extends Flow{

    constructor(module, id){
        super()
        const currentCategorie = JSON.parse(localStorage.getItem("currentCategorie")).nom
        this.element = document.createElement("section")
        this.element.classList.add('ToDoList')
        this.element.dataset.id = id
        this.element.append(getContentById("timer-layout"))

        this.newToDoList = new toDoList(this.element)
        this.element.querySelector(".categorie-title").innerText = currentCategorie
        this.element.querySelector(".task-title").innerText = module.name


        
        this.timer = this.keeper.create("stopwatch", module.name);
        this.timer.onTick((ms) => this.screen.innerText = Timer.formatMs(ms));

        this.playBtn = this.element.querySelector(".play")
        this.pauseBtn = this.element.querySelector(".pause")
        this.stopBtn = this.element.querySelector(".stop") 
        this.termineBtn = this.element.querySelector(".termine") 
        this.screen = this.element.querySelector(".timeLayout")       

        this.pauseBtn.disabled = true
        this.stopBtn.disabled = true

        this.timerControl()

        
    }

    timerControl(){
        this.playBtn.addEventListener("click", ev => {

            if (this.pauseBtn.disabled === true && this.stopBtn.disabled === true) {
                this.timer.start()

                // this.timer.onTick( () => {
                //     this.screen.innerText = this.timer.formatMs(this.timer._elapsed)
                // }, 1000)

                this.playBtn.disabled = true
                this.pauseBtn.disabled = false
                this.stopBtn.disabled = false
            } else {
                this.timer.resume()
                this.pauseBtn.disabled = false
                this.stopBtn.disabled = false
            }
        })
        this.pauseBtn.addEventListener("click", ev => {
        
            this.timer.pause()
            this.pauseBtn.disabled = true
            this.playBtn.disabled = false
        })
        this.stopBtn.addEventListener("click", ev => {
            this.timer.stop()
            this.element.dataset.statu = "stope"
            this.playBtn.disabled = true
            this.stopBtn.disabled = true
            this.pauseBtn.disabled = true

            this.screen.style.color = 'red'
            this.element.children.forEach(child => {
                child.disabled = true
            })
        })
        this.termineBtn.addEventListener("click", ev => {
            this.saveTask()
            this.element.remove()
        })
    }

    saveTask(){
        this.element.dataset.statu = "termine"
        let item = {
            categorie :  this.element.querySelector(".categorie-title").innerText,
            title : this.element.querySelector(".task-title").innerText ,
            timeMs : this.timer._elapsed,
            time : this.screen.innerText,
            todolist : []
        }

        Array.from(document.querySelector(".list-group").children).forEach(child => {
          item.todolist.push(this.info(child)) 
        })
        try {
            
            this.db.insert(item)
            console.log("Insertion reussie");
        } catch (error) {
            throw new Error("L'insertion n'a pas pu se faire");
            
        }
    }

    info(elem){
        let info = {}
        info.name = elem.querySelector(".nom-Tache").innerText
        info.statu = elem.querySelector(".check-task:checked") ? "complet" : "incomplet"
        return info
    }

}

let modules = JSON.parse(localStorage.getItem("taskModule"))

const flow = new Flow(modules, document.getElementById("wrapper"))

