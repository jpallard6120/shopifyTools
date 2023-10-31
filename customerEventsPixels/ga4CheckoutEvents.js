// Initialize gtag.js for subsequent events
// This only works in a first party context, where the GA4 Client is sGTM is set to serve gtag.js
var measurementID = 'G-LBN6XJ9NHK'
var serverContainerURL = 'https://gtm.mailmasters.ca'
// Remove debug_mode below for prod

const script = document.createElement('script');
script.setAttribute('src', `https://gtm.mailmasters.ca/gtag/js?id=${measurementID}`);
script.setAttribute('async', '');
document.head.appendChild(script);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('set', {
'cookie_flags': 'SameSite=None;Secure'
});
gtag('js', new Date());
gtag('config', measurementID, {
  'send_page_view': false,
  'debug_mode': true, // REMOVE THIS FOR PROD
  'server_container_url': serverContainerURL
});


// Transforms Shopify items data schema to GA4 items schema
function transformVariantToItem(variant, index = 0, quantity = 1) {
    return {
        item_id: variant.sku,
        product_id: variant.product.id, // Not a default item level dimension. Need to add as a CD. 
        variant_id: variant.id, // Not a default item level dimension. Need to add as a CD. The variant ID is broken on Ajax ATC events, and returns the line ID instead. 
        item_name: variant.product.title,
        affiliation: variant.product.vendor,
        index: index,
        item_brand: variant.product.vendor,
        item_category: variant.product.type,
        item_variant: variant.title,
        price: variant.price.amount,
        quantity: variant.quantity || quantity
    };
  }

  function transformCheckoutData(checkoutData) {
    console.log('Checkout data is: ', checkoutData)
    const checkoutValue = checkoutData.totalPrice.amount
    const checkoutCurrency = checkoutData.currencyCode
    const checkoutLines = checkoutData.lineItems

    let checkoutItems = []
    checkoutLines.forEach((checkoutLine, index) => {
        let checkoutItem = transformVariantToItem(checkoutLine.variant, index)
        checkoutItem.quantity = checkoutLine.quantity
        checkoutItems.push(checkoutItem);
      });

    console.log('checkoutItems are: ', checkoutItems)

    return {
    currency: checkoutCurrency,
    value: checkoutValue,
    items: checkoutItems,
    data_source: 'web' // Not a standard GA4 dimension. Needs to be added as CD. 
    };
    }

// Start events tracking

analytics.subscribe("checkout_started", async (event) => {
    console.log('begin_checkout : ', event)
    const transformedData = transformCheckoutData(event.data.checkout);
    gtag('event', 'begin_checkout', transformedData);
});


analytics.subscribe("checkout_shipping_info_submitted", async (event) => {
    console.log('add_shipping_info : ', event)
    let transformedData = transformCheckoutData(event.data.checkout);
    gtag('event', 'add_shipping_info', transformedData);
    // Need to add user data
    // shipping_tier not included as it's not part of the Customer Events data structure


analytics.subscribe("checkout_completed", async (event) => {
    console.log('purchase : ', event)
    const checkoutData = event.data.checkout
    let transformedData = transformCheckoutData(checkoutData);
    transformedData.transaction_id = checkoutData.order.id
    transformedData.shipping = checkoutData.shippingLine.price.amount
    transformedData.tax = checkoutData.totalTax.amount
    gtag('event', 'purchase', transformedData);
    // Need to add user data
});