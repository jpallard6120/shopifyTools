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