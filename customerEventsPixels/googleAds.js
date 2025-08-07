// Variables to set for the whole script
var googleAdsID = 'AW-123456789'

// Initialize gtag.js for subsequent events
const script = document.createElement('script');
script.setAttribute('src', `https://www.googletagmanager.com/gtag/js?id=${googleAdsID}`);
script.setAttribute('async', '');
document.head.appendChild(script);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

gtag('js', new Date());
gtag('config', googleAdsID);

// Page View - Customer Events Source
analytics.subscribe("page_viewed", async (event) => {
  const url = event.context.document.location.href
  if (!url.endsWith("/processing")) { // Avoid extra pageviews from processing step in checkout
    gtag('event', 'conversion', {'send_to': 'CHANGE_THIS'});
  }
})

// Begin Checkout - Customer Events Source
analytics.subscribe("checkout_started", (event) => {
  gtag('event', 'conversion', {
    'send_to': 'CHANGE_THIS',
    'value': event.data.checkout.totalPrice.amount,
    'currency': event.data.checkout.currencyCode
  });
});

// Add Shipping Info - Customer Events Source
analytics.subscribe("checkout_shipping_info_submitted", (event) => {
  gtag('event', 'conversion', {
  'send_to': 'CHANGE_THIS',
  'value':event.data.checkout.totalPrice.amount,
  'currency': event.data.checkout.currencyCode
  });
});

// Purchase - Customer Events Source
analytics.subscribe("checkout_completed", (event) => {
  gtag('event', 'conversion', {
    'send_to': 'CHANGE_THIS',
    'value': event.data.checkout.subtotalPrice.amount,
    'currency': event.data.checkout.currencyCode,
    'transaction_id': event.data.checkout.order.id
  });
});

// Add to Cart - Customer Events Source
analytics.subscribe("product_added_to_cart", (event) => {
  gtag('event', 'conversion', {
    'send_to': 'CHANGE_THIS',
    'value': event.data?.cartLine?.cost?.totalAmount?.amount,
    'currency': event.data?.cartLine?.cost?.totalAmount?.currencyCode
  });
});

// View Cart - Customer Events Source
analytics.subscribe("cart_viewed", (event) => {
  gtag('event', 'conversion', {
  'send_to': 'CHANGE_THIS',
  'value': event.data.cart.cost.totalAmount.amount,
  'currency': event.data.cart.cost.totalAmount.currencyCode
  });
});

// View Item - Customer Events Source
analytics.subscribe("product_viewed", (event) => {
  gtag('event', 'conversion', {
  'send_to': 'CHANGE_THIS',
  'value': event.data?.productVariant?.price?.amount,
  'currency': event.data?.productVariant?.price?.currencyCode
  });
});

// View Item List - Customer Events Source
analytics.subscribe("collection_viewed", (event) => {
  gtag('event', 'conversion', {'send_to': 'CHANGE_THIS'});
});