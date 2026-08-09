import { toDoList } from "./todo-script.js";
import { getContentById } from "./processing.js";
import { Timer, TimerKeeper } from "./TimerManager.js";
import { StorageDB } from "./data.js";
/**
 * Permet de creer plusieurs todo List en parallele
 */
export class Flow {
    status = null

    constructor(taskModule = {}, toDoListWrapper) {
        if (!taskModule) {
            throw new Error("L'objet fournit n'est pas supportee ou est vide");
        }

        this._modules = taskModule
        this._wrapper = toDoListWrapper
        this.renderModule(this._modules)
        this.keeper = new TimerKeeper();
        this.db = new StorageDB("flowRecord")
        Flow.resumeData()
    }

    renderModule(modules) {
        Array.from(modules).forEach((module, id)=>{
            const flowItem = new Item(module, id)
            this._wrapper.append(flowItem.element)
        })
    }

    static async  resumeData(){
        const data = await (new StorageDB("flowRecord")).find() 
        const baseData = await (new StorageDB("categories")).find() 
        
        let resumedData = []
        /**
         * serialisation des donnees
         * resumedData = [...{
         *       taskName,
         *       categoryName,
         *       taskNbOccurances,
         *       totalDuration,
         *       history: [...{createdAt, duration, statu, ...todo}]
         *      }]
         */

        baseData.forEach((elem) => {
            const categoryName = elem.name
            let tmp1 = data.filter(val => val.categoryName === categoryName)

            if (tmp1.length > 0) {
                let duration = 0

                tmp1.forEach(item => {
                    duration += Number(item.timeMs)
                })
                let tmp2 = {
    
                    taskName: tmp1[0].taskName,
                    categoryName: categoryName,
                    taskNbOccurances: tmp1.length,
                    totalDuration: duration,

                    history: tmp1.map(item => ({ 
                            createdAt: item.createdAt, 
                            duration: item.timeMs, 
                            status: item.status, 
                            todolist: elem.todolist
                    }))
                }
                resumedData.push(tmp2)
            }
            
        })
        console.log(resumedData);
        return resumedData;
        
    }
}

class Item extends Flow{
    timer = null
    #ringPgRadius = 140
    #circumference = 2 * Math.PI * this.#ringPgRadius
    #ttl = this.defaultDuration() /* time to live en miliseconde*/
    #currentTurn = -1
    #activeRing = 0
    #colorIndex = 0
    isRunning = false // Indique si la tache est encours ou bien si elle est termine/stoppee
    status = null // Indique le statu precis de la tache: play, pause, stop ou termine

    constructor(module, id){
        super()
        const currentCategorie = JSON.parse(localStorage.getItem("currentCategorie")).name
        this.element = document.createElement("section")
        this.element.classList.add('ToDoList')
        this.element.dataset.id = id
        this.element.append(getContentById("timer-layout"))

        this.newToDoList = new toDoList(this.element)
        this.element.querySelector(".categorie-title").innerText = currentCategorie
        this.element.querySelector(".task-title").innerText = module.name


        
        this.timer = this.keeper.create("stopwatch", module.name);
        // le callBack est appele avec en parametre le temps ecoule (elapsed)
        this.timer.onTick((ms) => {
            this.screen.innerText = Timer.formatMs(ms)
            this.updateProgress(ms, this.#ttl)
        });

        this.circle1 = this.element.querySelector("#timer-ring-1")
        this.circle2 = this.element.querySelector("#timer-ring-2")
        this.playBtn = this.element.querySelector(".play")
        this.pauseBtn = this.element.querySelector(".pause")
        this.stopBtn = this.element.querySelector(".stop") 
        this.termineBtn = this.element.querySelector(".termine") 
        this.screen = this.element.querySelector(".timeLayout")       

        this.pauseBtn.disabled = true
        this.stopBtn.disabled = true

        this.timerControl()        
    }

    defaultDuration(){
        if (!localStorage.getItem("defaultDuration")) {
            return 30000 // 30sec
        }

        let duration = parseInt(JSON.parse(localStorage.getItem("defaultDuration")).duration)
        let durationTip = JSON.parse(localStorage.getItem("defaultDuration")).durationTip

        switch (durationTip) {
            case "secondes":
                return duration * 1000
                break;
            case "minutes":
                return duration * 60 * 1000
                break;
            case "heures": 
                return duration * 3600 * 1000
        
            default:
                return 30000
                break;
        }
    }

    timerControl(){
        this.playBtn.addEventListener("click", ev => {

            if (this.pauseBtn.disabled === true && this.stopBtn.disabled === true) {
                this.timer.start()
                this.isRunning = true
                this.status = "playing"

                // this.timer.onTick( () => {
                //     this.screen.innerText = this.timer.formatMs(this.timer._elapsed)
                // }, 1000)

                this.playBtn.disabled = true
                this.pauseBtn.disabled = false
                this.stopBtn.disabled = false
            } else {
                this.timer.resume()
                this.isRunning = true
                this.status = "playing"
                this.pauseBtn.disabled = false
                this.stopBtn.disabled = false
            }
        })
        this.pauseBtn.addEventListener("click", ev => {
        
            this.timer.pause()
            this.pauseBtn.disabled = true
            this.playBtn.disabled = false
            this.status = "paused"
        })
        this.stopBtn.addEventListener("click", ev => {
            this.isRunning = false
            this.status = "stoped"
            
            this.element.dataset.statu = "stoped"
            this.playBtn.disabled = true
            this.stopBtn.disabled = true
            this.pauseBtn.disabled = true
            
            this.timer.stop()
            this.saveTask()
            this.screen.style.color = 'red'
            this.element.children.forEach(child => {
                child.disabled = true
            })
        })
        this.termineBtn.addEventListener("click", ev => {
            this.element.dataset.statu = "termine"
            this.isRunning = false
            this.status = "ended"
            this.saveTask()
            this.timer.stop()

        })
    }

    saveTask(){
        // categoryName :  this.element.querySelector(".categorie-title").innerText,
        // taskName : this.element.querySelector(".task-title").innerText ,
        const session = {
            timeMs : this.timer._elapsed,
            time : this.screen.innerText,
            status: this.status,
            date: (new Date).toISOString(),
            todolist : []
        }

        Array.from(document.querySelector(".list-group").children).forEach(child => {
          session.todolist.push(this.info(child)) 
        })

        try {
            const taskName = this.element.querySelector(".task-title").innerText
            this.db.patch(taskName, (r) =>{r.sessions.push(session)})
            console.log("Insertion reussie");
        } catch (error) {
            throw new Error("L'insertion n'a pas pu se faire");
        }
    }

    info(elem){
        let info = {}
        info.name = elem.querySelector(".nom-Tache").innerText
        info.status = elem.querySelector(".check-task:checked") ? "complet" : "incomplet"
        return info
    }

    /**
     * il y a 2 anneaux par domaine(item) soit :
     * anneau 1 => 2k ; anneau 2 => 2k + 1; k = indice du domaine
     * @param {Number} elapsed temps ecoule
     * @param {Number} totalDuration temps total
     * @returns 
     * 
     */
    updateProgress(elapsed, totalDuration){
        const arrayColors = ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#8f00ff"]
        if (!this.timer._running) return;
 
        const cycle = Math.floor(elapsed / totalDuration)
        const progress = (elapsed % totalDuration) / totalDuration // ratio dans le tour en cours

        const offset = this.#circumference - ( this.#circumference * progress)
        this.circle2.style.strokeDashoffset = offset

        if (cycle !== this.#currentTurn) {
            this.#currentTurn = cycle
            const color = arrayColors[this.#colorIndex % arrayColors.length]
            this.#colorIndex++

            if (this.#activeRing === 0) {
                this.circle1.style.stroke = color
                this.circle1.style.boxShadow = `0 0 4px ${color}` 
            } else {
                this.circle2.style.stroke = color
                this.circle2.style.boxShadow = `0 0 4px ${color}` 

            }
            this.#activeRing = 1 - this.#activeRing
        }
    }

}

let modules = JSON.parse(localStorage.getItem("taskModule"))

const flow = new Flow(modules, document.getElementById("wrapper"))
