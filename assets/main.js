/* Vallée Visible : menu mobile, pré-sélection d'offre, formulaire de contact. */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIGURATION DU FORMULAIRE
     Collez ici la clé d'accès Web3Forms reçue par e-mail (voir LISEZMOI.md).
     Cette clé est publique par conception : elle permet seulement d'envoyer
     un e-mail vers valleevisible@gmail.com, pas de lire quoi que ce soit.
     Tant qu'elle est vide, le formulaire ne prétend JAMAIS avoir envoyé
     le message : il invite à appeler ou à écrire directement.
     ------------------------------------------------------------------ */
  const WEB3FORMS_KEY = '1ec947f0-dabb-4698-9dfd-fdbf69a2f50b';
  const ENDPOINT = 'https://api.web3forms.com/submit';
  const CONTACT_MAIL = 'valleevisible@gmail.com';
  const CONTACT_TEL = '06 38 99 11 40';

  /* Menu mobile */
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  if (burger && menu) {
    const close = () => {
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Ouvrir le menu');
    };
    burger.addEventListener('click', () => {
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) { close(); burger.focus(); }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (m) => { if (m.matches) close(); });
  }

  /* Formulaire */
  const form = document.getElementById('form-contact');
  if (!form) return;

  /* Les boutons « Me renseigner » des offres pré-remplissent la prestation */
  const presta = form.querySelector('#f-presta');
  document.querySelectorAll('[data-offre]').forEach((a) => {
    a.addEventListener('click', () => {
      const v = a.getAttribute('data-offre');
      if (presta && [...presta.options].some((o) => o.text === v)) presta.value = v;
    });
  });

  const status = document.getElementById('f-status');
  const button = form.querySelector('button[type=submit]');
  const startedAt = Date.now();

  const setStatus = (kind, text) => {
    status.className = 'status ' + kind;
    status.textContent = text;
  };

  const rules = [
    ['f-nom', 'e-nom', (v) => v.trim().length >= 2, 'Indiquez votre nom et prénom.'],
    ['f-entreprise', 'e-entreprise', (v) => v.trim().length >= 2, 'Indiquez le nom de votre entreprise.'],
    ['f-email', 'e-email', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), 'Cette adresse e-mail ne semble pas valide (exemple : nom@domaine.fr).'],
    ['f-tel', 'e-tel', (v) => {
      const d = v.replace(/[\s.\-()]/g, '');
      return /^(?:\+33|0033|0)[1-9]\d{8}$/.test(d) || /^\+\d{8,15}$/.test(d);
    }, 'Indiquez un numéro valide, par exemple 06 12 34 56 78.'],
    ['f-metier', 'e-metier', (v) => v !== '', 'Choisissez votre métier.'],
    ['f-commune', 'e-commune', (v) => v.trim().length >= 2, 'Indiquez votre commune.'],
  ];

  const check = (id) => {
    const r = rules.find((x) => x[0] === id);
    if (!r) return true;
    const el = document.getElementById(r[0]);
    const ok = r[2](el.value);
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    document.getElementById(r[1]).textContent = ok ? '' : r[3];
    return ok;
  };

  rules.forEach(([id]) => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => { if (el.value) check(id); });
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(id); });
  });

  const consent = document.getElementById('f-rgpd');
  const consentErr = document.getElementById('e-rgpd');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'status';
    status.textContent = '';

    let firstBad = null;
    rules.forEach(([id]) => { if (!check(id) && !firstBad) firstBad = document.getElementById(id); });
    const consentOk = consent.checked;
    consent.setAttribute('aria-invalid', consentOk ? 'false' : 'true');
    consentErr.textContent = consentOk ? '' : 'Merci de cocher cette case pour que nous puissions vous répondre.';
    if (!consentOk && !firstBad) firstBad = consent;
    if (firstBad) {
      setStatus('ko', 'Certains champs sont à corriger avant l’envoi.');
      firstBad.focus();
      return;
    }

    /* Anti-robots : case piège cochée, ou formulaire rempli en moins de 3 secondes */
    if (form.querySelector('#f-hp').checked || Date.now() - startedAt < 3000) {
      setStatus('ko', 'L’envoi a été bloqué par notre protection anti-robots. Réessayez dans quelques secondes, ou appelez le ' + CONTACT_TEL + '.');
      return;
    }

    if (!WEB3FORMS_KEY) {
      setStatus('info', 'L’envoi en ligne n’est pas encore activé sur ce site : votre message n’a pas été transmis. Contactez-nous directement au ' + CONTACT_TEL + ' ou à ' + CONTACT_MAIL + '.');
      return;
    }

    const data = new FormData(form);
    data.delete('botcheck');
    data.append('access_key', WEB3FORMS_KEY);
    data.append('subject', 'Nouvelle demande de diagnostic : ' + (data.get('entreprise') || ''));
    data.append('from_name', 'Site Vallée Visible');
    data.append('replyto', data.get('email') || '');

    button.disabled = true;
    const label = button.innerHTML;
    button.textContent = 'Envoi en cours…';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: ctrl.signal });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success === true) {
        setStatus('ok', 'Merci, votre demande a bien été envoyée. Nous vous recontactons sous 24 heures ouvrées.');
        form.reset();
        rules.forEach(([id]) => document.getElementById(id).removeAttribute('aria-invalid'));
      } else {
        setStatus('ko', 'Le message n’a pas pu être envoyé (erreur du service). Appelez-nous au ' + CONTACT_TEL + ' ou écrivez à ' + CONTACT_MAIL + '.');
      }
    } catch (err) {
      setStatus('ko', 'Le message n’a pas pu être envoyé (connexion interrompue). Vérifiez votre réseau, ou appelez-nous au ' + CONTACT_TEL + '.');
    } finally {
      clearTimeout(timer);
      button.disabled = false;
      button.innerHTML = label;
    }
  });
})();
