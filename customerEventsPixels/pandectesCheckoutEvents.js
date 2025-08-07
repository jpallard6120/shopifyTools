/* START_MODIFY_FOR_YOUR_STORE */
const GA4_IDS = '';
const AW_IDS = '';
const DEBUG = false;
/* END_MODIFY_FOR_YOUR_STORE */

const COOKIE_NAME = '_pandectes_gdpr';
const GRANTED = 'granted';
const DENIED = 'denied';
const STORE_POLICY = DENIED;
const ENABLED_EVENTS = {
  search: true,
  view_item: true,
  view_item_list: true,
  add_to_cart: true,
  remove_from_cart: true,
  view_cart: true,
  begin_checkout: true,
  purchase: true,
  add_payment_info: true,
  add_shipping_info: true
};
const GOOGLE_URL = 'https://www.googletagmanager.com/gtag/js?id=';

const getCookie = (cookieName) => {
    const cookieString = document.cookie;
    const cookieStart = cookieString.indexOf(cookieName + "=");
    if (cookieStart === -1) {
        return null;
    }
    let cookieEnd = cookieString.indexOf(";", cookieStart);
    if (cookieEnd === -1) {
        cookieEnd = cookieString.length;
    }
    const cookieValue = cookieString.substring(cookieStart + cookieName.length + 1, cookieEnd);
    try {
        const  decodedValue = atob(cookieValue);
        const parsedValue = JSON.parse(decodedValue);
        return parsedValue;
    } catch (error) {
        console.error("Error parsing cookie value:", error);
        return null;
    }
};

const createScript = (src) => {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

const getStorage = (preferences, wait_for_update = 0) => {
  const p1 = (preferences & 1) === 0;
  const p2 = (preferences & 2) === 0;
  const p4 = (preferences & 4) === 0;
  output = {
    ad_storage: p4 ? GRANTED : DENIED,
    ad_user_data: p4 ? GRANTED : DENIED,
    ad_personalization: p4 ? GRANTED : DENIED,
    analytics_storage: p2 ? GRANTED : DENIED,
    personalization_storage: p1 ? GRANTED : DENIED,
    functionality_storage: p1 ? GRANTED : DENIED,
    ...(wait_for_update ? {wait_for_update} : {})
  };
  return output;
};
// // data layer initialization
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }

const cookie = getCookie(COOKIE_NAME);
const defaultStorage = getStorage(STORE_POLICY === DENIED ? 7 : 0, 500);
gtag('consent', 'default', defaultStorage);
if (cookie && cookie.preferences !== null && cookie.preferences !== undefined) {
  const updateStorage = getStorage(cookie.preferences);
  gtag('consent', 'update', updateStorage);
}

const ga4Ids = GA4_IDS.length ? GA4_IDS.split(',') : [];
const awIds = AW_IDS.length ? AW_IDS.split(',') : [];

if (ga4Ids.length || awIds.length) {
  gtag('js', new Date());
}


for (let i = 0; i < ga4Ids.length; i++) {
  createScript(GOOGLE_URL + ga4Ids[i]);
  gtag('config', ga4Ids[i], { send_page_view: false, debug_mode: false });
}

for (let i = 0; i < awIds.length; i++) {
  createScript(GOOGLE_URL + awIds[i]);
  gtag('config', awIds[i], { allow_enhanced_conversions: true });
}

const common = {
  sent_by: 'pandectes',
  send_to: [...ga4Ids,...awIds]
};

/* MODIFY ACCORDING TO YOUR TRACKING NEEDS */
if (ENABLED_EVENTS.view_item) {
  analytics.subscribe('product_viewed', event => {
    const v = event.data.productVariant;
    const config = {
      ...common,
      currency: v.price.currencyCode,
      value: v.price.amount,
      items: [{
        item_id: 'shopify_' + v.product.id + '_' + v.id,
        item_name: v.product.title,
        item_brand: v.product.vendor,
        item_sku: v.sku,
        item_variant: v.title,
        item_category: v.product.type,
        price: v.price.amount,
        quantity: 1,
      }]
    }
    if (DEBUG) {
      console.log(config);
    }
    gtag('event', 'view_item', config);
  });
}

if (ENABLED_EVENTS.add_to_cart) {
  analytics.subscribe("product_added_to_cart", event => {
    const v = event.data.cartLine.merchandise;
    const config = {
      ...common,
      currency: event.data.cartLine.cost.totalAmount.currencyCode,
      value: event.data.cartLine.cost.totalAmount.amount,
      items: [{
        item_id: 'shopify_' + v.product.id + '_' + v.id,
        item_name: v.product.title,
        item_brand: v.product.vendor,
        item_type: v.product.type,
        item_variant: v.title,
        item_sku: v.sku,
        price: v.price.amount,
        quantity: event.data.cartLine.quantity,
      }]
    }
    if (DEBUG) {
      console.log(config);
    }
    gtag('event', 'add_to_cart', config);
  });
}

if (ENABLED_EVENTS.remove_from_cart) {
  analytics.subscribe('product_removed_from_cart', event => {
    const v = event.data.cartLine.merchandise;
    const config = {
      ...common,
      currency: event.data.cartLine.cost.totalAmount.currencyCode,
      value: event.data.cartLine.cost.totalAmount.amount,
      items: [{
        item_id: 'shopify_' + v.product.id + '_' + v.id,
        item_name: v.product.title,
        item_brand: v.product.vendor,
        item_category: v.product.type,
        item_variant: v.title,
        item_sku: v.sku,
        price: v.price.amount,
        quantity: event.data.cartLine.quantity,
      }]
    }
    if (DEBUG) {
      console.log(config);
    }
    gtag('event', 'remove_from_cart', config);
  });
}

if (ENABLED_EVENTS.view_cart) {
  analytics.subscribe("cart_viewed", event => {
    if (!event.data.cart) {
      return;
    }
    const config = {
      ...common,
      currency: event.data.cart.cost.totalAmount.currencyCode,
      value: event.data.cart.cost.totalAmount.amount,
      items: event.data.cart.lines.map(({merchandise: v, quantity}) => {
        return {
          item_id: 'shopify_' + v.product.id +'_' + v.id,
          item_name: v.product.title,
          item_brand: v.product.vendor,
          item_category: v.product.type,
          item_variant: v.title,
          item_sku: v.sku,
          price: v.price.amount,
          quantity: quantity
        }
      })
    }
    if (DEBUG) {
      console.log(config);
    }
    gtag('event', 'view_cart', config);
  });
}

if (ENABLED_EVENTS.begin_checkout) {
  analytics.subscribe('checkout_started', event => {
    const config = {
      ...common,
      currency: event.data.checkout.currencyCode,
      value: event.data.checkout.subtotalPrice.amount,
      items: event.data.checkout.lineItems.map(line => {
        return {
          item_id: 'shopify_' + line.variant.product.id +'_' + line.id,
          item_name: line.title,
          item_brand: line.variant.product.vendor,
          item_category: line.variant.product.type,
          item_sku: line.variant.sku,
          item_variant: line.variant.title,
          price: line.variant.price.amount,
          quantity: line.quantity
        };
      })
    }
    if (DEBUG) {
      console.log(config);
    }
    gtag('event', 'begin_checkout', config);
  });
}

if (ENABLED_EVENTS.purchase) {
  analytics.subscribe('checkout_completed', event => {
    const config = {
      ...common,
      currency: event.data.checkout.currencyCode,
      transaction_id: event.data.checkout.token,
      value: event.data.checkout.subtotalPrice.amount,
      tax: event.data.checkout.totalTax.amount,
      shipping: event.data.checkout.shippingLine.price.amount,
      items: event.data.checkout.lineItems.map(line => {
        return {
          item_id: 'shopify_' + line.variant.product.id +'_' + line.id,
          item_name: line.title,
          item_brand: line.variant.product.vendor,
          item_category: line.variant.product.type,
          item_sku: line.variant.sku,
          item_variant: line.variant.title,
          price: line.variant.price.amount,
          quantity: line.quantity
        };
      })
    }
    if (DEBUG) {
      console.log(config);
    }
    gtag('event', 'purchase', config);
   
    /* Google Ads Conversion actions to go here */
    /*
      gtag('event', 'conversion', {
          send_to: 'AW-XXXXXXXX/xxxxxxxxxxxxxxxxxx',
          value: event.data.checkout.subtotalPrice.amount,
          currency: event.data.checkout.currencyCode,
          transaction_id: event.data.checkout.token,
      });
    */
  });
}

if (ENABLED_EVENTS.search) {
  analytics.subscribe('search_submitted', event => {
    const config = {
      ...common,
      search_term: event.data.searchResult.query
    };
    if (DEBUG) {
      console.log(config);
    }
    gtag('event', 'search', config);
  });
}

if (ENABLED_EVENTS.view_item_list) {
  analytics.subscribe('collection_viewed', event => {
    const config = {
      ...common,
      item_list_id: event.data.collection.id,
      item_list_name: event.data.collection.title,
      items: event.data.collection.productVariants.map(v => {
        return {
          item_id: 'shopify_' + v.product.id +'_' + v.id,
          item_name: v.product.title,
          item_brand: v.product.vendor,
          item_category: v.product.type,
          item_sku: v.sku,
          item_variant: v.title,
          price: v.price.amount,
        }
      })
    };
    if (DEBUG) {
      console.log(config);
    }
    gtag('event', 'view_item_list', config);
  })
}

if (ENABLED_EVENTS.add_payment_info) {
  analytics.subscribe('payment_info_submitted', event => {
    console.log(event);
    const config = {
      ...common,
      currency: event.data.checkout.currencyCode,
      value: event.data.checkout.subtotalPrice.amount,
      items: event.data.checkout.lineItems.map(line => {
        return {
          item_id: 'shopify_' + line.variant.product.id +'_' + line.id,
          item_name: line.title,
          item_brand: line.variant.product.vendor,
          item_category: line.variant.product.type,
          item_sku: line.variant.sku,
          item_variant: line.variant.title,
          price: line.variant.price.amount,
          quantity: line.quantity
        };
      })
    }
    if (DEBUG) {
      console.log(config);
    }
    gtag('event', 'add_payment_info', config);
  });
}

if (ENABLED_EVENTS.add_shipping_info) {
  analytics.subscribe('payment_info_submitted', event => {
    console.log(event);
    const config = {
      ...common,
      currency: event.data.checkout.currencyCode,
      value: event.data.checkout.subtotalPrice.amount,
      items: event.data.checkout.lineItems.map(line => {
        return {
          item_id: 'shopify_' + line.variant.product.id +'_' + line.id,
          item_name: line.title,
          item_brand: line.variant.product.vendor,
          item_category: line.variant.product.type,
          item_sku: line.variant.sku,
          item_variant: line.variant.title,
          price: line.variant.price.amount,
          quantity: line.quantity
        };
      })
    }
    if (DEBUG) {
      console.log(config);
    }
    gtag('event', 'add_shipping_info', config);
  });
}