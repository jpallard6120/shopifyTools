const COOKIE_NAME = '_pandectes_gdpr';
const GRANTED = 'granted';
const DENIED = 'denied';
const STORE_POLICY = DENIED;

const getCookie = (cookieName) => {
    const cookieString = document.cookie;
    const cookieStart = cookieString.indexOf(cookieName + "=");
    if (cookieStart === -1) {
        return null;
    }
    let cookieEnd = cookieString.indexOf(";", cookieStart);
    if (cookieEnd === -1) {
        cookieEnd = cookieString.length;
    }
    const cookieValue = cookieString.substring(cookieStart + cookieName.length + 1, cookieEnd);
    try {
        const  decodedValue = atob(cookieValue);
        const parsedValue = JSON.parse(decodedValue);
        return parsedValue;
    } catch (error) {
        console.error("Error parsing cookie value:", error);
        return null;
    }
};

const getStorage = (preferences, wait_for_update = 0) => {
    const p1 = (preferences & 1) === 0;
    const p2 = (preferences & 2) === 0;
    const p4 = (preferences & 4) === 0;
    output = {
      ad_storage: p4 ? GRANTED : DENIED,
      ad_user_data: p4 ? GRANTED : DENIED,
      ad_personalization: p4 ? GRANTED : DENIED,
      analytics_storage: p2 ? GRANTED : DENIED,
      personalization_storage: p1 ? GRANTED : DENIED,
      functionality_storage: p1 ? GRANTED : DENIED,
      ...(wait_for_update ? {wait_for_update} : {})
    };
    return output;
  };

// Add this after initial gtag config step
const cookie = getCookie(COOKIE_NAME);
const defaultStorage = getStorage(STORE_POLICY === DENIED ? 7 : 0, 500);
gtag('consent', 'default', defaultStorage);
if (cookie && cookie.preferences !== null && cookie.preferences !== undefined) {
  const updateStorage = getStorage(cookie.preferences);
  gtag('consent', 'update', updateStorage);
}