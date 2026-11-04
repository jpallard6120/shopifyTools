# shopifyTools

## With cross-domain
1. Copy `gtag_all_events_crossDomain.js` to a Shopify Pixel and configure correct values for measurement ID 
2. copy `gtag_all_events_listener.html` within theme.liquid and configure correct values for measurement ID **AND custom pixel ID**

## Without cross-domain tracking
1. Copy `gtag_all_events.js` to a Shopify pixel and cofigure correct values
2. No step 2

## Klaviyo Added to Cart with locale

1. Replace the previous cart custom pixel with [`klaviyoAddToCartPixel.js`](customerEventsPixels/klaviyoAddToCartPixel.js) in **Settings > Customer events**. Paste JavaScript only, without script tags, and configure Analytics and Marketing consent requirements.
2. Replace the previous locale-storage theme helper with [`klaviyoAddToCartListener.js`](customerEventsPixels/klaviyoAddToCartListener.js). Put its contents inside a script element immediately after the `content_for_header` output in `theme.liquid`, or load it there as a theme asset. Install the listener before connecting the pixel.
3. Keep the existing Klaviyo app embed enabled. The listener uses its `window.klaviyo.track()` and visitor identification; no API key or locale storage is required.
4. Test a cart addition in each storefront language and inspect the **API-sourced Added to Cart** metric in Klaviyo. Repoint relevant flows to that metric. It uses native product-property names plus `locale`; Categories and CompareAtPrice are omitted because Shopify's cart event does not expose them.

The pixel forwards successful cart additions through `postMessage`. The listener validates the sending pixel frame, captures `Shopify.locale`, and deduplicates Shopify event IDs. It waits up to 30 seconds for Klaviyo.js to become available. Visitor identification and anonymous activity handling follow the existing Klaviyo settings.

