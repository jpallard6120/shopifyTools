// This small snippet can be added to Shopify Customer Events
// to update the language on a Klaviyo profile, as soon as the 
// email is known within checkout steps. You need to add a  
// localStorage Key of name 'language' with the appropriate value 
// at any step before entering checkout. 

const publicKey = 'YOUR_PUBLIC_KEY_HERE'

analytics.subscribe("checkout_contact_info_submitted", event => {
    const language = localStorage.getItem('language');
    const email = event.data.checkout.email;

    // Build call to Klaviyo client API
    // API docs: https://developers.klaviyo.com/en/reference/create_client_profile
    const options = {
        method: 'POST',
        headers: {
          accept: 'application/json',
          revision: '2024-02-15',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: {
                email: email, 
                properties: {
                    language: language
                }
            }
          }
        })
      };
      fetch(`https://a.klaviyo.com/client/profiles/?company_id=${publicKey}`, options)
        .then(response => {
            if (!response.ok) {
                console.log('Error: ', response.json());
            } 
        })
        .catch(err => console.error(err));
  });