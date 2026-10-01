/**
 * FestiveUI
 * ---------
 * Classe autonome (sans dépendance) qui fournit :
 *  - des animations d'ambiance : paillettes (sparkle), flocons (snow), confettis (confetti)
 *  - des notifications "popup" glissantes (translate), positionnables dans un coin de l'écran
 *  - des équivalents stylés de alert() / confirm() / prompt(), basés sur des Promises
 *
 * Isolation entre instances :
 *  - chaque instance possède un identifiant unique (`this.#id`)
 *  - chaque instance injecte sa PROPRE feuille de style (aucun <style> ni aucune
 *    variable CSS partagés entre instances), avec ses couleurs déjà interpolées
 *  - tous les éléments créés (canvas, conteneurs de popups, overlay des dialogues)
 *    portent la classe de l'instance, donc deux instances peuvent vivre côte à
 *    côte avec des thèmes totalement différents sans interférence
 *
 * Utilisation :
 *   const ui = new FestiveUI({
 *     popupPosition: 'bottom-right',
 *     colors: [
 *       { name: 'accent', value: '#ea6c47' },
 *       { name: 'particle', value: '#ffd166' } // couleur supplémentaire réservée aux confettis/paillettes
 *     ]
 *   });
 *   ui.confetti();
 *   ui.popup('Message enregistré', { type: 'success' });
 *   const ok = await ui.confirm('Supprimer cet élément ?');
 */
export class FestiveUI {

  static #instanceCount = 0; // sert uniquement à générer un identifiant unique, aucun état visuel partagé

  #id;
  #colors;         // Map<nomDeRôle, valeurCss> — propre à cette instance
  #particleColors; // tableau de couleurs utilisées par confetti()/sparkle() — propre à cette instance

  #canvas = null;
  #ctx = null;
  #particles = [];
  #rafId = null;
  #snowActive = false;
  #sparkleActive = false;
  #snowDensity = 0.5;
  #sparkleDensity = 0.4;
  #sparkleColors = null;
  #containers = new Map(); // une zone de popups par position ('bottom-right', etc.), propre à l'instance

  #reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * @param {Object} options
   * @param {string} [options.popupPosition='bottom-right'] 'bottom-right'|'bottom-left'|'top-right'|'top-left'
   * @param {{name:string, value:string}[]} [options.colors] palette propre à l'instance.
   *   Noms reconnus pour l'habillage (accent, accentHover, accentSoft, success, warning,
   *   error, surface, text, textMuted, border). Un objet avec `name:'particle'` (répétable)
   *   ajoute une couleur dédiée aux confettis/paillettes sans toucher au thème de l'interface.
   */
  constructor(options = {}) {
    FestiveUI.#instanceCount += 1;
    this.#id = `fui-i${FestiveUI.#instanceCount}`;

    this.options = {
      popupPosition: 'bottom-right',
      ...options
    };

    const { colors, particles } = this.#normalizeColors(options.colors);
    this.#colors = colors;
    this.#particleColors = particles;

    this.#injectStyles();

    // Alias en français, pour rester cohérent avec le contexte d'utilisation
    this.paillettes = this.sparkle.bind(this);
    this.flocons = this.snow.bind(this);
    this.confettis = this.confetti.bind(this);
    this.notifier = this.popup.bind(this);
  }

  /* ------------------------------------------------------------------ *
   *  Couleurs : fusion des couleurs par défaut avec celles fournies
   * ------------------------------------------------------------------ */

  #normalizeColors(userColors = []) {
    const defaults = new Map([
      ['accent', '#5647ea'],
      ['accentHover', '#463adb'],
      ['accentSoft', '#eeecfd'],
      ['success', '#1f9d6b'],
      ['warning', '#c9821c'],
      ['error', '#d1435a'],
      ['surface', '#ffffff'],
      ['text', '#17171c'],
      ['textMuted', '#6b6b76'],
      ['border', 'rgba(23,23,28,0.08)']
    ]);

    const extraParticles = [];
    (userColors || []).forEach(entry => {
      if (!entry || !entry.value) return;
      if (entry.name === 'particle') {
        extraParticles.push(entry.value); // couleur dédiée aux animations, n'affecte pas le thème de l'UI
      } else if (defaults.has(entry.name)) {
        defaults.set(entry.name, entry.value); // écrase la couleur nommée correspondante
      }
    });

    const particles = extraParticles.length
      ? extraParticles
      : [defaults.get('accent'), defaults.get('success'), defaults.get('warning'), defaults.get('error')];

    return { colors: defaults, particles };
  }

  /* ------------------------------------------------------------------ *
   *  Mise en place : chaque instance injecte sa propre feuille de style
   * ------------------------------------------------------------------ */

  #injectStyles() {
    const c = this.#colors;
    const s = `.${this.#id}`;

    const css = `
${s}.fui-particle-canvas{ position:fixed; inset:0; width:100vw; height:100vh; pointer-events:none; z-index:9997; }

${s}.fui-popup-container{ position:fixed; display:flex; flex-direction:column; gap:.6rem; max-width:min(360px, calc(100vw - 2rem)); z-index:9998; padding:1.25rem; }
${s}.fui-pos-bottom-right{ right:0; bottom:0; align-items:flex-end; flex-direction:column-reverse; }
${s}.fui-pos-bottom-left{ left:0; bottom:0; align-items:flex-start; flex-direction:column-reverse; }
${s}.fui-pos-top-right{ right:0; top:0; align-items:flex-end; }
${s}.fui-pos-top-left{ left:0; top:0; align-items:flex-start; }

${s} .fui-popup{
  display:flex; gap:.7rem; align-items:flex-start; width:100%;
  background:${c.get('surface')}; border:1px solid ${c.get('border')};
  border-radius:16px; box-shadow:0 12px 32px -8px rgba(23,23,28,.18), 0 2px 8px rgba(23,23,28,.06);
  padding:.85rem 1rem; opacity:0;
  transition:transform .38s cubic-bezier(.2,.8,.2,1), opacity .32s ease;
}
${s}.fui-pos-bottom-right .fui-popup, ${s}.fui-pos-top-right .fui-popup{ transform:translateX(120%); }
${s}.fui-pos-bottom-left .fui-popup, ${s}.fui-pos-top-left .fui-popup{ transform:translateX(-120%); }
${s} .fui-popup.fui-visible{ opacity:1; transform:translateX(0); }

${s} .fui-popup-icon{
  flex:none; width:26px; height:26px; border-radius:50%;
  display:flex; align-items:center; justify-content:center; font-size:.8rem; font-weight:700;
  background:${c.get('accentSoft')}; color:${c.get('accent')};
}
${s} .fui-popup-success .fui-popup-icon{ background:color-mix(in srgb, ${c.get('success')} 18%, white); color:${c.get('success')}; }
${s} .fui-popup-warning .fui-popup-icon{ background:color-mix(in srgb, ${c.get('warning')} 18%, white); color:${c.get('warning')}; }
${s} .fui-popup-error   .fui-popup-icon{ background:color-mix(in srgb, ${c.get('error')} 18%, white); color:${c.get('error')}; }

${s} .fui-popup-content{ flex:1; min-width:0; }
${s} .fui-popup-title{ font-weight:600; font-size:.92rem; margin-bottom:.15rem; color:${c.get('text')}; }
${s} .fui-popup-message{ font-size:.88rem; line-height:1.4; color:${c.get('textMuted')}; }
${s} .fui-popup-actions{ display:flex; gap:.5rem; margin-top:.6rem; }
${s} .fui-popup-action{
  border:1px solid ${c.get('border')}; background:none; border-radius:8px; padding:.3rem .65rem;
  font-size:.8rem; cursor:pointer; color:${c.get('text')}; transition:background .15s ease;
}
${s} .fui-popup-action:hover{ background:${c.get('accentSoft')}; }
${s} .fui-popup-close{
  flex:none; border:none; background:none; cursor:pointer;
  color:${c.get('textMuted')}; font-size:1.1rem; line-height:1; padding:0 0 0 .3rem;
}
${s} .fui-popup-close:hover{ color:${c.get('text')}; }

${s}.fui-overlay{
  position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(23,23,28,.28); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
  z-index:9999; opacity:0; padding:1.25rem; transition:opacity .22s ease;
}
${s}.fui-overlay.fui-overlay-visible{ opacity:1; }

${s} .fui-modal{
  width:min(380px, 100%); background:${c.get('surface')}; border-radius:16px;
  box-shadow:0 12px 32px -8px rgba(23,23,28,.18), 0 2px 8px rgba(23,23,28,.06);
  padding:1.5rem; transform:scale(.94) translateY(6px); opacity:0;
  transition:transform .28s cubic-bezier(.2,.8,.2,1), opacity .22s ease;
}
${s} .fui-modal.fui-modal-visible{ transform:scale(1) translateY(0); opacity:1; }

${s} .fui-modal-title{ font-size:1.05rem; font-weight:600; margin:0 0 .4rem; color:${c.get('text')}; }
${s} .fui-modal-message{ font-size:.92rem; line-height:1.5; color:${c.get('textMuted')}; margin:0 0 1.1rem; }
${s} .fui-modal-input{
  width:100%; box-sizing:border-box; border:1px solid ${c.get('border')}; border-radius:10px;
  padding:.55rem .7rem; font-size:.9rem; margin-bottom:1.1rem; color:${c.get('text')}; font-family:inherit;
}
${s} .fui-modal-input:focus{ outline:2px solid ${c.get('accent')}; outline-offset:1px; }

${s} .fui-modal-actions{ display:flex; justify-content:flex-end; gap:.6rem; }
${s} .fui-btn{
  border:1px solid ${c.get('border')}; background:none; border-radius:10px; padding:.5rem 1rem;
  font-size:.87rem; font-weight:500; cursor:pointer; color:${c.get('text')};
  transition:background .15s ease, border-color .15s ease;
}
${s} .fui-btn:hover{ background:#f3f3f6; }
${s} .fui-btn-primary{ background:${c.get('accent')}; border-color:${c.get('accent')}; color:#fff; }
${s} .fui-btn-primary:hover{ background:${c.get('accentHover')}; }
${s} .fui-btn:focus-visible, ${s} .fui-popup-close:focus-visible, ${s} .fui-popup-action:focus-visible{
  outline:2px solid ${c.get('accent')}; outline-offset:2px;
}

@media (max-width:480px){
  ${s}.fui-popup-container{ max-width:100vw; width:100%; padding:.75rem; }
  ${s} .fui-modal{ padding:1.25rem; }
}
@media (prefers-reduced-motion: reduce){
  ${s} .fui-popup, ${s}.fui-overlay, ${s} .fui-modal{ transition:none !important; }
}
`;

    const styleEl = document.createElement('style');
    styleEl.id = `fui-styles-${this.#id}`; // un <style> distinct par instance, jamais réutilisé ni partagé
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  #ensureCanvas() {
    if (this.#canvas) return;
    this.#canvas = document.createElement('canvas');
    this.#canvas.className = `fui-particle-canvas ${this.#id}`;
    document.body.appendChild(this.#canvas);
    this.#ctx = this.#canvas.getContext('2d');
    this.#resizeCanvas();
    window.addEventListener('resize', () => this.#resizeCanvas());
  }

  #resizeCanvas() {
    if (!this.#canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.#canvas.width = window.innerWidth * dpr;
    this.#canvas.height = window.innerHeight * dpr;
    this.#canvas.style.width = window.innerWidth + 'px';
    this.#canvas.style.height = window.innerHeight + 'px';
    this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  #ensurePopupContainer(position) {
    if (this.#containers.has(position)) return this.#containers.get(position);
    const el = document.createElement('div');
    el.className = `fui-popup-container fui-pos-${position} ${this.#id}`;
    document.body.appendChild(el);
    this.#containers.set(position, el);
    return el;
  }

  /* ------------------------------------------------------------------ *
   *  Animations festives (canvas + boucle d'animation partagée)
   * ------------------------------------------------------------------ */

  /** Fait tomber une pluie de confettis pendant `duration` ms (déclenchement ponctuel). */
  confetti({ count = 140, duration = 2600, colors = this.#particleColors } = {}) {
    this.#ensureCanvas();
    const n = this.#reducedMotion ? Math.round(count / 6) : count;
    for (let i = 0; i < n; i++) {
      this.#particles.push({
        kind: 'confetti',
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * window.innerHeight * 0.4,
        vx: (Math.random() - 0.5) * 2,
        vy: 1 + Math.random() * 2,
        size: 5 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.25,
        color: colors[(Math.random() * colors.length) | 0],
        age: 0,
        maxAge: duration + Math.random() * 800,
        opacity: 1
      });
    }
    this.#startLoop();
  }

  /** Démarre une chute continue de flocons. Retourne une fonction pour l'arrêter. */
  snow({ density = 0.5 } = {}) {
    this.#ensureCanvas();
    this.#snowActive = true;
    this.#snowDensity = this.#reducedMotion ? density / 4 : density;
    this.#startLoop();
    return () => { this.#snowActive = false; };
  }

  /** Démarre un scintillement continu de paillettes. Retourne une fonction pour l'arrêter. */
  sparkle({ density = 0.4, colors = this.#particleColors } = {}) {
    this.#ensureCanvas();
    this.#sparkleActive = true;
    this.#sparkleDensity = this.#reducedMotion ? density / 4 : density;
    this.#sparkleColors = colors;
    this.#startLoop();
    return () => { this.#sparkleActive = false; };
  }

  /** Arrête toutes les animations d'ambiance (les particules déjà en vol finissent leur course). */
  stopAll() {
    this.#snowActive = false;
    this.#sparkleActive = false;
  }

  #startLoop() {
    if (this.#rafId) return; // la boucle tourne déjà
    const step = () => {
      const ctx = this.#ctx;
      const w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      if (this.#snowActive && Math.random() < this.#snowDensity) this.#spawnSnowflake();
      if (this.#sparkleActive && Math.random() < this.#sparkleDensity) this.#spawnSparkle();

      this.#particles = this.#particles.filter(p => {
        this.#updateParticle(p, w, h);
        if (p.dead) return false;
        this.#drawParticle(ctx, p);
        return true;
      });

      const stillActive = this.#particles.length > 0 || this.#snowActive || this.#sparkleActive;
      if (stillActive) {
        this.#rafId = requestAnimationFrame(step);
      } else {
        this.#rafId = null; // la boucle s'arrête d'elle-même quand il n'y a plus rien à animer
      }
    };
    this.#rafId = requestAnimationFrame(step);
  }

  #spawnSnowflake() {
    this.#particles.push({
      kind: 'snow',
      x: Math.random() * window.innerWidth,
      y: -10,
      vy: 0.5 + Math.random() * 1,
      size: 2 + Math.random() * 3,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.02,
      opacity: 0.5 + Math.random() * 0.4
    });
  }

  #spawnSparkle() {
    const colors = this.#sparkleColors || this.#particleColors;
    this.#particles.push({
      kind: 'sparkle',
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: 2 + Math.random() * 2.5,
      age: 0,
      maxAge: 700 + Math.random() * 700,
      color: colors[(Math.random() * colors.length) | 0]
    });
  }

  #updateParticle(p, w, h) {
    if (p.kind === 'confetti') {
      p.age += 16;
      p.vy += 0.03;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vr;
      p.opacity = p.age > p.maxAge * 0.8 ? Math.max(0, 1 - (p.age - p.maxAge * 0.8) / (p.maxAge * 0.2)) : 1;
      if (p.age > p.maxAge || p.y > h + 30) p.dead = true;
    } else if (p.kind === 'snow') {
      p.wobble += p.wobbleSpeed;
      p.x += Math.sin(p.wobble) * 0.6;
      p.y += p.vy;
      if (p.y > h + 10) {
        if (this.#snowActive) { p.y = -10; p.x = Math.random() * w; } // recyclée tant que la neige est active
        else p.dead = true;
      }
    } else if (p.kind === 'sparkle') {
      p.age += 16;
      p.opacity = Math.sin((p.age / p.maxAge) * Math.PI);
      if (p.age > p.maxAge) p.dead = true;
    }
  }

  #drawParticle(ctx, p) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.opacity);
    if (p.kind === 'confetti') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    } else if (p.kind === 'snow') {
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(120,140,255,0.35)';
      ctx.shadowBlur = 3;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'sparkle') {
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      const sSize = p.size;
      ctx.moveTo(0, -sSize * 2); ctx.lineTo(sSize * 0.5, -sSize * 0.5);
      ctx.lineTo(sSize * 2, 0); ctx.lineTo(sSize * 0.5, sSize * 0.5);
      ctx.lineTo(0, sSize * 2); ctx.lineTo(-sSize * 0.5, sSize * 0.5);
      ctx.lineTo(-sSize * 2, 0); ctx.lineTo(-sSize * 0.5, -sSize * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ *
   *  Popups (notifications glissantes, positionnées via translate)
   * ------------------------------------------------------------------ */

  /**
   * Affiche une notification qui glisse depuis le bord de l'écran.
   * @param {string} message
   * @param {{title?:string, type?:'info'|'success'|'warning'|'error', duration?:number,
   *          position?:string, actions?:{label:string, onClick?:Function}[]}} options
   * @returns {Function} une fonction `close()` pour fermer la notification manuellement
   */
  popup(message, { title = '', type = 'info', duration = 4000, position = this.options.popupPosition, actions = [] } = {}) {
    const container = this.#ensurePopupContainer(position);
    const icons = { info: 'i', success: '✓', warning: '!', error: '✕' };

    const el = document.createElement('div');
    el.className = `fui-popup fui-popup-${type}`;
    el.setAttribute('role', 'status');

    const icon = document.createElement('div');
    icon.className = 'fui-popup-icon';
    icon.textContent = icons[type] || icons.info;

    const content = document.createElement('div');
    content.className = 'fui-popup-content';
    if (title) {
      const t = document.createElement('div');
      t.className = 'fui-popup-title';
      t.textContent = title;
      content.appendChild(t);
    }
    const m = document.createElement('div');
    m.className = 'fui-popup-message';
    m.textContent = message;
    content.appendChild(m);

    if (actions.length) {
      const row = document.createElement('div');
      row.className = 'fui-popup-actions';
      actions.forEach(a => {
        const b = document.createElement('button');
        b.className = 'fui-popup-action';
        b.textContent = a.label;
        b.addEventListener('click', () => { a.onClick?.(); close(); });
        row.appendChild(b);
      });
      content.appendChild(row);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'fui-popup-close';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.textContent = '×';

    el.append(icon, content, closeBtn);
    container.appendChild(el);

    let timeoutId;
    const close = () => {
      clearTimeout(timeoutId);
      el.classList.remove('fui-visible'); // revient à translateX(±120%) défini en CSS -> glisse hors écran
      el.addEventListener('transitionend', () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 450); // filet de sécurité si transitionend ne se déclenche pas
    };
    closeBtn.addEventListener('click', close);

    requestAnimationFrame(() => el.classList.add('fui-visible'));
    if (duration > 0) timeoutId = setTimeout(close, duration);

    return close;
  }

  /* ------------------------------------------------------------------ *
   *  Remplacement de alert() / confirm() / prompt()
   * ------------------------------------------------------------------ */

  /** @returns {Promise<void>} */
  alert(message, { title = 'Information', okLabel = 'OK' } = {}) {
    return this.#openModal({
      title, message,
      buttons: [{ label: okLabel, primary: true, value: undefined }],
      cancelValue: undefined
    });
  }

  /** @returns {Promise<boolean>} */
  confirm(message, { title = 'Confirmation', okLabel = 'Confirmer', cancelLabel = 'Annuler' } = {}) {
    return this.#openModal({
      title, message,
      buttons: [
        { label: cancelLabel, value: false },
        { label: okLabel, primary: true, value: true }
      ],
      cancelValue: false
    });
  }

  /** @returns {Promise<string|null>} null si annulé */
  prompt(message, defaultValue = '', { title = 'Saisie', okLabel = 'Valider', cancelLabel = 'Annuler', placeholder = '' } = {}) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fui-modal-input';
    input.value = defaultValue;
    input.placeholder = placeholder;

    return this.#openModal({
      title, message,
      extraNode: input,
      focusEl: input,
      buttons: [
        { label: cancelLabel, value: null },
        { label: okLabel, primary: true, value: () => input.value }
      ],
      cancelValue: null
    });
  }

  #openModal({ title, message, buttons, extraNode, focusEl, cancelValue }) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = `fui-overlay ${this.#id}`;

      const box = document.createElement('div');
      box.className = 'fui-modal';
      box.setAttribute('role', 'alertdialog');
      box.setAttribute('aria-modal', 'true');

      const titleEl = document.createElement('h3');
      titleEl.className = 'fui-modal-title';
      titleEl.textContent = title;

      const msgEl = document.createElement('p');
      msgEl.className = 'fui-modal-message';
      msgEl.textContent = message;

      box.append(titleEl, msgEl);
      if (extraNode) box.appendChild(extraNode);

      const btnRow = document.createElement('div');
      btnRow.className = 'fui-modal-actions';

      let closed = false;
      const close = (value) => {
        if (closed) return;
        closed = true;
        overlay.classList.remove('fui-overlay-visible');
        box.classList.remove('fui-modal-visible');
        document.removeEventListener('keydown', onKey);
        const cleanup = () => overlay.remove();
        overlay.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, 350);
        resolve(value);
      };

      buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fui-btn' + (b.primary ? ' fui-btn-primary' : '');
        btn.textContent = b.label;
        btn.addEventListener('click', () => close(typeof b.value === 'function' ? b.value() : b.value));
        btnRow.appendChild(btn);
      });
      box.appendChild(btnRow);
      overlay.appendChild(box);

      const onKey = (e) => {
        if (e.key === 'Escape') close(cancelValue);
        if (e.key === 'Enter' && extraNode) { e.preventDefault(); close(extraNode.value); }
      };
      document.addEventListener('keydown', onKey);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(cancelValue); });

      document.body.appendChild(overlay);
      requestAnimationFrame(() => {
        overlay.classList.add('fui-overlay-visible');
        box.classList.add('fui-modal-visible');
        (focusEl || btnRow.querySelector('.fui-btn-primary'))?.focus();
      });
    });
  }
}

/* ==========================================================================
   exemple de  démo — instance avec une palette personnalisée
   (montre l'usage du paramètre `colors`, un tableau d'objets {name, value})
   ========================================================================== */


// const ui = new FestiveUI({
//   popupPosition: 'bottom-right',
//   colors: [
//     { name: 'accent', value: '#5647ea' },
//     { name: 'particle', value: '#ffd166' },
//     { name: 'particle', value: '#3ba3c9' }
//   ]
// });

// document.getElementById('btn-sparkle').addEventListener('click', () => ui.paillettes());
// document.getElementById('btn-snow').addEventListener('click', () => ui.flocons());
// document.getElementById('btn-confetti').addEventListener('click', () => ui.confettis());
// document.getElementById('btn-stop').addEventListener('click', () => ui.stopAll());

// document.getElementById('btn-pop-info').addEventListener('click', () => {
//   ui.popup('Votre document a été généré avec succès.', { title: 'Information', type: 'info' });
// });
// document.getElementById('btn-pop-success').addEventListener('click', () => {
//   ui.popup('Le fichier a bien été enregistré.', { type: 'success', title: 'Enregistré' });
// });ui.confettis()
// document.getElementById('btn-pop-actions').addEventListener('click', () => {
//   ui.popup('Une nouvelle version est disponible.', {
//     title: 'Mise à jour', type: 'warning', duration: 0,
//     actions: [{ label: 'Recharger', onClick: () => ui.popup('Rechargement…', { type: 'info', duration: 1500 }) }]
//   });
// });

// document.getElementById('btn-alert').addEventListener('click', async () => {
//   await ui.alert('L\u2019opération a été effectuée.', { title: 'Terminé' });
// });
// document.getElementById('btn-confirm').addEventListener('click', async () => {
//   const ok = await ui.confirm('Voulez-vous vraiment supprimer cet élément ?', { title: 'Confirmation' });
//   ui.popup(ok ? 'Élément supprimé.' : 'Suppression annulée.', { type: ok ? 'success' : 'info', duration: 2200 });
// });
// document.getElementById('btn-prompt').addEventListener('click', async () => {
//   const name = await ui.prompt('Quel nom souhaitez-vous donner à ce projet ?', 'Mon projet');
//   if (name !== null) ui.popup(`Projet renommé « ${name} ».`, { type: 'success', duration: 2500 });
// });