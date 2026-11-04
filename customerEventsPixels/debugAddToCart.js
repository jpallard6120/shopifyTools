// Paste directly into a Shopify Customer events custom pixel, without <script> tags.
// Custom pixels expose analytics, browser, and init directly.
// init is the page-load snapshot; event.context is captured for the cart event.

analytics.subscribe('product_added_to_cart', (event) => {
  console.group(`[Customer events] product_added_to_cart | ${event.id}`);

  console.log('Full event:', event);
  console.log('event.context:', event.context);
  console.log('event.data:', event.data);

  // Log the API objects directly so their methods remain visible in DevTools.
  console.log('analytics:', analytics);
  console.log('browser:', browser);
  console.log('init:', init);
  console.log('init.context:', init.context);
  console.log('init.data:', init.data);

  console.log('API property names:', {
    analytics: Object.getOwnPropertyNames(analytics),
    browser: Object.getOwnPropertyNames(browser),
    init: Object.getOwnPropertyNames(init),
  });

  // A fixed, copyable snapshot of the event and initialization data.
  console.log('Event + init JSON:', JSON.stringify({ event, init }, null, 2));

  console.groupEnd();
});
