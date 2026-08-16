/**
 * TimerManager.js
 * Une classe JS progressive pour gérer différents types de timers :
 * - Chronomètre (stopwatch)
 * - Compte à rebours (countdown)
 * - Sablier (hourglass) : countdown avec % de progression
 * - Horloge (clock) : affichage de l'heure réelle
 * - TimerKeeper : gestionnaire capable de piloter plusieurs timers nommés
 */

/* ============================================================
   1. CLASSE DE BASE : Timer
   Fournit les méthodes élémentaires communes à tous les timers.
   ============================================================ */
class Timer {
  constructor(name = "timer") {
    this.name = name;
    this._running = false;
    this._startTime = null;   // instant de départ (ms)
    this._elapsed = 0;        // temps écoulé cumulé (ms)
    this._intervalId = null;
    this._tickCallback = null;
    this._tickRateMs = 100;   // fréquence de mise à jour par défaut
  }

  // --- Méthodes élémentaires ---

  start() {
    if (this._running) return this;
    this._running = true;
    this._startTime = Date.now();
    this._loop();
    return this;
  }

  stop() {
    if (!this._running) return this;
    this._running = false;
    this._elapsed += Date.now() - this._startTime;
    clearInterval(this._intervalId);
    this._intervalId = null
    return this;
  }

  pause() {
    return this.stop(); // alias sémantique
  }

  resume() {
    return this.start();
  }

  reset() {
    this.stop();
    this._elapsed = 0;
    return this;
  }

  getElapsedMs() {
    if (this._running) {
      return this._elapsed + (Date.now() - this._startTime);
    }
    return this._elapsed;
  }

  isRunning() {
    return this._running;
  }

  onTick(callback, rateMs = 100) {
    this._tickCallback = callback;
    this._tickRateMs = rateMs;
    return this;
  }

  _loop() {
    clearInterval(this._intervalId);
    this._intervalId = setInterval(() => {
      if (this._tickCallback) this._tickCallback(this.getElapsedMs());
    }, this._tickRateMs);
  }

  static formatMs(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  static formatString(string){
    const timePatch = string.split(":")
    const hours_ms = timePatch[0] ? timePatch[0] * 3600 * 1000 : 0
    const minutes_ms = timePatch[1] ? timePatch[1] * 60 * 1000 : 0
    const secondes_ms = timePatch[2] ? timePatch[2] * 1000 : 0
    const ms = timePatch[3] ? timePatch[3] : 0

    return hours_ms + minutes_ms + secondes_ms + ms
  }
}

/* ============================================================
   2. CHRONOMÈTRE (Stopwatch)
   Hérite de Timer, ajoute la notion de "tours" (laps).
   ============================================================ */
class Stopwatch extends Timer {
  constructor(name = "stopwatch") {
    super(name);
    this._laps = [];
  }

  lap() {
    const t = this.getElapsedMs();
    this._laps.push(t);
    return t;
  }

  getLaps() {
    return [...this._laps];
  }

  reset() {
    super.reset();
    this._laps = [];
    return this;
  }
}

/* ============================================================
   3. COMPTE À REBOURS (Countdown)
   Timer qui décompte depuis une durée donnée et déclenche
   un callback à la fin.
   ============================================================ */
class Countdown extends Timer {
  constructor(durationMs, name = "countdown") {
    super(name);
    this._duration = durationMs;
    this._onFinish = null;
  }

  onFinish(callback) {
    this._onFinish = callback;
    return this;
  }

  getRemainingMs() {
    const remaining = this._duration - this.getElapsedMs();
    return remaining > 0 ? remaining : 0;
  }

  _loop() {
    clearInterval(this._intervalId);
    this._intervalId = setInterval(() => {
      const remaining = this.getRemainingMs();
      if (this._tickCallback) this._tickCallback(remaining);

      if (remaining <= 0) {
        this.stop();
        if (this._onFinish) this._onFinish();
      }
    }, this._tickRateMs);
  }

  reset(newDurationMs = this._duration) {
    super.reset();
    this._duration = newDurationMs;
    return this;
  }
}

/* ============================================================
   4. SABLIER (Hourglass)
   Spécialisation du Countdown : expose la progression en %
   et un état visuel (grains qui tombent).
   ============================================================ */
class Sablier extends Countdown {
  constructor(durationMs, name = "sablier") {
    super(durationMs, name);
  }

  getProgress() {
    // 0 = plein en haut, 100 = tout est tombé en bas
    const done = this._duration - this.getRemainingMs();
    return Math.min(100, Math.round((done / this._duration) * 100));
  }

  getVisualState() {
    const p = this.getProgress();
    const totalGrains = 20;
    const fallen = Math.round((p / 100) * totalGrains);
    return {
      top: "•".repeat(totalGrains - fallen),
      bottom: "•".repeat(fallen),
      progress: p,
    };
  }

  retourner() {
    // "Retourne" le sablier : relance un compte à rebours identique
    this.reset(this._duration);
    this.start();
    return this;
  }
}

/* ============================================================
   5. HORLOGE (Clock)
   Affiche l'heure réelle, indépendamment de tout chronométrage.
   ============================================================ */
class Horloge {
  constructor(timeZone = null) {
    this._intervalId = null;
    this._tickCallback = null;
    this._timeZone = timeZone; // ex: "Europe/Paris", null = locale du navigateur
  }

  getCurrentTime() {
    const opts = this._timeZone ? { timeZone: this._timeZone } : {};
    return new Date().toLocaleTimeString("fr-FR", opts);
  }

  getCurrentDate() {
    const opts = this._timeZone ? { timeZone: this._timeZone } : {};
    return new Date().toLocaleDateString("fr-FR", opts);
  }

  onTick(callback) {
    this._tickCallback = callback;
    return this;
  }

  start() {
    clearInterval(this._intervalId);
    this._intervalId = setInterval(() => {
      if (this._tickCallback) this._tickCallback(this.getCurrentTime());
    }, 1000);
    return this;
  }

  stop() {
    clearInterval(this._intervalId);
    return this;
  }
}

/* ============================================================
   6. TIMER KEEPER
   Gestionnaire de haut niveau : crée, stocke et pilote
   plusieurs timers nommés (chronos, countdowns, sabliers...).
   ============================================================ */
class TimerKeeper {
  constructor() {
    this._timers = new Map();
  }

  create(type, name, options = {}) {
    let timer;
    switch (type) {
      case "stopwatch":
        timer = new Stopwatch(name);
        break;
      case "countdown":
        timer = new Countdown(options.durationMs ?? 60000, name);
        break;
      case "sablier":
        timer = new Sablier(options.durationMs ?? 60000, name);
        break;
      case "horloge":
        timer = new Horloge(options.timeZone ?? null);
        break;
      default:
        throw new Error(`Type de timer inconnu : ${type}`);
    }
    this._timers.set(name, timer);
    return timer;
  }

  get(name) {
    return this._timers.get(name);
  }

  startAll() {
    this._timers.forEach((t) => t.start());
    return this;
  }

  stopAll() {
    this._timers.forEach((t) => t.stop());
    return this;
  }

  remove(name) {
    const t = this._timers.get(name);
    if (t) t.stop();
    return this._timers.delete(name);
  }

  list() {
    return [...this._timers.keys()];
  }
}

/* ============================================================
   EXEMPLE D'UTILISATION (à retirer / adapter selon le besoin)
   ============================================================ */
/*
const keeper = new TimerKeeper();

const chrono = keeper.create("stopwatch", "montest");
chrono.onTick((ms) => console.log("Chrono:", Timer.formatMs(ms)));
chrono.start();

const cpt = keeper.create("countdown", "cuisson", { durationMs: 10000 });
cpt.onTick((ms) => console.log("Reste:", Timer.formatMs(ms)));
cpt.onFinish(() => console.log("Terminé !"));
cpt.start();

const sablier = keeper.create("sablier", "pause", { durationMs: 5000 });
sablier.onTick(() => console.log(sablier.getVisualState()));
sablier.start();

const horloge = keeper.create("horloge", "reveil");
horloge.onTick((h) => console.log("Il est", h));
horloge.start();
*/

export { Timer, Stopwatch, Countdown, Sablier, Horloge, TimerKeeper };
