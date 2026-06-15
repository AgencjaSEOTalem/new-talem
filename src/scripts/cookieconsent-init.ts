import * as cookieConsent from 'vanilla-cookieconsent';

declare global {
  interface Window {
    __cookieConsentConfig?: unknown;
  }
}

// Uruchamiamy cookie banner na podstawie konfiguracji wstrzykniętej przez layout.
// CSS jest teraz ładowane bezpośrednio w BaseLayout.astro
if (typeof window !== 'undefined' && window.__cookieConsentConfig) {
  window.__TALem_COOKIECONSENT_INIT_RAN__ = true;
  // eslint-disable-next-line no-console
  console.debug('[cookieconsent] init running');

  cookieConsent.run(window.__cookieConsentConfig);
}

