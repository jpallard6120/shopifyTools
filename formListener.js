// This script needs to be adjusted for the form and data to be sent to Klaviyo.
// It's a work in progress, and needs to be generalized. 

var MAX_RETRIES = 10; // Maximum number of retries
var RETRY_INTERVAL = 500; // Retry every 500 milliseconds

var retries = 0;
var retryInterval = setInterval(function() {
    var form = document.querySelector(".g-container");
    if (form || retries > MAX_RETRIES) {
        clearInterval(retryInterval); // Stop retrying once the form is found or max retries reached

        if (!form) {
            console.error("Failed to find .g-container after maximum retries.");
            return;
        }

        // Add an event listener for the 'submit' event
        form.addEventListener("submit", function(event) {
            // Prevent the form from actually submitting
            event.preventDefault();

            // Validate the form for errors
            let formClasses = form.querySelector('.panels .panel').classList
            let validate = ![...formClasses].includes('errors')
            console.log('Form validated: ', validate)

            if (validate) {
            // Use the FormData API to get the form data
            var formData = new FormData(form);

            // Push the form data in an object
            let dataObject = {};
            [...formData.entries()].forEach((entry) => {
                const key = entry[0]
                const value = entry[1]
                dataObject[key] = value
            })

            //// Send a subscription event to Klaviyo (For opted-in checkbox - logic to be added)
            // Profile data - can be used as is within options.body for a profile add without subscription
            const profileData = {
                data: {
                    type: 'profile',
                    attributes: {
                    email: dataObject['email-1'],
                    first_name: dataObject['name-1'],
                    last_name: dataObject['name-2'],
                    properties: {
                        canton_saveur: dataObject['text-2'],
                        canton_concours: true,
                        phone_number: dataObject['phone-1'],
                        code_postal: dataObject['text-1']
                    }
                    }
                }
            }
            console.log('Profile data is: ', profileData)

            // For a subscription
            const listId = 'LIST ID HERE'
            const subscriptionData = {
                data: {
                  type: 'subscription',
                  attributes: {
                    custom_source: dataObject['page[title]'],
                    profile: profileData
                  },
                  relationships: {list: {data: {type: 'list', id: listId}}}
                }
              }
              console.log('Subscription data is: ', subscriptionData)

              let options = {
                method: 'POST',
                headers: {revision: '2023-10-15', 'content-type': 'application/json'},
              };

              // Subscription bool
              let optedIn = false
              if (dataObject['acceptTerms-2[]'] == 'Yes') {
                optedIn = true
              }
              console.log('Opt-in status is: ', optedIn)

              // Choose correct body according to optin, and generate correct fetch URL. The endpoint is 'subscriptions' for opted-in
              // subscribers, and 'profiles' for non-opted in subscriptions. 
              optedIn ? options.body = JSON.stringify(subscriptionData) : options.body = JSON.stringify(profileData);
              const companyId = 'COMPANY_ID_HERE'
              const fetchUrl = `https://a.klaviyo.com/client/${optedIn ? 'subscriptions' : 'profiles'}/?company_id=${companyId}`
              
              // Call to Klaviyo endpoint
              fetch(fetchUrl, options)
                .then(response => response.json())
                .then(response => console.log(response))
                .catch(err => console.error(err));
            }
        });
    }
    retries++;
}, RETRY_INTERVAL);