import { customerEvents, customerEventsHashed } from "./modules/customerEvents.js";

const urlParams = new URLSearchParams(window.location.search);
const version = urlParams.get('version');

if (version === 'customerEventsHashed') {
    customerEventsHashed()
} else {
    customerEvents()
}