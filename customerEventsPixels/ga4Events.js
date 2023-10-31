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

// Shopify: product_viewed -> GA4: view_item
analytics.subscribe("product_viewed", async (event) => {
    const variant = event.data.productVariant
    function transformDataToViewItem(variant) {
      return {
        currency: variant.price.currencyCode,
        value: variant.price.amount, // Assuming value should match the price amount
        items: [transformVariantToItem(variant)]
      };
    }
    const transformedData = transformDataToViewItem(variant);
    parent.postMessage({
      'message': 'shopify_pixel_event',
      'event_name': 'view_item',
      'ecomData': JSON.stringify(transformedData)
    }, 
    event.context.document.location.origin);
  });

  // Shopify: collection_viewed -> GA4: view_item_list
  analytics.subscribe("collection_viewed", async (event) => {
    function transformDataToCollectionViewed(data) {
      const items = data.collection.productVariants.map((variant, index) => transformVariantToItem(variant, index));
      // Add the item_list_id and item_list_name to each item within the collection_viewed condition
      items.forEach(item => {
        item.item_list_id = data.collection.id;
        item.item_list_name = data.collection.title;
      });
      return {
        item_list_id: data.collection.id,
        item_list_name: data.collection.title,
        items: items
      };
    }
    const transformedData = transformDataToCollectionViewed(event.data);
  
    parent.postMessage({
      'message': 'shopify_pixel_event',
      'event_name': 'view_item_list',
      'ecomData': JSON.stringify(transformedData)
    }, 
    event.context.document.location.origin);
  });
  
  // Shopify: product_added_to_cart & product_removed_from_cart -> GA4: add_to_cart & remove_from_cart
  
  function handleCartEvent(eventName, event) {
    const cartLine = event.data.cartLine;
    const variant = cartLine.merchandise;
  
    function transformData(variant) {
      return {
        currency: cartLine.cost.totalAmount.currencyCode,
        value: cartLine.cost.totalAmount.amount,
        items: [transformVariantToItem(variant, 0, cartLine.quantity)]
      };
    }
    
    const transformedData = transformData(variant);
  
    parent.postMessage({
      'message': 'shopify_pixel_event',
      'event_name': eventName,
      'ecomData': JSON.stringify(transformedData)
    }, 
    event.context.document.location.origin);
  }
  
  analytics.subscribe("product_added_to_cart", async (event) => {
    handleCartEvent('add_to_cart', event);
  });
  
  analytics.subscribe("product_removed_from_cart", async (event) => {
    handleCartEvent('remove_from_cart', event);
  });


  // Shopify: cart_viewed -> GA4: view_cart
  analytics.subscribe("cart_viewed", async (event) => {
    console.log('view_cart: ', event)
    function transformData(cartData) {
      const cartValue = cartData.cost.totalAmount.amount
      const cartCurrency = cartData.cost.totalAmount.currency
      const cartLines = cartData.lines
      let cartItems = []
      cartLines.forEach(cartLine => {
        let cartItem = cartLine.merchandise
        cartItem.quantity = cartLine.quantity
        cartItems.push(cartItem);
      });
      console.log('cartItems are: ', cartItems)
      const items = cartItems.map((item, index) => transformVariantToItem(item, index));
      console.log('items are: ', items)
      return {
        currency: cartCurrency,
        value: cartValue,
        items: items
      };
    }
    const cartData = event.data.cart
    const transformedData = transformData(cartData);
  
    parent.postMessage({
      'message': 'shopify_pixel_event',
      'event_name': 'view_cart',
      'ecomData': JSON.stringify(transformedData)
    }, 
    event.context.document.location.origin);
  });