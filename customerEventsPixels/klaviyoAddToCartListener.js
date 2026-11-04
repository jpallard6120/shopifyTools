/*
STOREFRONT THEME LISTENER
Paste this file inside a script element in theme.liquid, immediately after the
content_for_header output. Alternatively, upload it as a theme asset and load
it there. Install this listener before connecting klaviyoAddToCartPixel.js.

Keep the existing Klaviyo app embed enabled: it supplies window.klaviyo and
visitor identification. This listener adds the current Shopify.locale and calls
klaviyo.track('Added to Cart', properties). It creates the API metric rather
than changing Klaviyo's native Shopify metric. Repoint flows to that API metric.

The listener accepts messages only from this page's Shopify custom-pixel frames.
It captures locale on receipt, deduplicates event IDs, and waits up to 30 seconds
if Klaviyo.js has not loaded. The SDK handles identification/anonymous backfill
according to the account settings. No cookies, session storage, or key setup.
*/

(() => {
  if (window.__klaviyoAddToCartListenerInstalled) return;
  window.__klaviyoAddToCartListenerInstalled = true;

  const channel = 'shopify-klaviyo-add-to-cart';
  const debug = false;
  const seen = new Set();
  const pending = new Map();
  let timer;

  const fields = [
    'Variant SKU', 'VariantID', 'ImageURL', 'URL', 'Client ID', 'Product Name',
    'Price', 'ProductID', 'Quantity', 'Variant Name', 'Product Type', 'Brand',
    '$currency', '$value',
  ];

  function isCustomPixel(event) {
    // Shopify's sandboxed custom pixels have an opaque ("null") origin.
    // Validate the actual sending window against the storefront's pixel frames.
    if (event.origin !== 'null' && event.origin !== window.location.origin) return false;
    return [...document.querySelectorAll('iframe')].some((frame) => {
      if (frame.contentWindow !== event.source || !frame.src) return false;
      const url = new URL(frame.src, window.location.href);
      return url.origin === window.location.origin
        && /^\/web-pixels@[^/]+\/custom\/web-pixel-[^/]+\/sandbox\//.test(url.pathname);
    });
  }

  function flush() {
    clearTimeout(timer);
    const sdk = window.klaviyo;
    for (const [id, item] of pending) {
      if (Date.now() > item.expires) {
        pending.delete(id);
        if (debug) console.warn('[Klaviyo cart listener] SDK did not load; event expired.', id);
      } else if (typeof sdk?.track === 'function') {
        pending.delete(id);
        try {
          // Klaviyo.js maps $event_id/time/$value to the API's event metadata.
          const result = sdk.track('Added to Cart', item.properties);
          Promise.resolve(result).catch(() => {
            if (debug) console.warn('[Klaviyo cart listener] SDK rejected the event.', id);
          });
          if (debug) console.log('[Klaviyo cart listener] Passed to SDK.', id);
        } catch (_) {
          if (debug) console.warn('[Klaviyo cart listener] SDK call failed.', id);
        }
      }
    }
    if (pending.size) timer = setTimeout(flush, 250);
  }

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || message.channel !== channel || message.version !== 1
      || message.type !== 'cart' || typeof message.eventId !== 'string'
      || !message.eventId || message.eventId.length > 200 || !isCustomPixel(event)) return;

    const properties = message.properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)
      || typeof properties.ProductID !== 'string' || !properties.ProductID
      || typeof properties.VariantID !== 'string' || !properties.VariantID
      || typeof properties['Product Name'] !== 'string'
      || !Number.isFinite(properties.Price) || properties.Price < 0
      || !Number.isFinite(properties.$value) || properties.$value < 0
      || !Number.isInteger(properties.Quantity) || properties.Quantity < 1
      || typeof properties.$currency !== 'string' || !/^[A-Z]{3}$/.test(properties.$currency)
      || typeof message.timestamp !== 'string' || !Number.isFinite(Date.parse(message.timestamp))) return;

    if (!seen.has(message.eventId)) {
      const locale = window.Shopify?.locale;
      if (typeof locale !== 'string' || !locale.trim() || pending.size >= 100) return;
      const productProperties = Object.fromEntries(
        fields.filter((field) => Object.hasOwn(properties, field)).map((field) => [field, properties[field]])
      );
      pending.set(message.eventId, {
        expires: Date.now() + 30000,
        properties: {
          ...productProperties,
          locale: locale.trim(),
          '$event_id': message.eventId,
          time: message.timestamp,
        },
      });
      seen.add(message.eventId);
      if (seen.size > 500) seen.delete(seen.values().next().value);
    }

    // A reply to an opaque sandbox must use '*'. Only the matched sending
    // window receives this acknowledgement; it contains just the event ID.
    event.source.postMessage({
      channel, version: 1, type: 'ack', eventId: message.eventId,
    }, '*');
    flush();
  });
})();
