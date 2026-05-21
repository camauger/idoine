/**
 * header.js - Gestion des interactions du header
 * - Menu mobile (hamburger)
 * - Sélecteur de langue
 * - Animation du header au scroll
 * Le toggle du thème est géré par themeToggle.js.
 */

class HeaderController {
  constructor() {
    this.header = document.querySelector("header");
    this.menuToggle = document.querySelector(".menu-toggle");
    this.navMenu = document.querySelector(".nav-menu");
    this.langToggle = document.querySelector(".lang-toggle");
    this.langMenu = document.querySelector(".lang-menu");

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

document.addEventListener("DOMContentLoaded", () => {
  new HeaderController();
});
