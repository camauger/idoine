/**
 * Galerie : interactions sur les miniatures (ex. future lightbox).
 * Appelé depuis main.js au DOMContentLoaded — pas de second listener DOMContentLoaded ici.
 */
export function initGallery() {
  function bindGalleryClicks() {
    const images = document.querySelectorAll(".gallery-item img");
    images.forEach(function (img) {
      img.addEventListener("click", function () {
        // Placeholder : brancher une lightbox ici si besoin
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindGalleryClicks);
  } else {
    bindGalleryClicks();
  }
}
