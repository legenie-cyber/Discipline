import { toDoList } from "./todo-script.js";
import { getContentById } from "./processing.js";
import { Timer, TimerKeeper } from "./TimerManager.js";
import { StorageDB } from "./data.js";
import { FestiveUI } from "./festiveUi.js";
import { defaultDurationMs } from "./meta.js";
/**
 * Permet de creer plusieurs todo List en parallele
 */
export class Flow {
    status = null
    _ui = new FestiveUI({
        popupPosition: 'bottom-right',
        colors: [
            { name: 'accent', value: '#5647ea' },
            { name: 'particle', value: '#ffd166' },
            { name: 'particle', value: '#3ba3c9' }
        ]
    });

    constructor(taskModule = {}, Wrapper) {
        
        if (!taskModule) {
            throw new Error("L'objet fournit n'est pas supportee ou est vide");
        }
        this._modules = taskModule
        this._wrapper = Wrapper
        this.renderModule(this._modules)
        this.keeper = new TimerKeeper();
        this.db = new StorageDB("flowRecord")

        this._completed = document.querySelector(".completed .value")
        this._stopped = document.querySelector(".stopped .value")
        this._effectif = document.querySelector(".effectif") // ca recupere juste le premier champ d'effectif

        this._effectif.innerText = this._modules.length
        this.initPagination()
    }

    /**
     * cree et affiche les element du carrousel
     * @param {Object} modules 
     */
    renderModule(modules) {
        Array.from(modules).forEach((module, id)=>{
            const flowItem = new Item(module, id)
            this._wrapper.append(flowItem.element)
        })
    }

    initPagination(){
        for (let i = 0; i < this._modules.length ; i++) {
            const point = document.createElement("span");
            point.innerText = "•"
            point.dataset.id = i
            document.querySelector(".pagination").append(point)
        }
    }

    updatePagination(id){
        document.querySelectorAll(".pagination span").forEach((point, idx) => {
            // point.style = "scale: 1;"
                point.style.fontSize = "1rem"


            if (id == idx) {
                point.style.fontSize = "1.5rem"
            }
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
    #ttl = 0/* time to live en miliseconde*/
    #currentTurn = -1
    #activeRing = 0
    #colorIndex = 0
    isRunning = false // Indique si la tache est encours ou bien si elle est termine/stoppee
    status = null // Indique le statu precis de la tache: play, pause, stop ou termine

    constructor(module, id){
        super()
        this.#ttl = Timer.formatString(module.time) || this.defaultDuration()
        
        this.element = document.createElement("section")
        this.element.classList.add('ToDoList')
        this.element.dataset.id = id
        this.element.append(getContentById("timer-layout"))

        this.newToDoList = new toDoList(this.element)
        this.element.querySelector(".categorie-title").innerText = module.categoryName
        this.element.querySelector(".task-title").innerText = module.taskName
       
        this.timer = this.keeper.create("stopwatch", module.taskName);
        // le callBack est appele avec en parametre le temps ecoule (elapsed)
        this.timer.onTick((ms) => {
            this.screen.innerText = Timer.formatMs(ms)
            this.updateProgress(ms, this.#ttl)
            this.controlTtl(ms)
        });

        this.circle1 = this.element.querySelector("#timer-ring-1")
        this.circle2 = this.element.querySelector("#timer-ring-2")
        this.playPauseBtn = this.element.querySelector(".play-pause")
        // this.pauseBtn = this.element.querySelector(".pause")
        this.stopBtn = this.element.querySelector(".stop") 
        this.termineBtn = this.element.querySelector(".termine") 
        this.screen = this.element.querySelector(".timeLayout")       

        this.stopBtn.disabled = true
        this.timerControl()        
    }

    defaultDuration(){
        return defaultDurationMs()
    }

    timerControl(){
        this.playPauseBtn.addEventListener("click", ev => {
            const currentBtn = ev.currentTarget
            const state = currentBtn.dataset.state

            if (state === "play") {

                if ( this.stopBtn.disabled === true)
                    this.timer.start() 
                else 
                    this.timer.resume() 
                    this.isRunning = true
                    this.status = "playing"
                    this.stopBtn.disabled = false
                    currentBtn.dataset.state = "pause"

            } else if (state === "pause") {
                this.timer.pause()
                this.status = "paused"
                currentBtn.dataset.state = "play"
            }
            
        })

        this.stopBtn.addEventListener("click", async ev => {
            this.isRunning = false
            this.status = "stoped"
            
            this.element.dataset.statu = "stoped"
            this.playPauseBtn.disabled = true
            this.stopBtn.disabled = true
            this.timer.stop()
            await this.saveTask()
            this.screen.style.color = 'red'
            this.element.disabled = true
        })

        this.termineBtn.addEventListener("click",async  ev => {

            this.element.dataset.statu = "termine"
            this.isRunning = false
            this.status = "ended"
            await this.saveTask()
            this._completed.innerText = parseInt(this._completed.innerText) + 1
            if (this._completed.innerText == this._effectif.innerText) {
                this._ui.confettis()
                 this._ui.popup("Toute les tâches sont terminées", {type: "success", title: "Terminé"})

            }
            this.timer.stop()
            this._ui.paillettes()
            setTimeout(() => {
                this._ui.stopAll()
            }, 1500);

            //on bloque toute action
            this.element.querySelector(".firstButtons").style.display = "none"
        })
    }

    controlTtl = async (ms)=>{
        if (ms >= this.#ttl) {
            this.timer.pause()
            this.status = "termine"
            await this._ui.alert("Limite de temps atteinte \n Vous pouvez cliquer sur play pour continuer", { title: 'Temps écoulé' })
            this.playPauseBtn.dataset.state = "play" // le state est pour des fin purement visulle et n'impacte en rien le timer
            this.controlTtl = () => null
        }
    }

    async saveTask(){
        // categoryName :  this.element.querySelector(".categorie-title").innerText,
        // taskName : this.element.querySelector(".task-title").innerText ,
        const session = {
            timeMs : Timer.formatString(this.screen.innerText),
            time : this.screen.innerText,
            status: this.status,
            date: (new Date).toISOString(),
            todolist : []
        }

        Array.from(document.querySelector(".list-group").children).forEach(child => {
          session.todolist.push(this.info(child)) 
        })

        const taskName = this.element.querySelector(".task-title").innerText
        const categoryName = this.element.querySelector(".categorie-title").innerText
        // categoryName dans le sélecteur : deux catégories peuvent avoir une tâche du même nom
        const response = await this.db.update({ taskName, categoryName }, (r) => { (r.sessions ??= []).push(session) })
        console.log("Reponse de l'update" + response)
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

let modules = null
try { modules = JSON.parse(localStorage.getItem("taskModule")) } catch { /* valeur corrompue */ }

if (!Array.isArray(modules) || modules.length === 0) {
    location.replace("./homePage.html") // aucune tâche sélectionnée : rien à démarrer ici
} else {
    const flow = new Flow(modules, document.getElementById("wrapper"))
    const tasks = document.querySelectorAll('.ToDoList')

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) flow.updatePagination(entry.target.dataset.id)
        })
    }, {root: document.querySelector("#wrapper"), threshold: 0.6})

    tasks.forEach(task => observer.observe(task))
}
