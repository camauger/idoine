let themeToggle;
let transitionTimer = null;

export function initThemeToggle() {
  themeToggle = document.querySelector(".theme-toggle");
  if (!themeToggle) return;

  // The inline script in head.html already set the initial theme to avoid
  // FOUC. We just attach the click handler and the system-preference watcher.
  themeToggle.addEventListener("click", toggleTheme);
  watchSystemThemeChanges();
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  applyTheme(currentTheme === "dark" ? "light" : "dark");
}

function applyTheme(theme) {
  document.documentElement.classList.add("theme-transition");
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  // Clear any pending removal so rapid toggles don't stack timers.
  if (transitionTimer !== null) clearTimeout(transitionTimer);
  transitionTimer = setTimeout(() => {
    document.documentElement.classList.remove("theme-transition");
    transitionTimer = null;
  }, 300);
}

function watchSystemThemeChanges() {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });
}
