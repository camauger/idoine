/**
 * header.js - Gestion des interactions du header
 * Ce script gère toutes les interactions dynamiques du header, incluant :
 * - Le menu mobile (hamburger)
 * - Le sélecteur de langue
 * - Le toggle du thème sombre/clair
 * - L'animation du header au scroll
 */

class HeaderController {
  constructor() {
    // Éléments du DOM
    this.header = document.querySelector("header");
    this.menuToggle = document.querySelector(".menu-toggle");
    this.navMenu = document.querySelector(".nav-menu");
    this.langToggle = document.querySelector(".lang-toggle");
    this.langMenu = document.querySelector(".lang-menu");
    this.themeToggle = document.querySelector(".theme-toggle");

    // État
    this.lastScroll = 0;
    this.scrollThreshold = 50; // Nombre de pixels à scroller avant de cacher le header
    this.isScrollingUp = true; // Start as true so first scroll down is detected as direction change

    // Initialisation
    this.init();
  }

  /**
   * Initialise tous les gestionnaires d'événements
   */
  init() {
    this.initMenuToggle();
    this.initLangSwitcher();
    this.initThemeToggle();
    this.initScrollBehavior();
    this.initClickOutside();
    this.initKeyboardNavigation();
  }

  /**
   * Gestion du menu mobile
   * - Toggle du menu au clic
   * - Animation du bouton hamburger
   * - Gestion de l'attribut aria-expanded
   */
  initMenuToggle() {
    if (!this.menuToggle) return;

    this.menuToggle.addEventListener("click", () => {
      const isExpanded =
        this.menuToggle.getAttribute("aria-expanded") === "true";

      this.menuToggle.setAttribute("aria-expanded", !isExpanded);
      this.navMenu.classList.toggle("visible");

      // Empêcher le scroll du body quand le menu est ouvert sur mobile
      document.body.style.overflow = isExpanded ? "" : "hidden";
    });
  }

  /**
   * Gestion du sélecteur de langue
   * - Toggle du menu au clic
   * - Animation du dropdown
   * - Gestion des états aria
   */
  initLangSwitcher() {
    if (!this.langToggle || !this.langMenu) return;

    this.langToggle.addEventListener("click", () => {
      const isExpanded =
        this.langToggle.getAttribute("aria-expanded") === "true";

      this.langToggle.setAttribute("aria-expanded", !isExpanded);
      this.langMenu.classList.toggle("visible");

      // Si on ouvre le menu des langues, on ferme le menu mobile
      if (!isExpanded && this.navMenu.classList.contains("visible")) {
        this.menuToggle.click();
      }
    });
  }

  /**
   * Gestion du thème sombre/clair
   * Note: Theme initialization is handled by themeToggle.js (imported in main.js)
   * and the inline script in head.html. This method is kept for backwards
   * compatibility but does nothing if themeToggle.js is loaded.
   */
  initThemeToggle() {
    // Theme initialization and toggle handling is now managed by themeToggle.js
    // This prevents duplicate event listeners and conflicting initialization logic.
    // The inline script in head.html sets the initial theme to prevent FOUC.
  }

  /**
   * Gestion du comportement au scroll
   * - Cacher/montrer le header
   * - Animations fluides
   * - Optimisation des performances
   */
  initScrollBehavior() {
    // Utiliser requestAnimationFrame pour optimiser les performances
    let ticking = false;

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /**
   * Logique de gestion du scroll
   * - Détection de la direction du scroll
   * - Application des classes appropriées
   */
  handleScroll() {
    const currentScroll = window.pageYOffset;
    const scrollingDown = currentScroll > this.lastScroll;
    const scrollingUp = currentScroll < this.lastScroll;

    // Only act on direction changes to avoid unnecessary DOM operations
    if (scrollingDown && this.isScrollingUp) {
      // Direction changed: now scrolling down
      this.isScrollingUp = false;
      if (currentScroll > this.scrollThreshold) {
        this.header.classList.add("header-hidden");
        this.header.classList.remove("header-visible");
      }
    } else if (scrollingUp && !this.isScrollingUp) {
      // Direction changed: now scrolling up
      this.isScrollingUp = true;
      this.header.classList.remove("header-hidden");
      this.header.classList.add("header-visible");
    }

    this.lastScroll = currentScroll;
  }

  /**
   * Gestion des clics en dehors des menus
   * Ferme les menus ouverts quand on clique ailleurs
   */
  initClickOutside() {
    document.addEventListener("click", (event) => {
      // Fermer le menu des langues si clic en dehors
      if (
        !event.target.closest(".language-switcher") &&
        this.langMenu?.classList.contains("visible")
      ) {
        this.langToggle.setAttribute("aria-expanded", "false");
        this.langMenu.classList.remove("visible");
      }

      // Fermer le menu mobile si clic en dehors
      if (
        !event.target.closest(".main-navigation") &&
        this.navMenu?.classList.contains("visible")
      ) {
        this.menuToggle.setAttribute("aria-expanded", "false");
        this.navMenu.classList.remove("visible");
        document.body.style.overflow = "";
      }
    });
  }

  /**
   * Gestion de la navigation au clavier
   * Améliore l'accessibilité en permettant la navigation via clavier
   */
  initKeyboardNavigation() {
    // Gestion de la touche Echap
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        // Fermer tous les menus ouverts
        if (this.langMenu?.classList.contains("visible")) {
          this.langToggle.click();
        }
        if (this.navMenu?.classList.contains("visible")) {
          this.menuToggle.click();
        }
      }
    });

    // Navigation dans le menu des langues avec les flèches
    if (this.langMenu) {
      const langLinks = this.langMenu.querySelectorAll("a");

      langLinks.forEach((link) => {
        link.addEventListener("keydown", (event) => {
          const index = Array.from(langLinks).indexOf(event.target);

          switch (event.key) {
            case "ArrowUp":
              event.preventDefault();
              langLinks[index - 1 || langLinks.length - 1].focus();
              break;
            case "ArrowDown":
              event.preventDefault();
              langLinks[(index + 1) % langLinks.length].focus();
              break;
          }
        });
      });
    }
  }
}

// Initialiser le contrôleur une fois que le DOM est chargé
document.addEventListener("DOMContentLoaded", () => {
  new HeaderController();
});

/**
 * Utilitaire pour détecter le support des animations CSS
 * Permet de désactiver les animations si nécessaire
 */
function supportsAnimation() {
  const element = document.createElement("div");
  return element.style.animationName !== undefined;
}

// Si les animations ne sont pas supportées, ajouter une classe au body
if (!supportsAnimation()) {
  document.body.classList.add("no-animations");
}
