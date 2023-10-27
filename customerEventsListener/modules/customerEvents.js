const customerEvents = () => {
   addEventListener('message', (event) => { 
      if (JSON.stringify(event.data).includes("shopify_pixel_event")) {
        try {
          var ecomData = JSON.parse(event.data.json)
        } catch (SyntaxError) {
          var ecomData = {}
        }
        // let events = ['view_item', 'view_item_list']
        // if (events.some(e => event.data.event_name.includes(e))) {
        if (typeof(event.data.event_name) !== 'undefined') {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
	          event: event.data.event_name,
	          ecommerce: ecomData
          });
          console.log('Event name is: ', event.data.event_name)
          console.log('ecomData is: ', ecomData)
        }
    }
  });
}

const customerEventsHashed = () => {
  // Listen to Shopify Customer Events and push data to dataLayer - jpallard.com
  async function hashPII(input) {
     // Remove leading and trailing spaces and convert to string
     input = String(input).trim();
     if (input.length > 0) {
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        // Hash the content with SHA-256
        const hash = await window.crypto.subtle.digest('SHA-256', data);
        // Convert to hexadecimal
        const hashArray = Array.from(new Uint8Array(hash));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
     } else {
        return undefined
     }
  }

  addEventListener('message', (event) => {
     if (JSON.stringify(event.data).includes("shopify_pixel_event")) {
        try {
           let ecomData = {}
           let ecomData = JSON.parse(event.data.json)
           Promise.all([
              hashPII(ecomData.enhanced_conversions.email)
                .then(result => {
                  ecomData.enhanced_conversions.address.sha_256_email_address = result;
                }),
              hashPII(ecomData.enhanced_conversions.address.phone_number)
                .then(result => {
                  ecomData.enhanced_conversions.address.sha_256_phone_number = result;
                })
     ]).then(() => {
        if (typeof(event.data.event_name) !== 'undefined') {
         window.dataLayer = window.dataLayer || [];
         window.dataLayer.push({
          event: event.data.event_name,
          ecommerce: ecomData
         });
         console.log('Main Window Event name is: ', event.data.event_name)
         console.log('ecomData is: ', ecomData)
        }
     });
        } catch (SyntaxError) {
           console.log('Syntax error occurred while parsing JSON data:')
           console.log(SyntaxError)
        }
     }
  });
}

export {customerEvents, customerEventsHashed}