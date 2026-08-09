const themeButtons = document.querySelectorAll('[data-theme]');
const applyTheme = name => {
    document.body.classList.remove('theme-day', 'theme-night', 'theme-nature');
    document.body.classList.add(`theme-${name}`);
    localStorage.setItem('appTheme', name);
    themeButtons.forEach(button => button.classList.toggle('active', button.dataset.theme === name));
};
const initTheme = () => {
    const savedTheme = localStorage.getItem('appTheme') || 'day';
    applyTheme(savedTheme);
    themeButtons.forEach(button => button.addEventListener('click', () => applyTheme(button.dataset.theme)));
};
initTheme();