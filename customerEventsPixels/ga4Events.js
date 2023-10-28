 // Transforms Shopify items data schema to GA4 items schema
function transformVariantToItem(variant, index = 0, quantity = 1) {
  return {
      item_id: variant.id,
      product_id: variant.product.id,
      item_name: variant.product.title,
      affiliation: variant.product.vendor,
      index: index,
      item_brand: variant.product.vendor,
      item_category: variant.product.type,
      item_variant: variant.title,
      price: variant.price.amount,
      quantity: quantity
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
      'event_name': view_item_list,
      'ecomData': JSON.stringify(transformedData)
    }, 
    event.context.document.location.origin);
  });
  
  // Shopify: product_added_to_cart -> GA4: add_to_cart
  analytics.subscribe("product_added_to_cart", async (event) => {
    console.log('atc event: ')
    console.log(event.data)
    const cartLine = event.data.cartLine
    const variant = cartLine.merchandise
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
      'event_name': 'add_to_cart',
      'ecomData': JSON.stringify(transformedData)
    }, 
    event.context.document.location.origin);
  });