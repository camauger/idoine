---
title: À propos
description: En savoir plus sur l'atelier
hero_cta: Contactez-nous
hero_cta_url: "#contact"
template: pages/about.html
about_image: /assets/images/about.jpg
translation_id: about
---

<div class="container about-page">
  <div class="intro">
    <h2 class="intro-title">À propos de l'atelier</h2>
    <div class="intro-text">
      <p>L’Atelier St-Elme est un organisme de loisirs qui offre des cours en vitrail et céramique. Il existe depuis plus de 40 ans et rayonne dans l’arrondissement du Vieux-Bourg. Petits et grands y trouvent le bonheur de côtoyer des professeurs passionnés et des élèves ravis d’y découvrir deux métiers d’art qui traversent le temps. En plus d’offrir un enseignement, l’Atelier est un lieu de rencontres et d’échanges, où les membres partagent un processus créatif valorisant et fascinant.</p>
    </div>
  </div>

  <section class="contact" id="contact">
    <h2 class="section-title">Contactez-nous</h2>
    <div class="contact-content">
      <p class="contact-intro">Vous avez une question ou souhaitez collaborer? Écrivez-nous, nous vous répondrons rapidement.</p>
      <form
        class="form contact-form"
        name="contact"
        method="POST"
        data-netlify="true"
        netlify-honeypot="bot-field"
        action="/contact-merci/"
      >
        <input type="hidden" name="form-name" value="contact">
        <input type="hidden" name="subject" value="Nouveau message de contact - Atelier St-Elme">
        <p class="hidden" style="display:none;">
          <label>Ne pas remplir si vous êtes humain: <input name="bot-field"></label>
        </p>
        <div class="form-group">
          <label for="contact-nom" class="form-label">Nom complet <span class="required">*</span></label>
          <input type="text" id="contact-nom" name="nom" class="form-input" autocomplete="name" required>
        </div>
        <div class="form-group">
          <label for="contact-courriel" class="form-label">Courriel <span class="required">*</span></label>
          <input type="email" id="contact-courriel" name="courriel" class="form-input" autocomplete="email" required>
        </div>
        <div class="form-group">
          <label for="contact-message" class="form-label">Message <span class="required">*</span></label>
          <textarea id="contact-message" name="message" class="form-textarea" rows="6" required></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary"><i class="fa-solid fa-envelope" aria-hidden="true"></i> Envoyer</button>
        </div>
      </form>
    </div>
  </section>
</div>
