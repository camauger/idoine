/**
 * Form Prefill Script - Atelier St-Elme
 * Pré-remplit le formulaire d'inscription à partir des paramètres URL
 */

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const coursParam = urlParams.get('cours');

    if (!coursParam) return;

    const selectElement = document.getElementById('cours');
    if (!selectElement) return;

    // Décoder le paramètre URL
    const decodedCours = decodeURIComponent(coursParam);

    // Chercher l'option correspondante
    const options = selectElement.options;
    let found = false;

    for (let i = 0; i < options.length; i++) {
      if (options[i].value === decodedCours) {
        selectElement.selectedIndex = i;
        found = true;
        break;
      }
    }

    // Si trouvé, ajouter un indicateur visuel
    if (found) {
      // Ajouter une classe pour le style
      selectElement.classList.add('prefilled');

      // Créer un message de confirmation
      const formCard = document.querySelector('.form-card-header');
      if (formCard) {
        const notice = document.createElement('div');
        notice.className = 'prefill-notice';
        notice.innerHTML = '<strong>Cours sélectionné :</strong> ' + decodedCours;
        formCard.appendChild(notice);
      }

      // Faire défiler jusqu'au formulaire pour une meilleure UX
      const formElement = document.getElementById('inscription-form');
      if (formElement) {
        setTimeout(function() {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }
  });
})();
