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
  'server_container_url': serverContainerURL,
  'allow_enhanced_conversions':true // This needs to be true to send user data
});

//// FUNCTIONS DEFINITIONS
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

  // Transform Shopify checjout data structure to GA4 data structure
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

   // Convert phone numbers to e164 format. This works for North American Countries and the UK. 
   function convertToE164(phoneNumber, defaultCountryCode = '1') { //Change the default to 1 for North American Countries
    // Remove all non-digit characters
    var stripped = phoneNumber.replace(/\D/g, '');
    // If it starts with 0, replace it with the UK country code
    if (stripped.startsWith('0')) {
        stripped = '44' + stripped.substring(1);
    }
    // If it doesn't start with a country code, add the default one
    if (!stripped.startsWith('1') && !stripped.startsWith('44')) {
        stripped = defaultCountryCode + stripped;
    }
    // Add + sign if needed
    if (!stripped.startsWith('+')) {
        stripped = '+' + stripped;
    }
    return stripped;
	}

  // Function to hash PII before sending to Google. 
  // This is an async only function, which must be wrapper in a promise
  async function hashPII(input) {
    input = String(input).trim(); // Remove leading and trailing spaces and convert to string
    if (input.length > 0) {
       const encoder = new TextEncoder();
       const data = encoder.encode(input);
       const hash = await window.crypto.subtle.digest('SHA-256', data); // Hash the content with SHA-256
       const hashArray = Array.from(new Uint8Array(hash)); // Convert to hexadecimal
       const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
       return hashHex;
    } else {
       return undefined
    }
 }

// START EVENTS TRACKING

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
});

analytics.subscribe("checkout_completed", async (event) => {
    console.log('purchase : ', event)
    // Transaction Data
    const checkoutData = event.data.checkout
    let transformedData = transformCheckoutData(checkoutData);
    transformedData.transaction_id = checkoutData.order.id
    transformedData.shipping = checkoutData.shippingLine.price.amount
    transformedData.tax = checkoutData.totalTax.amount

    //// Set User Data
    // Helper function to loop through keys within the Shopify address object
    function transformUserAddressData (inputObject, outputObject, hashPII) {
      Object.keys(inputObject).forEach(key => {
        if (Object.keys(shopifyToGA4AddressKeys).includes(key)) {
            // Take action for keys that exist within shopifyToGA4AddressKeys
            outputObject[shopifyToGA4AddressKeys[key]] = inputObject[key]
        }
      });
      console.log('Input object is: ', inputObject)
      console.log('Output object is: ', outputObject)
    }

    const shopifyToGA4AddressKeys = {
      'address1': 'street',
      'city': 'city',
      'countryCode': 'country',
      'firstName': 'first_name', // sha256_first_name if hashed values
      'lastName': 'last_name', //sha256_last_name is hashed values
      'province': 'region',
      'zip': 'postal_code'
    }

    const shopifyBillingAddress = checkoutData.billingAddress
    const shopifyShippingAddress = checkoutData.shippingAddress

    let GA4BillingAddress = {}
    let GA4ShippingAddress = {}
    transformUserAddressData(shopifyBillingAddress, GA4BillingAddress)
    transformUserAddressData(shopifyShippingAddress, GA4ShippingAddress)

    console.log('GA4BillingAddress is: ', GA4BillingAddress)
    console.log('GA4ShippingAddress is: ', GA4ShippingAddress)

    let userAddressData; // init as empty to allow in definition of userData below
    if (JSON.stringify(GA4BillingAddress) == JSON.stringify(GA4ShippingAddress)) {
      userAddressData = GA4ShippingAddress
    } else {
      userAddressData = [GA4BillingAddress, GA4ShippingAddress]
    }

    const userData = {
      ...(checkoutData.email ? { "email": checkoutData.email } : {}), // This will add the email key-value of checkoutData.email exists, and nothing otherwise. Need to add hashing logic. 
      ...(checkoutData.phone ? { "phone_number": checkoutData.phone } : {}), // Need to add e164 formatting here. Need to add hashing logic. 
      address: userAddressData
    }

    console.log('Final User Data is: ', userData)

    gtag('set', 'user_data', userData)

    // Send the purchase event
    gtag('event', 'purchase', transformedData);
});