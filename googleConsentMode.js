  // Define dataLayer and the gtag function.
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}

  // Optional
  gtag('set', 'url_passthrough', true);

  // Default storage to 'denied'.
  gtag('consent', 'default', {
    // Google Privacy Objects
    'ad_storage': 'denied',
    'analytics_storage': 'denied',
    'functionality_storage': 'denied',
    'personalization_storage': 'denied',
    // 'security_storage': 'denied', // Not Used
    // Shopify Privacy Objects
    'analyticsAllowed': 'denied',
    'preferencesAllowed': 'denied',
    'firstPartyMarketingAllowed': 'denied',
    'thirdPartyMarketingAllowed': 'denied'
  });

  // Function to push to gtag Consent Mode accoding to Shopify Customer Privacy API model
  function consentModeUpdate(consent) {
    // Analytics permissions
    gtag('consent', 'update', {
        'ad_storage': consent.analyticsAllowed ? 'granted' : 'denied',
        'analytics_storage': consent.analyticsAllowed ? 'granted' : 'denied',
        'analyticsAllowed': consent.analyticsAllowed ? 'granted' : 'denied'
    });

    // Preferences permissions
    gtag('consent', 'update', {
        'functionality_storage': consent.preferencesAllowed ? 'granted' : 'denied',
        'preferencesAllowed': consent.preferencesAllowed ? 'granted' : 'denied'
    });

    // First party marketing permissions
    gtag('consent', 'update', {
        'ad_storage': consent.firstPartyMarketingAllowed ? 'granted' : 'denied',
        'analytics_storage': consent.firstPartyMarketingAllowed ? 'granted' : 'denied',
        'firstPartyMarketingAllowed': consent.firstPartyMarketingAllowed ? 'granted' : 'denied'
    });

    // Third party marketing permissions
    gtag('consent', 'update', {
        'ad_storage': consent.thirdPartyMarketingAllowed ? 'granted' : 'denied',
        'analytics_storage': consent.thirdPartyMarketingAllowed ? 'granted' : 'denied',
        'thirdPartyMarketingAllowed': consent.thirdPartyMarketingAllowed ? 'granted' : 'denied'
    });
  }
  
// Shopify Consent API Variables
    let shopifyConsent = {
        analyticsAllowed: '',
        preferencesAllowed: '',
        firstPartyMarketingAllowed: '',
        thirdPartyMarketingAllowed: ''
    };

    window.addEventListener("load", event => {
      shopifyConsent.analyticsAllowed = window.Shopify.customerPrivacy.firstPartyMarketingAllowed();
      shopifyConsent.preferencesAllowed = window.Shopify.customerPrivacy.preferencesProcessingAllowed();
      shopifyConsent.firstPartyMarketingAllowed = window.Shopify.customerPrivacy.analyticsProcessingAllowed();
      shopifyConsent.thirdPartyMarketingAllowed = window.Shopify.customerPrivacy.thirdPartyMarketingAllowed();
        console.log('Window loaded: ', shopifyConsent)
        // Push to dataLayer
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "shopifyConsentAPIUpdate",
            consent: shopifyConsent
        });
        // Push to Google Consent Mode
        consentModeUpdate(shopifyConsent);
        }
    );
    document.addEventListener("visitorConsentCollected", event => {
      shopifyConsent.analyticsAllowed = event.detail.analyticsAllowed; 
      shopifyConsent.preferencesAllowed = event.detail.preferencesAllowed;
      shopifyConsent.firstPartyMarketingAllowed = event.detail.firstPartyMarketingAllowed;
      shopifyConsent.thirdPartyMarketingAllowed = event.detail.thirdPartyMarketingAllowed;
        console.log('Consent collected: ', shopifyConsent)
        // Push to dataLayer
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
            event: "shopifyConsentAPIUpdate",
            consent: shopifyConsent
        });
        // Push to Google Consent Mode
        consentModeUpdate(shopifyConsent);
      }
    );
// End Privacy Variables