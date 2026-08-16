const themeButtons = document.querySelectorAll('[data-theme]');
const applyTheme = name => {
    document.body.classList.remove('theme-day', 'theme-night', 'theme-nature');
    document.body.classList.add(`theme-${name}`);
    themeButtons.forEach(button => button.classList.toggle('active', button.dataset.theme === name));
};
const initTheme = () => {
    const savedTheme = JSON.parse(localStorage.getItem('metaData')).theme.mode || 'day';
    applyTheme(savedTheme);
    themeButtons.forEach(button => button.addEventListener('click', () => applyTheme(button.dataset.theme)));

    const savedPapierPeint = JSON.parse(localStorage.getItem('metaData')).theme.peint;
    if (savedPapierPeint) {
        document.body.style.backgroundImage = savedPapierPeint
    }
};
initTheme();

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

