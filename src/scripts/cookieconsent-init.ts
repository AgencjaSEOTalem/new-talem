import * as cookieConsent from 'vanilla-cookieconsent';

declare global {
  interface Window {
    __cookieConsentConfig?: unknown;
  }
}

// Dynamiczne ładowanie CSS aby nie blokować renderowania
const loadCookieConsentStyles = async () => {
  await import('vanilla-cookieconsent/dist/cookieconsent.css');
  await import('../styles/cookieconsent-overrides.css');
};

// Uruchamiamy cookie banner na podstawie konfiguracji wstrzykniętej przez layout.
if (typeof window !== 'undefined' && window.__cookieConsentConfig) {
  window.__TALem_COOKIECONSENT_INIT_RAN__ = true;
  // eslint-disable-next-line no-console
  console.debug('[cookieconsent] init running');

  // Ładujemy CSS asynchronicznie a potem inicjalizujemy
  loadCookieConsentStyles().then(() => {
    cookieConsent.run(window.__cookieConsentConfig);
  });
}

