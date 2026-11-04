/*
PART 1: STOREFRONT THEME — theme.liquid

Copy ONLY the <script> block below into theme.liquid, immediately after the
content_for_header output. Shopify.locale must be initialized before it runs.
This saves the selected shop locale on each page load, separately for each tab.
The pageshow handler also refreshes it when returning through the browser cache.

This theme snippet is inside a JavaScript comment so the entire .js file can
still be pasted into the custom pixel editor without executing the theme code.

<script>
  (() => {
    const storageKey = 'custom_shop_locale';

    function storeShopLocale() {
      try {
        const locale = window.Shopify?.locale;
        if (typeof locale === 'string' && locale.trim()) {
          window.sessionStorage.setItem(storageKey, locale.trim());
        } else {
          window.sessionStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.warn('[Klaviyo cart pixel] Could not save the shop locale.', error);
      }
    }

    storeShopLocale();
    window.addEventListener('pageshow', storeShopLocale);
  })();
</script>
*/

/*
PART 2: CUSTOM PIXEL — Settings > Customer events > Add custom pixel

Paste the JavaScript below into the custom pixel editor, WITHOUT <script> tags.
You may also paste this entire file: Part 1 above is commented out.

Before connecting:
1. Install the Part 1 theme snippet on the storefront.
2. Set publicKey to your Klaviyo PUBLIC API key / Site ID.
3. Configure the pixel's customer privacy permissions for your use case
   (normally Analytics and Marketing), then Save, Test, and Connect.

The pixel reads the theme's session storage through Shopify's browser API.
The locale property comes directly from Shopify.locale, with no URL or browser-language
fallback. Events are skipped if the stored locale is missing or unavailable.
The storage key in config must match storageKey in Part 1.

The stored locale reflects the latest theme page in this tab when the event is
processed. If a language switch updates Shopify.locale without reloading the
page, call storeShopLocale() from that switcher's code within the theme snippet.

Events are sent for identified visitors: a logged-in Shopify customer with an
available email, or a visitor with Klaviyo's identifying __kla_id cookie.
Unknown visitors are skipped; events are not queued for later backfill.
Keep the existing Klaviyo onsite integration for cookie identification.

This creates an API-sourced Added to Cart metric, separate from Klaviyo's native
Shopify metric. Repoint flows to the API metric and use locale for language rules.
Product properties use the native metric's field names. Categories and
CompareAtPrice are omitted because Shopify's cart event does not supply them.
No integration envelope, browser/OS/IP enrichment, or inferred identity hashes
are copied. Identifiers belong in profile.data.attributes.

References:
https://shopify.dev/docs/api/web-pixels-api/standard-events/product_added_to_cart
https://shopify.dev/docs/api/web-pixels-api/standard-api/browser
https://developers.klaviyo.com/en/reference/create_client_event
*/

(() => {
  const config = {
    publicKey: 'YOUR_PUBLIC_KEY_HERE',
    metricName: 'Added to Cart', // API metric; separate from the Shopify metric.
    localeStorageKey: 'custom_shop_locale', // Must match Part 1.
    debug: false, // Logs event IDs/locales/status only, never profile details.
  };

  const log = (...args) => {
    if (config.debug) console.log('[Klaviyo cart pixel]', ...args);
  };

  if (!config.publicKey || config.publicKey === 'YOUR_PUBLIC_KEY_HERE') {
    console.error('[Klaviyo cart pixel] Set your public API key / Site ID.');
    return;
  }

  function shopifyId(id) {
    // Shopify can supply a numeric ID string or a gid://shopify/... ID.
    return id == null ? null : String(id).split('/').pop();
  }

  function absoluteUrl(url, origin, stripQuery = false) {
    if (!url) return null;
    const result = new URL(url, origin);
    if (stripQuery) {
      result.search = '';
      result.hash = '';
    }
    return result.href;
  }

  async function getProfileAttributes() {
    // Prefer the current logged-in customer over a potentially older cookie.
    const email = init.data.customer?.email;
    if (email) return { email };

    try {
      // Native document.cookie would read the sandbox, not the storefront.
      const raw = await browser.cookie.get('__kla_id');
      if (!raw) return null;

      const cookie = JSON.parse(atob(decodeURIComponent(raw)));
      if (typeof cookie.exchange_id === 'string' && cookie.exchange_id) {
        return { _kx: cookie.exchange_id };
      }

      // Older Klaviyo cookies can contain the email directly.
      if (typeof cookie.$email === 'string' && cookie.$email) {
        return { email: cookie.$email };
      }
    } catch (_) {
      // A missing, blocked, or malformed cookie must not throw out of subscribe.
      log('Could not read the Klaviyo identity cookie.');
    }

    return null;
  }

  analytics.subscribe('product_added_to_cart', async (event) => {
    try {
      const line = event.data?.cartLine;
      const variant = line?.merchandise;
      const money = line?.cost?.totalAmount;
      if (!variant || !money || !event.id) {
        log('Skipped incomplete cart event.');
        return;
      }

      // This is the storefront URL captured when the event occurred.
      // window.location inside the pixel would be the sandbox URL.
      const page = new URL(event.context.document.location.href);

      // Use Shopify's asynchronous API to read the storefront tab's storage.
      // Native sessionStorage here would belong to the pixel sandbox.
      const storedLocale = await browser.sessionStorage.getItem(config.localeStorageKey);
      const locale = typeof storedLocale === 'string' ? storedLocale.trim() : '';
      if (!locale) {
        log('Skipped event: shop locale is missing from session storage.', event.id);
        return;
      }

      const profile = await getProfileAttributes();
      if (!profile) {
        log('Skipped unidentified visitor.', event.id);
        return;
      }

      const product = variant.product;
      const price = variant.price?.amount == null ? NaN : Number(variant.price.amount);
      const quantity = line.quantity;
      if (!Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) {
        throw new Error('Invalid cart item price or quantity.');
      }

      // Match native Added to Cart value: variant price × quantity added.
      // Round to the currency's precision to avoid floating-point artifacts.
      const currency = variant.price.currencyCode || money.currencyCode;
      const decimals = new Intl.NumberFormat('en', {
        style: 'currency', currency,
      }).resolvedOptions().maximumFractionDigits;
      const value = Number((price * quantity).toFixed(decimals));

      const hasVariantName = variant.title && variant.title !== 'Default Title'
        && variant.untranslatedTitle !== 'Default Title';
      const productName = hasVariantName
        ? `${product.title} - ${variant.title}`
        : product.title;

      const payload = {
        data: {
          type: 'event',
          attributes: {
            metric: {
              data: { type: 'metric', attributes: { name: config.metricName } },
            },
            profile: { data: { type: 'profile', attributes: profile } },
            time: event.timestamp,
            // Shopify's event ID keeps distinct clicks distinct and allows
            // Klaviyo to deduplicate repeated deliveries of the same event.
            unique_id: event.id,
            value,
            value_currency: currency,
            properties: {
              'Variant SKU': variant.sku || null,
              VariantID: shopifyId(variant.id),
              ImageURL: absoluteUrl(variant.image?.src, page.origin),
              URL: absoluteUrl(product.url, page.origin, true),
              'Client ID': event.clientId,
              'Product Name': productName,
              Price: price,
              ProductID: shopifyId(product.id),
              Quantity: quantity,
              'Variant Name': variant.title ?? null,
              'Product Type': product.type ?? null,
              Brand: product.vendor,
              '$currency': currency,
              // The API's value attribute above supplies the event's $value.
              locale,
            },
          },
        },
      };

      const response = await fetch(
        `https://a.klaviyo.com/client/events?company_id=${encodeURIComponent(config.publicKey)}`,
        {
          method: 'POST',
          headers: {
            accept: 'application/vnd.api+json',
            'content-type': 'application/vnd.api+json',
            revision: '2026-10-15',
          },
          body: JSON.stringify(payload),
          keepalive: true,
          credentials: 'omit',
        }
      );

      if (!response.ok) {
        // Do not log the response body: validation errors can echo identifiers.
        throw new Error(`Klaviyo rejected the event (HTTP ${response.status}).`);
      }

      log('Accepted by Klaviyo.', event.id, locale, response.status);
    } catch (error) {
      // Avoid dumping request payloads or identifiers into the console.
      console.error('[Klaviyo cart pixel]', error instanceof Error ? error.message : 'Event failed.');
    }
  });
})();
