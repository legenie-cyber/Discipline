const themeButtons = document.querySelectorAll('[data-theme]');
const slugEl = document.querySelector(".slug")
const subNameEl = document.querySelector(".sub-name")
const metaDataConstructor = {me: {id : String, subName: String, slug: String, defaultTime: {duration: Number, durationTip: String}}, theme: {mode: String, color: String, univers: String, papierPeint: URL}, binome: {subName: String, authorization:{programmation: Boolean(false), list: Boolean(false), state: Boolean(false), stat: Boolean(false)}}}

const applyTheme = name => {
    document.body.classList.remove('theme-day', 'theme-night', 'theme-nature');
    document.body.classList.add(`theme-${name}`);
    themeButtons.forEach(button => button.classList.toggle('active', button.dataset.theme === name));
};
const initTheme = () => {
    const metaData = JSON.parse(localStorage.getItem('metaData')) ?? metaDataConstructor
    const savedTheme = metaData.theme.mode || 'day';
    applyTheme(savedTheme);
    themeButtons.forEach(button => button.addEventListener('click', () => applyTheme(button.dataset.theme)));

    const savedPapierPeint = JSON.parse(localStorage.getItem('metaData')).theme.peint;
    if (savedPapierPeint) {
        document.body.style.backgroundImage = savedPapierPeint
    }
};

const loadIcons = async ()=>{
    
    let icons = sessionStorage.getItem("icons")
    if (icons) {
        return JSON.parse(icons)
    }

    try {
        const response = await fetch("../icons/icons.json")
        if (!response.ok) throw new Error("Impossible de charger les icones depuis le fichier");

        icons = await response.json()
        sessionStorage.setItem("icons", JSON.stringify(icons))
        
        return icons
    } catch (error) {
        console.error("Impossible de charger les icones" + error)
        return {}
    }
}

const initGreat = ()=>{
    if (slugEl && subNameEl) {
        console.log(slugEl + "\n" + subNameEl);
        const subName = JSON.parse(localStorage.getItem('metaData')).me.subName
        const slug = JSON.parse(localStorage.getItem('metaData')).me.slug
        
        if (subName) subNameEl.textContent = subName
        if (slug) slugEl.textContent = slug
    }    
}

initTheme();
initGreat()
