import { Linking } from 'react-native';

export const WHATSAPP_URL = 'https://wa.me/971542249946';
export const OFFICE_PHONE = '04 329 3924';
const OFFICE_TEL = 'tel:043293924';
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=PurpleBox+Storage+Al+Quoz+Dubai';

const open = (url: string) => Linking.openURL(url).catch(() => {});

/** WhatsApp is the safety net on every error and empty state. */
export const openWhatsApp = (message?: string) =>
  open(message ? `${WHATSAPP_URL}?text=${encodeURIComponent(message)}` : WHATSAPP_URL);

export const callOffice = () => open(OFFICE_TEL);
export const openMaps = () => open(MAPS_URL);
