// This template will track all events on the same within a single pixel. 
// To make it work with cross-domain, a postMessage listener had to be implemented
// within theme.js, to catch the events outside checkout. 
// Cross-domain will not work within checkout, but I don't see any use case
// to send to another domain within checkout. 

// SET THESE VARIABLES WITH YOUR OWN VALUES
const measurementID = 'G-ABCDE12345' // SET THIS WITH YOUR OWN ID
const consentModeGranted = false; // Set to true if you want to enable consent mode as granted by default, false otherwise
const debug_mode = true; // Set to true for debugging, false for production

// Check if currently within checkout
const inCheckout = init.context.document.location.href.includes('/checkouts/');

// Don't change anything below

const script = document.createElement('script');
script.setAttribute('src', `https://www.googletagmanager.com/gtag/js?id=${measurementID}`);
script.setAttribute('async', '');
document.head.appendChild(script);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

// Configure gtag only within checkout
  if (inCheckout) {
    gtag('set', {
    'cookie_flags': 'SameSite=None;Secure'
  });

  gtag('js', new Date());
  gtag('config', measurementID, {
    'send_page_view': false,
    ...(debug_mode && { 'debug_mode': true }),
    'allow_enhanced_conversions': true, // This needs to be true to send user data
    'allow_google_signals': true 
  });

  if (consentModeGranted) {
    //Google Consent Mode v2
    gtag('consent', 'update', {
      'ad_storage': 'granted',
      'analytics_storage': 'granted',
      'ad_user_data': 'granted',
      'ad_personalization': 'granted',
    });
  }
}
//// FUNCTIONS DEFINITIONS
// Transforms Shopify items data schema to GA4 items schema
function transformVariantToItem(variant, index = 0, quantity = 1) {
    return {
        item_id: variant?.sku || variant.product.id + "_" + variant.id,
        product_id: variant?.product?.id, // Not a default item level dimension. Need to add as a CD if we want it. 
        variant_id: variant?.id, // Not a default item level dimension. Need to add as a CD. The variant ID is broken on Ajax ATC events, and returns the line ID instead. 
        item_name: variant?.product.title,
        affiliation: variant?.product.vendor,
        index: index,
        item_brand: variant?.product?.vendor,
        item_category: variant?.product?.type,
        item_variant: variant?.title || 'Default Variant',
        price: variant?.price?.amount,
        quantity: variant?.quantity || quantity
    };
  }

function createItemsArray(lines) {
  let items = []

  lines.forEach((line, index) => {
      let variant = line.variant || line.merchandise || line;
      let item = transformVariantToItem(variant, index);
      item.quantity = line.quantity;
      items.push(item);
      });

  return items;
}

const shopifyToGA4 = {
  page_viewed: 'page_view',
  checkout_started: 'begin_checkout',
  checkout_shipping_info_submitted: 'add_shipping_info',
  payment_info_submitted: 'add_payment_info',
  checkout_completed: 'purchase',
  product_added_to_cart: 'add_to_cart',
  cart_viewed: 'view_cart',
  product_viewed: 'view_item',
  search_submitted: 'search',
  collection_viewed: 'view_item_list'
}

// THEME AND CHECKOUT EVENTS
analytics.subscribe("page_viewed", async (event) => {
  const url = event.context.document.location.href
  const payload = {
    page_title: event.context.document.title,
    page_location: url
  }

  if (inCheckout) {
    if (!url.endsWith("/processing")) { // Avoid extra pageviews from processing step in checkout
      gtag('set', {'page_location': url}); // Avoid sending the iframe sandbox url and send the actual page url instead
      gtag('event', shopifyToGA4[event.name], payload);
    }
  } else {
    parent.postMessage({
      'source': window.frames.name,
      'event_name': shopifyToGA4[event.name],
      'payload': payload
    }, 
    event.context.document.location.origin);
  }
})

// CHECKOUT EVENTS
if (inCheckout) {
  analytics.subscribe("checkout_started", (event) => {
    const items = createItemsArray(event.data.checkout.lineItems);
    const payload = {
      currency: event.data.checkout.currencyCode,
      value: event.data.checkout.totalPrice.amount,
      items: items
    }
  gtag('event', 'begin_checkout', payload);
  });

  analytics.subscribe("checkout_shipping_info_submitted", (event) => {
    const items = createItemsArray(event.data.checkout.lineItems);
    const payload = {
      currency: event.data.checkout.currencyCode,
      value: event.data.checkout.totalPrice.amount,
      items: items
    }
    gtag('event', 'add_shipping_info', payload);
  });

  analytics.subscribe("payment_info_submitted", (event) => {
    const items = createItemsArray(event.data.checkout.lineItems);
    const paymentStatus = event.data.checkout.transactions.length === 0 ? 'failure' : 'success'
    const payload = {
      currency: event.data.checkout.currencyCode,
      value: event.data.checkout.totalPrice.amount,
      payment_status: paymentStatus, // Not a standard dimension, needs to be added as CD to be useful.
      items: items
    }
    gtag('event', 'add_payment_info', payload);
  });

  analytics.subscribe("checkout_completed", (event) => {
    // This does not send coupons / discounts yet. Discounts and coupon applications 
    // within the Shopify event data are set as an array at the event and item level. 
    const items = createItemsArray(event.data.checkout.lineItems);
    const payload = {
      transaction_id: event.data.checkout.order.id,
      currency: event.data.checkout.currencyCode,
      value: event.data.checkout.subtotalPrice.amount,
      shipping: event.data.checkout.shippingLine.price.amount,
      tax: event.data.checkout.totalTax.amount,
      items: items
    }
    gtag('event', 'purchase', payload);
  });
} else {
  // THEME EVENTS
  analytics.subscribe("product_added_to_cart", (event) => {
    const variant = event.data?.cartLine?.merchandise
    const item = transformVariantToItem(variant)
    const payload = {
      currency: event.data?.cartLine?.cost?.totalAmount?.currencyCode,
      value: event.data?.cartLine?.cost?.totalAmount?.amount,
      items: [
        item
      ]
    }
    parent.postMessage({
      'source': window.frames.name,
      'event_name': shopifyToGA4[event.name],
      'payload': payload
    }, 
    event.context.document.location.origin);
  });

  analytics.subscribe("cart_viewed", (event) => {
    const items = createItemsArray(event.data.cart.lines);
    const payload = {
      currency: event.data.cart.cost.totalAmount.currencyCode,
      value: event.data.cart.cost.totalAmount.amount,
      items: items
    }
    parent.postMessage({
      'source': window.frames.name,
      'event_name': shopifyToGA4[event.name],
      'payload': payload
    }, 
    event.context.document.location.origin);  
  });

  analytics.subscribe("product_viewed", (event) => {
    const variant = event.data?.productVariant
    const item = transformVariantToItem(variant)
    const payload = {
      currency: variant?.price?.currencyCode,
      value: variant?.price?.amount,
      items: [
        item
      ]
    }
    parent.postMessage({
      'source': window.frames.name,
      'event_name': shopifyToGA4[event.name],
      'payload': payload
    }, 
    event.context.document.location.origin);  });

  analytics.subscribe("search_submitted", (event) => {
    const payload = {
      search_term: event?.data?.searchResult?.query
    }
    parent.postMessage({
      'source': window.frames.name,
      'event_name': shopifyToGA4[event.name],
      'payload': payload
    }, 
    event.context.document.location.origin);
  });

  analytics.subscribe("collection_viewed", (event) => {
    const items = createItemsArray(event?.data?.collection?.productVariants);
    const payload = {
      item_list_id: event?.data?.collection?.id,
      item_list_name: event?.data?.collection?.title,
      items: items
    }
    parent.postMessage({
      'source': window.frames.name,
      'event_name': shopifyToGA4[event.name],
      'payload': payload
    }, 
    event.context.document.location.origin);  });
}