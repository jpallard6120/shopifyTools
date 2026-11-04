/*
SHOPIFY CUSTOM PIXEL
Paste this entire file into Settings > Customer events > Add custom pixel.
Install klaviyoAddToCartListener.js in the theme first. Configure this pixel's
required consent for Analytics and Marketing, then Save, Test, and Connect.

This subscribes to successful cart additions and forwards native-style product
properties to the main storefront. The theme listener adds locale and calls
Klaviyo.js, which handles visitor identification. No API key is needed here.
Categories and CompareAtPrice are absent from Shopify's cart event and omitted.
*/

(() => {
  const channel = 'shopify-klaviyo-add-to-cart';
  const parentOrigin = new URL(init.context.document.location.href).origin;
  const pending = new Map();

  // Retry briefly if the theme listener has not loaded yet. Its acknowledgement
  // stops retries, and it deduplicates repeated messages by Shopify event ID.
  function forward(message, attempt = 0) {
    window.parent.postMessage(message, parentOrigin);
    if (attempt < 29) {
      pending.set(message.eventId, setTimeout(() => forward(message, attempt + 1), 1000));
    } else {
      pending.delete(message.eventId);
    }
  }

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (event.source !== window.parent || event.origin !== parentOrigin
      || message?.channel !== channel || message.version !== 1 || message.type !== 'ack') return;
    clearTimeout(pending.get(message.eventId));
    pending.delete(message.eventId);
  });

  function shopifyId(id) {
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

  analytics.subscribe('product_added_to_cart', (event) => {
    try {
      const line = event.data?.cartLine;
      const variant = line?.merchandise;
      const product = variant?.product;
      if (!product || !event.id || pending.has(event.id) || pending.size >= 100) return;

      const price = variant.price?.amount == null ? NaN : Number(variant.price.amount);
      const quantity = line.quantity;
      if (!Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) return;

      const currency = variant.price.currencyCode || line.cost?.totalAmount?.currencyCode;
      const decimals = new Intl.NumberFormat('en', {
        style: 'currency', currency,
      }).resolvedOptions().maximumFractionDigits;
      const value = Number((price * quantity).toFixed(decimals));
      const page = new URL(event.context.document.location.href);
      const hasVariantName = variant.title && variant.title !== 'Default Title'
        && variant.untranslatedTitle !== 'Default Title';

      forward({
        channel,
        version: 1,
        type: 'cart',
        eventId: event.id,
        timestamp: event.timestamp,
        properties: {
          'Variant SKU': variant.sku || null,
          VariantID: shopifyId(variant.id),
          ImageURL: absoluteUrl(variant.image?.src, page.origin),
          URL: absoluteUrl(product.url, page.origin, true),
          'Client ID': event.clientId,
          'Product Name': hasVariantName ? `${product.title} - ${variant.title}` : product.title,
          Price: price,
          ProductID: shopifyId(product.id),
          Quantity: quantity,
          'Variant Name': variant.title ?? null,
          'Product Type': product.type ?? null,
          Brand: product.vendor,
          '$currency': currency,
          '$value': value,
        },
      });
    } catch (error) {
      console.error('[Klaviyo cart pixel]', error instanceof Error ? error.message : 'Invalid cart event.');
    }
  });
})();
