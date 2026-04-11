// themeToggle.js
// Mode sombre désactivé - thème clair forcé

/**
 * Initialise le toggle du thème (désactivé - force le mode clair)
 */
export function initThemeToggle() {
  // Forcer le thème clair
  document.documentElement.setAttribute("data-theme", "light");
  localStorage.setItem("theme", "light");

  // Masquer le bouton de toggle s'il existe
  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    themeToggle.style.display = "none";
  }
}
