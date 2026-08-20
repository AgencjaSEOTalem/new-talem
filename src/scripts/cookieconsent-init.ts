import { run } from 'vanilla-cookieconsent';

declare global {
  interface Window {
    __cookieConsentConfig?: Parameters<typeof run>[0];
    __TALem_COOKIECONSENT_INIT_RAN__?: boolean;
  }
}

// Uruchamiamy cookie banner na podstawie konfiguracji wstrzykniętej przez layout.
// CSS jest teraz ładowane bezpośrednio w BaseLayout.astro
if (typeof window !== 'undefined' && window.__cookieConsentConfig) {
  window.__TALem_COOKIECONSENT_INIT_RAN__ = true;
  // eslint-disable-next-line no-console
  console.debug('[cookieconsent] init running');

  run(window.__cookieConsentConfig);
}

