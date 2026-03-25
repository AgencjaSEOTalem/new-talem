# Headless WordPress Blog — konfiguracja i webhooki

## Jak działa integracja

Strona Astro pobiera wpisy z WordPressa przez WPGraphQL (`WORDPRESS_API_URL`).
Przy każdym buildzie Astro generuje statyczne strony dla wszystkich wpisów.

---

## Wymagane wtyczki w WordPress

| Wtyczka | Po co |
|---|---|
| **WPGraphQL** | udostępnia endpoint `/graphql` |
| **WPGraphQL for ACF** (opcjonalnie) | jeśli używasz ACF w postach |

Po instalacji WPGraphQL endpoint będzie dostępny pod:
`https://www.talem.eu/blog/graphql`

---

## Webhook: automatyczny redeploy po publikacji posta

### 1. Utwórz Deploy Hook w Vercelu

1. Wejdź w projekt na **vercel.com** → Settings → Git → Deploy Hooks
2. Kliknij **Add Deploy Hook**
3. Nadaj nazwę (np. `WordPress publish`) i wybierz branch (`master`)
4. Skopiuj wygenerowany URL — wygląda tak:
   ```
   https://api.vercel.com/v1/integrations/deploy/XXXXXXXXXXXXXXXX
   ```

### 2. Skonfiguruj Webhook w WordPress

1. Zainstaluj wtyczkę **WP Webhooks** (lub **PublishPress Future / WordFence** jeśli masz)
   Alternatywnie: użyj wtyczki **WP Webhooks** (darmowa, na wordpress.org)
2. W panelu WP przejdź do **Settings → WP Webhooks → Send Data**
3. Kliknij **Add Webhook URL**
4. Wklej URL z Vercela
5. Jako trigger wybierz: `Post published` (`publish_post`)
6. Zapisz

Od tej chwili każda publikacja nowego posta wywoła rebuild na Vercelu i nowa strona `/blog/[slug]` pojawi się automatycznie.

---

## Zmienne środowiskowe na Vercelu

W panelu Vercel → Settings → Environment Variables dodaj:

| Nazwa | Wartość |
|---|---|
| `WORDPRESS_API_URL` | `https://www.talem.eu/blog/graphql` |

---

## Lokalne uruchomienie

```bash
cp .env.example .env
# uzupełnij .env
pnpm dev
```
