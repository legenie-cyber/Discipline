/**
 * SerieStatistique.js
 * ---------------------------------------------------------------
 * Classe JS autonome pour l'étude complète d'une série statistique
 * à caractère quantitatif, discrète ou continue (en classes).
 *
 * Fonctionnalités :
 *  - Effectifs, fréquences, cumuls croissants/décroissants
 *  - Mode / classe modale, étendue
 *  - Moyenne, variance, écart-type, coefficient de variation
 *  - Médiane et quartiles (avec interpolation pour les classes)
 *  - Rendu d'un tableau statistique + carte résumé (HTML/CSS)
 *  - Tracé de graphiques en Canvas : bâtons, histogramme,
 *    polygone des effectifs, courbe cumulative (ogive)
 *
 * Aucune dépendance externe. Le style CSS "moderne et simple"
 * est injecté automatiquement dans le document au premier rendu.
 *
 * Utilisation rapide :
 *
 *   const serie = new SerieStatistique(
 *     [ { valeur: 2, effectif: 3 }, { valeur: 3, effectif: 5 } ],
 *     { type: 'discrete', titre: 'Nombre d\'enfants par ménage' }
 *   );
 *   serie.render('#conteneur');
 *   serie.renderGraphique('#graphe', 'batons');
 *
 *   const classes = new SerieStatistique(
 *     [ { min: 0, max: 10, effectif: 4 }, { min: 10, max: 20, effectif: 9 } ],
 *     { type: 'classes', titre: 'Notes des élèves' }
 *   );
 *   classes.render('#conteneur2');
 *   classes.renderGraphique('#graphe2', 'histogramme');
 * ---------------------------------------------------------------
 */

  export class SerieStatistique {
  /**
   * @param {Array<Object>} data - Pour type "discrete" : [{valeur, effectif}]
   *                                Pour type "classes"  : [{min, max, effectif}]
   * @param {Object} options
   * @param {'discrete'|'classes'} [options.type='discrete']
   * @param {string} [options.titre='Série statistique']
   * @param {string} [options.unite=''] - unité de la variable (ex: "kg", "ans")
   */
  constructor(data, options = {}) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('SerieStatistique : "data" doit être un tableau non vide.');
    }
    this.type = options.type === 'classes' ? 'classes' : 'discrete';
    this.titre = options.titre || 'Série statistique';
    this.unite = options.unite || '';
    this.libelle = options.libelle || 'Effectif'; // titre de l'axe Y
    this.entier = !!options.entier; // graduations entières (ex. nombre de séances)

    // Normalisation + tri croissant
    this.data = this._normaliser(data);
  }

  // ------------------------------------------------------------
  // Préparation des données
  // ------------------------------------------------------------

  _normaliser(data) {
    if (this.type === 'discrete') {
      return data
        .map((d) => ({ valeur: Number(d.valeur), effectif: Number(d.effectif), label: d.label }))
        .sort((a, b) => a.valeur - b.valeur);
    }
    return data
      .map((d) => ({
        min: Number(d.min),
        max: Number(d.max),
        effectif: Number(d.effectif),
        centre: (Number(d.min) + Number(d.max)) / 2,
        amplitude: Number(d.max) - Number(d.min),
      }))
      .sort((a, b) => a.min - b.min);
  }

  /** Valeur représentative de chaque ligne (valeur ou centre de classe) */
  _valeursRepresentatives() {
    return this.type === 'discrete'
      ? this.data.map((d) => d.label ? d.label : d.valeur)
      : this.data.map((d) => d.centre);
  }

  _effectifs() {
    return this.data.map((d) => d.effectif);
  }

  // ------------------------------------------------------------
  // Effectifs, fréquences, cumuls
  // ------------------------------------------------------------

  effectifTotal() {
    return this._effectifs().reduce((s, e) => s + e, 0);
  }

  effectifsCumulesCroissants() {
    let cumul = 0;
    return this._effectifs().map((e) => (cumul += e));
  }

  effectifsCumulesDecroissants() {
    const n = this.effectifTotal();
    const ecc = this.effectifsCumulesCroissants();
    return ecc.map((c, i) => n - c + this._effectifs()[i]);
  }

  frequences() {
    const n = this.effectifTotal();
    return this._effectifs().map((e) => e / n);
  }

  frequencesCumuleesCroissantes() {
    let cumul = 0;
    return this.frequences().map((f) => (cumul += f));
  }

  frequencesCumuleesDecroissantes() {
    const fcc = this.frequencesCumuleesCroissantes();
    const f = this.frequences();
    return fcc.map((c, i) => 1 - c + f[i]);
  }

  etendue() {
    if (this.type === 'discrete') {
      const v = this._valeursRepresentatives();
      return Math.max(...v) - Math.min(...v);
    }
    const mins = this.data.map((d) => d.min);
    const maxs = this.data.map((d) => d.max);
    return Math.max(...maxs) - Math.min(...mins);
  }

  // ------------------------------------------------------------
  // Tendance centrale
  // ------------------------------------------------------------

  /** Mode (discrète) : renvoie un tableau (peut être multimodal) */
  mode() {
    const effs = this._effectifs();
    const max = Math.max(...effs);
    return this.data
      .filter((d) => d.effectif === max)
      .map((d) => (this.type === 'discrete' ? (d.label ? d.label : d.valeur) : d.centre));
  }

  /** Classe modale + mode interpolé (formule de la classe modale) */
  classeModale() {
    if (this.type !== 'classes') return null;
    const effs = this._effectifs();
    const iMax = effs.indexOf(Math.max(...effs));
    const classe = this.data[iMax];
    const fAvant = iMax > 0 ? effs[iMax - 1] : 0;
    const fApres = iMax < effs.length - 1 ? effs[iMax + 1] : 0;
    const d1 = classe.effectif - fAvant;
    const d2 = classe.effectif - fApres;
    const modeInterpole =
      d1 + d2 === 0
        ? classe.centre
        : classe.min + (d1 / (d1 + d2)) * classe.amplitude;
    return { classe: `[${classe.min}; ${classe.max}[`, mode: modeInterpole };
  }

  moyenne() {
    const n = this.effectifTotal();
    const v = this._valeursRepresentatives();
    const e = this._effectifs();
    const somme = v.reduce((s, val, i) => s + val * e[i], 0);
    return somme / n;
  }

  variance() {
    const n = this.effectifTotal();
    const m = this.moyenne();
    const v = this._valeursRepresentatives();
    const e = this._effectifs();
    const somme = v.reduce((s, val, i) => s + e[i] * (val - m) ** 2, 0);
    return somme / n;
  }

  ecartType() {
    return Math.sqrt(this.variance());
  }

  coefficientVariation() {
    return (this.ecartType() / this.moyenne()) * 100;
  }

  // ------------------------------------------------------------
  // Médiane et quartiles (avec interpolation pour les classes)
  // ------------------------------------------------------------

  _positionInterpolee(rang) {
    // rang : ex. n/2 pour la médiane, n/4 pour Q1, 3n/4 pour Q3
    const ecc = this.effectifsCumulesCroissants();

    if (this.type === 'discrete') {
      const idx = ecc.findIndex((c) => c >= rang);
      return this.data[idx].label || this.data[idx].valeur;
    }

    const idx = ecc.findIndex((c) => c >= rang);
    const classe = this.data[idx];
    const cumulAvant = idx > 0 ? ecc[idx - 1] : 0;
    return (
      classe.min +
      ((rang - cumulAvant) / classe.effectif) * classe.amplitude
    );
  }

  mediane() {
    const n = this.effectifTotal();
    return this._positionInterpolee(n / 2);
  }

  quartiles() {
    const n = this.effectifTotal();
    return {
      Q1: this._positionInterpolee(n / 4),
      Q2: this.mediane(),
      Q3: this._positionInterpolee((3 * n) / 4),
    };
  }

  ecartInterquartile() {
    const { Q1, Q3 } = this.quartiles();
    if (typeof Q1 ==="string") {
      return 0;
    }
    return Q3 - Q1;
  }

  // ------------------------------------------------------------
  // Résumé complet
  // ------------------------------------------------------------

  resume() {
    const q = this.quartiles();
    const base = {
      effectifTotal: this.effectifTotal(),
      etendue: this.etendue(),
      moyenne: this.moyenne(),
      variance: this.variance(),
      ecartType: this.ecartType(),
      coefficientVariation: this.coefficientVariation(),
      mediane: q.Q2,
      Q1: q.Q1,
      Q3: q.Q3,
      ecartInterquartile: this.ecartInterquartile(),
    };
    if (this.type === 'discrete') {
      base.mode = this.mode();
    } else {
      base.classeModale = this.classeModale();
    }
    return base;
  }

  // ------------------------------------------------------------
  // Style CSS (injecté une seule fois)
  // ------------------------------------------------------------

  static injectStyles() {
    if (document.getElementById('serie-stat-styles')) return;
    const style = document.createElement('style');
    style.id = 'serie-stat-styles';
    style.textContent = `
      .ss-card {
        --ss-primary: #4f46e5;
        --ss-primary-light: #eef2ff;
        --ss-accent: #0d9488;
        --ss-text: #0b111a;
        --ss-muted: #64748b;
        --ss-border: #e2e8f0;
        --ss-bg: #ffffff;
        font-family: system-ui, -apple-system, sans-serif, 'Segoe UI', Inter;
        color: var(--ss-text);
        background: var(--ss-bg);
        border: 1px solid var(--ss-border);
        border-radius: 14px;
        padding: 24px;
        max-width: 780px;
        margin: 20px auto;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 6px 20px rgba(15, 23, 42, 0.04);
      }
      .ss-title {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0 0 4px;
        color: var(--ss-text);
      }
      .ss-subtitle {
        font-size: 0.85rem;
        color: var(--ss-muted);
        margin: 0 0 18px;
      }
      .ss-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin-bottom: 22px;
      }
      .ss-stat {
        background: var(--ss-primary-light);
        border-radius: 10px;
        padding: 12px 14px;
      }
      .ss-stat-label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--ss-primary);
        font-weight: 600;
        margin-bottom: 4px;
      }
      .ss-stat-value {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--ss-text);
      }
      .ss-table-wrapper {
        overflow-x: auto;
        border: 1px solid var(--ss-border);
        border-radius: 10px;
      }
      table.ss-table {
        border-collapse: collapse;
        width: 100%;
        font-size: 0.85rem;
      }
      table.ss-table thead th {
        background: var(--ss-primary);
        color: #ffffff;
        font-weight: 600;
        text-align: center;
        padding: 10px 8px;
        white-space: nowrap;
      }
      table.ss-table tbody td {
        text-align: center;
        padding: 8px;
        border-top: 1px solid var(--ss-border);
      }
      table.ss-table tbody tr:nth-child(even) {
        background: #f8fafc;
      }
      table.ss-table tbody tr:hover {
        background: var(--ss-primary-light);
      }
      .ss-graph-card {
        box-sizing: border-box;
        min-width: 0;
        overflow: hidden;
        font-family: system-ui, -apple-system, sans-serif,'Segoe UI', Inter;
        background: var(--ss-bg, #ffffff);
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 5px;
        max-width: 780px;
        margin: 20px auto;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 6px 20px rgba(15, 23, 42, 0.04);
        font-weight: 600 !important;

      }
      .ss-graph-title {
        font-size: 0.95rem;
        font-weight: 600;
        margin: 0 0 10px;
        color: #1e293b;
      }
      .ss-graph-card canvas {
        max-width: 100%;
        display: block;
        font-weight: 600 !important;

      }
    `;
    document.head.appendChild(style);
  }

  // ------------------------------------------------------------
  // Rendu HTML : carte résumé + tableau statistique
  // ------------------------------------------------------------

  render(selector) {
    SerieStatistique.injectStyles();
    const conteneur =
      typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!conteneur) throw new Error(`Conteneur "${selector}" introuvable.`);

    const r = this.resume();
    const u = this.unite ? ` ${this.unite}` : '';

    const modeTxt =
      this.type === 'discrete'
        ? r.mode.map((m) => m + u).join(', ')
        : `${r.classeModale.classe} (≈ ${r.classeModale.mode.toFixed(2)}${u})`;

    const card = document.createElement('div');
    card.className = 'ss-card';
    card.innerHTML = `
      <p class="ss-title">${this.titre}</p>
      <p class="ss-subtitle">Série ${this.type === 'discrete' ? 'discrète' : 'en classes'} — n = ${r.effectifTotal}</p>
      <div class="ss-stats-grid">
        ${this._statBox('Moyenne', r.moyenne.toFixed(2) + u)}
        ${this._statBox('Médiane', r.mediane.toFixed(2) + u)}
        ${this._statBox('Mode' + (this.type === 'classes' ? ' (classe)' : ''), modeTxt)}
        ${this._statBox('Écart-type', r.ecartType.toFixed(2) + u)}
        ${this._statBox('Variance', r.variance.toFixed(2))}
        ${this._statBox('Étendue', r.etendue.toFixed(2) + u)}
        ${this._statBox('Q1 / Q3', `${r.Q1.toFixed(2)} / ${r.Q3.toFixed(2)}`)}
        ${this._statBox('Coef. de variation', r.coefficientVariation.toFixed(1) + ' %')}
      </div>
      <div class="ss-table-wrapper">${this._tableauHTML()}</div>
    `;
    conteneur.innerHTML = '';
    conteneur.appendChild(card);
    return card;
  }

  _statBox(label, value) {
    return `<div class="ss-stat">
      <div class="ss-stat-label">${label}</div>
      <div class="ss-stat-value">${value}</div>
    </div>`;
  }

  _tableauHTML() {
    const ecc = this.effectifsCumulesCroissants();
    const ecd = this.effectifsCumulesDecroissants();
    const freq = this.frequences();
    const fcc = this.frequencesCumuleesCroissantes();

    const enTete =
      this.type === 'discrete'
        ? '<th>Valeur</th>'
        : '<th>Classe</th><th>Centre</th>';

    const lignes = this.data
      .map((d, i) => {
        const colValeur =
          this.type === 'discrete'
            ? `<td>${d.label? d.label : d.valeur}</td>`
            : `<td>[${d.min}; ${d.max}[</td><td>${d.centre}</td>`;
        return `<tr>
          ${colValeur}
          <td>${d.effectif}</td>
          <td>${ecc[i]}</td>
          <td>${ecd[i]}</td>
          <td>${(freq[i] * 100).toFixed(1)}%</td>
          <td>${(fcc[i] * 100).toFixed(1)}%</td>
        </tr>`;
      })
      .join('');

    return `
      <table class="ss-table">
        <thead>
          <tr>
            ${enTete}
            <th>Effectif</th>
            <th>ECC</th>
            <th>ECD</th>
            <th>Fréq.</th>
            <th>Fréq. cum.</th>
          </tr>
        </thead>
        <tbody>${lignes}</tbody>
      </table>
    `;
  }

  // ------------------------------------------------------------
  // Rendu graphique (Canvas)
  // ------------------------------------------------------------

  /**
   * Graphique Canvas responsive : la taille suit la largeur du conteneur (mobile compris),
   * la netteté suit le devicePixelRatio, et le tracé est refait au redimensionnement / rotation.
   * @param {string|Element} selector - conteneur cible
   * @param {'batons'|'histogramme'|'polygone'|'ogive'} type
   */
  renderGraphique(selector, type = this.type === 'discrete' ? 'batons' : 'histogramme') {
    SerieStatistique.injectStyles();
    const conteneur =
      typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!conteneur) throw new Error(`Conteneur "${selector}" introuvable.`);

    const wrapper = document.createElement('div');
    wrapper.className = 'ss-graph-card';
    const titre = document.createElement('p');
    titre.className = 'ss-graph-title';
    titre.textContent = this.titre; // textContent : le nom d'une tâche ne doit jamais être interprété comme du HTML
    wrapper.appendChild(titre);

    const canvas = document.createElement('canvas');
    wrapper.appendChild(canvas);

    conteneur.innerHTML = '';
    conteneur.appendChild(wrapper);

    let derniereLargeur = 0;
    const largeurUtile = () => {
      const style = getComputedStyle(wrapper);
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      return Math.floor(wrapper.clientWidth - padding) || 300; // 300 si conteneur masqué
    };
    const dessiner = () => {
      const width = largeurUtile();
      derniereLargeur = width;
      // Ratio stable : ni écrasé sur mobile, ni démesuré sur grand écran
      const height = Math.round(Math.min(340, Math.max(210, width * 0.68)));
      const ratio = window.devicePixelRatio || 1;

      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      if (type === 'batons' || type === 'histogramme') {
        this._drawBarChart(ctx, width, height, type === 'histogramme');
      } else if (type === 'polygone') {
        this._drawLineChart(ctx, width, height, this._effectifs(), this.libelle);
      } else if (type === 'ogive') {
        this._drawLineChart(ctx, width, height, this.effectifsCumulesCroissants(), 'Effectif cumulé');
      }
    };
    dessiner();

    // Redessine seulement si la largeur change (évite les boucles avec le redimensionnement du canvas)
    const surRedimension = () => {
      if (wrapper.isConnected && Math.abs(largeurUtile() - derniereLargeur) > 1) dessiner();
    };
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(surRedimension).observe(wrapper);
    else window.addEventListener('resize', surRedimension);

    return wrapper;
  }

  // ---------- utilitaires de tracé ----------

  /** Graduations "rondes" (1, 2, 5 × 10^n) ; entiers uniquement si options.entier */
  _niceTicks(max) {
    if (!(max > 0)) return { top: 1, ticks: [0, 1] };
    const raw = max / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    if (this.entier) step = Math.max(1, Math.ceil(step));
    let top = Math.ceil(max / step - 1e-9) * step;
    if (top - max < step * 0.15) top += step; // marge pour l'étiquette de la plus grande valeur
    const ticks = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
    return { top, ticks };
  }

  _fmt(v) {
    if (typeof v !== 'number') return String(v);
    if (Number.isInteger(v)) return String(v);
    const decimales = Math.abs(v) >= 10 ? 0 : Math.abs(v) >= 1 ? 1 : 2;
    return Number(v.toFixed(decimales)).toLocaleString('fr-FR');
  }

  /** Tronque un texte avec "…" pour qu'il tienne dans maxW pixels */
  _fitText(ctx, text, maxW) {
    text = String(text);
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text + '…';
  }

  /** Police, marges adaptées à la largeur, axes et grille. Retourne la géométrie du tracé. */
  _prepareZone(ctx, width, height, top, ticks, labelY) {
    const fs = width < 420 ? 11 : 12;
    ctx.clearRect(0, 0, width, height);
    ctx.font = `${fs}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    const largeurLabelsY = Math.max(...ticks.map((t) => ctx.measureText(this._fmt(t)).width));
    const marge = { haut: 28, bas: 34, gauche: Math.ceil(largeurLabelsY) + 14, droite: 12 };
    const zoneW = width - marge.gauche - marge.droite;
    const zoneH = height - marge.haut - marge.bas;

    ticks.forEach((t) => {
      const y = height - marge.bas - (t / top) * zoneH;
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(marge.gauche, y);
      ctx.lineTo(width - marge.droite, y);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      ctx.fillText(this._fmt(t), marge.gauche - 8, y + 4);
    });

    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(marge.gauche, marge.haut);
    ctx.lineTo(marge.gauche, height - marge.bas);
    ctx.lineTo(width - marge.droite, height - marge.bas);
    ctx.stroke();

    const entete = [labelY, this.unite ? `(${this.unite})` : ''].filter(Boolean).join(' ');
    if (entete) {
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.font = `${fs - 1}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      ctx.fillText(entete, marge.gauche, marge.haut - 14);
      ctx.font = `${fs}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    }
    return { marge, zoneW, zoneH, fs };
  }

  /**
   * Libellés de l'axe X, sans chevauchement ni coupure sur les bords.
   *  - categories = true  (bâtons, histogramme) : chaque barre garde son libellé, tronqué avec "…" si besoin
   *  - categories = false (courbes dans le temps) : on affiche un libellé sur N, complets, en gardant toujours le dernier
   */
  _drawXLabels(ctx, labels, xs, slotW, yBase, width, categories) {
    labels = labels.map(String);
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    const dessine = (texte, x) => {
      const demi = ctx.measureText(texte).width / 2;
      ctx.fillText(texte, Math.min(Math.max(x, demi + 2), width - demi - 2), yBase);
    };

    if (categories) {
      labels.forEach((l, i) => dessine(this._fitText(ctx, l, Math.max(24, slotW - 6)), xs[i]));
      return;
    }

    const plusLarge = Math.max(...labels.map((l) => ctx.measureText(l).width));
    const saut = Math.max(1, Math.ceil((plusLarge + 10) / Math.max(slotW, 1)));
    const n = labels.length;
    labels.forEach((l, i) => {
      if ((n - 1 - i) % saut !== 0) return; // ancré sur le dernier point (le plus récent)
      dessine(this._fitText(ctx, l, Math.max(40, slotW * saut - 6)), xs[i]);
    });
  }

  _drawBarChart(ctx, width, height, avecAmplitude) {
    const effectifs = this._effectifs();
    const { top, ticks } = this._niceTicks(Math.max(...effectifs));
    const { marge, zoneW, zoneH } = this._prepareZone(ctx, width, height, top, ticks, '');

    const n = this.data.length;
    const largeurTotale = zoneW / n;
    const largeurBarre = Math.max(4, avecAmplitude ? largeurTotale * 0.92 : Math.min(largeurTotale * 0.5, 56));
    const base = height - marge.bas;
    const xs = [];
    const labels = [];

    this.data.forEach((d, i) => {
      const xCentre = marge.gauche + largeurTotale * i + largeurTotale / 2;
      const barH = (d.effectif / top) * zoneH;
      const y = base - barH;
      xs.push(xCentre);
      labels.push(this.type === 'discrete' ? (d.label ? d.label : d.valeur) : `${d.min}-${d.max}`);

      if (barH > 0) {
        const gradient = ctx.createLinearGradient(0, y, 0, base);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#4f46e5');
        ctx.fillStyle = gradient;
        ctx.fillRect(xCentre - largeurBarre / 2, y, largeurBarre, barH);
      }
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText(this._fmt(d.effectif), xCentre, y - 6);
    });

    this._drawXLabels(ctx, labels, xs, largeurTotale, base + 18, width, true);
  }

  _drawLineChart(ctx, width, height, valeursY, labelY) {
    const n = valeursY.length;
    const { top, ticks } = this._niceTicks(Math.max(...valeursY));
    const { marge, zoneW, zoneH } = this._prepareZone(ctx, width, height, top, ticks, labelY);
    const points = this._valeursRepresentatives();

    // Marge intérieure pour que les libellés/points des extrémités ne soient pas coupés
    const pad = Math.min(24, zoneW / 4);
    const pas = n > 1 ? (zoneW - 2 * pad) / (n - 1) : 0;
    const base = height - marge.bas;
    const xs = valeursY.map((_, i) => (n > 1 ? marge.gauche + pad + pas * i : marge.gauche + zoneW / 2));
    const ys = valeursY.map((v) => base - (v / top) * zoneH);

    ctx.strokeStyle = '#0d9488';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    xs.forEach((x, i) => (i === 0 ? ctx.moveTo(x, ys[i]) : ctx.lineTo(x, ys[i])));
    ctx.stroke();
    ctx.lineWidth = 1;

    ctx.textAlign = 'center';
    valeursY.forEach((v, i) => {
      ctx.fillStyle = '#0d9488';
      ctx.beginPath();
      ctx.arc(xs[i], ys[i], 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.fillText(this._fmt(v), xs[i], ys[i] - 9);
    });

    const labels = points.map((p) => (typeof p === 'number' ? this._fmt(p) : p));
    this._drawXLabels(ctx, labels, xs, n > 1 ? pas : zoneW, base + 18, width, false);
  }
}

// Export compatible module (Node/bundlers) et navigateur (balise <script>)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SerieStatistique;
}
