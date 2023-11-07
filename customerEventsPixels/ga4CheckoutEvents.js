// Variables to set for the whole script
var measurementID = 'G-LBN6XJ9NHK'
var serverContainerURL = 'https://gtm.mailmasters.ca' // No ending forward slash
var shouldHashPII = true
// Remove debug_mode below for prod

// Initialize gtag.js for subsequent events
// This only works in a first party context, where the GA4 Client is sGTM is set to serve gtag.js
const script = document.createElement('script');
script.setAttribute('src', `${serverContainerURL}/gtag/js?id=${measurementID}`);
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
  'allow_enhanced_conversions': true, // This needs to be true to send user data
  'allow_google_signals': true 
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

  // Transform Shopify checkout data structure to GA4 data structure
  function transformCheckoutData(checkoutData) {
    const checkoutValue = checkoutData.totalPrice.amount
    const checkoutCurrency = checkoutData.currencyCode
    const checkoutLines = checkoutData.lineItems

    let checkoutItems = []
    checkoutLines.forEach((checkoutLine, index) => {
        let checkoutItem = transformVariantToItem(checkoutLine.variant, index)
        checkoutItem.quantity = checkoutLine.quantity
        checkoutItems.push(checkoutItem);
      });

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
  // This is an async only function, which must be wrapped in a promise or use await statements
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

 // This function modifies the final userData object to hash PII data
 async function transformPIIUserData(userData) {
  let hashedUserData = JSON.parse(JSON.stringify(userData)); // Converting to string and then parsing to store hashedUserData as a copy instead of a reference
  if (userData.email) {
    hashedUserData.sha256_email = await hashPII(userData.email);
  }
  if (userData.phone_number) {
    hashedUserData.sha256_phone_number = await hashPII(userData.phone_number);
  }  

  // Check if address is an array
  if (Array.isArray(userData.address)) {
    await Promise.all(hashedUserData.address.map(async (addr) => {
      addr.sha256_first_name = await hashPII(addr.first_name);
      addr.sha256_last_name = await hashPII(addr.last_name);
      // Delete non hashed keys and values from addresses array
      addr.first_name && delete addr.first_name
      addr.last_name && delete addr.last_name
    }));
  } else {
    // Handle the case where address is an object
    hashedUserData.address.sha256_first_name = await hashPII(userData.address.first_name);
    hashedUserData.address.sha256_last_name = await hashPII(userData.address.last_name);
    // Delete non hashed keys and values from address object
    hashedUserData.address.first_name && delete hashedUserData.address.first_name
    hashedUserData.address.last_name && delete hashedUserData.address.last_name
  }

  // Strip non hashed PII within the top level of hashedUserData object 
  hashedUserData.email && delete hashedUserData.email
  hashedUserData.phone_number && delete hashedUserData.phone_number
  // Return the result
  return hashedUserData;
}

// Helper function to loop through keys within the Shopify address object, and transform them to GA4 style address objects
function transformUserAddressData (inputObject) {
  let outputObject = {}
  const shopifyToGA4AddressKeys = {
    'address1': 'street',
    'city': 'city',
    'countryCode': 'country',
    'firstName': 'first_name', 
    'lastName': 'last_name', 
    'province': 'region',
    'zip': 'postal_code'
  }
  Object.keys(inputObject).forEach(key => {
    if (Object.keys(shopifyToGA4AddressKeys).includes(key)) {
        // Take action for keys that exist within shopifyToGA4AddressKeys
          outputObject[shopifyToGA4AddressKeys[key]] = inputObject[key]
    }
  });
  return outputObject
}

  //// Transform User Data from Shopify to GA4 structure. Hash PII data if necessary. 
  async function createUserData(checkoutData) {
    const GA4BillingAddress = transformUserAddressData(checkoutData.billingAddress)
    const GA4ShippingAddress = transformUserAddressData(checkoutData.shippingAddress)

    let userAddressData; // init as empty to allow in definition of userData below
    if (JSON.stringify(GA4BillingAddress) == JSON.stringify(GA4ShippingAddress)) {
      userAddressData = GA4ShippingAddress
    } else {
      userAddressData = [GA4BillingAddress, GA4ShippingAddress]
    }

    let userData = {
      ...(checkoutData.email ? { "email": checkoutData.email } : {}), // This will add the email key-value of checkoutData.email exists, and nothing otherwise. // We can also add in logic to have multiple emails in an array here.
      ...(checkoutData.phone ? { "phone_number": convertToE164(checkoutData.phone) } : {}), // We can also add in logic to have multiple phones in an array here.
      address: userAddressData
    }

    console.log('Final User Data before hashing (if any) is: ', userData)

    // Modify data before sending to Google, if PII flag is true.
    if (shouldHashPII) {
      hashedUserData = transformPIIUserData(userData)
      return hashedUserData
    } else {
      return userData
    }
  }

// START EVENTS TRACKING
analytics.subscribe("checkout_started", async (event) => {
    console.log('begin_checkout : ', event)
    const transformedData = transformCheckoutData(event.data.checkout);
    console.log('transformedData (checkout_started) is: ', transformedData)
    gtag('event', 'begin_checkout', transformedData);
});


analytics.subscribe("checkout_shipping_info_submitted", async (event) => {
    console.log('add_shipping_info : ', event)

    // Set user data
    const checkoutData = event.data.checkout
    processedUserData = await createUserData(checkoutData)
    console.log('processedUserData is: ', processedUserData)
    gtag('set', 'user_data', processedUserData)

    // Send add_shipping info event
    let transformedData = transformCheckoutData(event.data.checkout);
    console.log('transformedData (add_shipping_info) is: ', transformedData)
    gtag('event', 'add_shipping_info', transformedData);
    // shipping_tier not included as it's not part of the Customer Events data structure
});

analytics.subscribe("checkout_completed", async (event) => {
    console.log('purchase : ', event)
    // Transaction Data unique to purchase event
    const checkoutData = event.data.checkout
    let transformedData = transformCheckoutData(checkoutData);
    transformedData.transaction_id = checkoutData.order.id
    transformedData.shipping = checkoutData.shippingLine.price.amount
    transformedData.tax = checkoutData.totalTax.amount

    // Set the user data
    processedUserData = await createUserData(checkoutData)
    console.log('processedUserData is: ', processedUserData)
    gtag('set', 'user_data', processedUserData)

    // Send the purchase event
    console.log('transformedData (purchase) is: ', transformedData)
    gtag('event', 'purchase', transformedData);

    // Right now, the page_location contains the location of the web pixel (ex. "https://fondussimo.com/wpm@8cdbea80w54e9ed17p4eb8965em48d1f985/web-pixel-633.....")
    // We need to access the document or window object to fetch the actual page_location and include it as a param. 
});