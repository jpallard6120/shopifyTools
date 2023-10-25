const customerEvents = () => {
  // Listen to Shopify Customer Events and push data to dataLayer - jpallard.com
    addEventListener('message', (event) => { 
      if (JSON.stringify(event.data).includes("shopify_pixel_event")) {
        try {
          var json_data = JSON.parse(event.data.json)
        } catch (SyntaxError) {
          var json_data = {}
        }
        events = ['view_item', 'view_item_list']
        if (events.some(e => event.data.event_name.includes(e))) {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
	          event: event.data.event_name,
	          ga4Data: json_data
          });
          // console.log('Event name is: ', event.data.event_name)
          // console.log('Data is: ', json_data)
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
      let json_data = {}
        try {
           let json_data = JSON.parse(event.data.json)
           Promise.all([
              hashPII(json_data.enhanced_conversions.email)
                .then(result => {
                   json_data.enhanced_conversions.address.sha_256_email_address = result;
                }),
              hashPII(json_data.enhanced_conversions.address.phone_number)
                .then(result => {
                   json_data.enhanced_conversions.address.sha_256_phone_number = result;
                })
     ]).then(() => {
        if (typeof(event.data.event_name) !== 'undefined') {
         window.dataLayer = window.dataLayer || [];
         window.dataLayer.push({
          event: event.data.event_name,
          data: json_data
         });
         console.log('Main Window Event name is: ', event.data.event_name)
         console.log('Data is: ', json_data)
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