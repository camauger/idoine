// Point d’entrée global (menu mobile, langue, thème, galerie). Ne pas réintroduire header.js : tout passe par les imports ci-dessous.
import { initMobileMenu } from "./navigation.js";
import { initLanguageSwitcher } from "./languageSwitcher.js";
import { initThemeToggle } from "./themeToggle.js";
import { initGallery } from "./gallery.js";

const COURS_SECTION_IDS = ["ceramique", "vitrail", "mosaique", "intensif", "enfants", "inscription"];

function scrollToCoursAnchor() {
  const path = window.location.pathname || "";
  if (!path.endsWith("/cours") && !path.endsWith("/cours/")) return;
  const hash = (window.location.hash || "").replace(/^#/, "");
  if (!hash || !COURS_SECTION_IDS.includes(hash)) return;
  const el = document.getElementById(hash);
  if (!el) return;
  const section = el.classList?.contains("courses-section") ? el : el.closest?.("section");
  if (section?.classList?.contains("courses-section")) {
    section.style.display = "";
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Ancres page cours : exécuté au chargement et à chaque changement de hash
document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initLanguageSwitcher();
  initThemeToggle();
  initGallery();
  scrollToCoursAnchor();
  setTimeout(scrollToCoursAnchor, 150);
  setTimeout(scrollToCoursAnchor, 600);
});
window.addEventListener("hashchange", scrollToCoursAnchor);

// Gestion des transitions CSS
document.documentElement.classList.add("transitions-enabled");

// Prévention du FOUC (Flash of Unstyled Content)
document.documentElement.classList.remove("no-js");
