/**
 * Utility functions for creating WhatsApp Web / Mobile direct links
 */

export const formatPhoneForWhatsApp = (phone: string): string => {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0039')) {
    clean = clean.substring(2);
  }
  // If Italian number without international prefix (+39)
  if (!clean.startsWith('39') && (clean.length === 10 || clean.length === 9)) {
    clean = '39' + clean;
  }
  return clean;
};

export const getBirthdayWhatsAppUrl = (
  phone: string,
  childName: string,
  childAge?: number,
  dateFormatted?: string,
  roomName?: string,
  slotLabel?: string
): string => {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const ageText = childAge ? ` (${childAge} anni)` : '';
  const dateText = dateFormatted ? ` per il ${dateFormatted}` : '';
  const roomText = roomName ? ` nella ${roomName}` : '';
  const slotText = slotLabel ? ` (${slotLabel})` : '';

  const message = `Ciao! 👋 Ti contattiamo dallo Staff del Parco Giochi Abracadabra per la festa di compleanno di ${childName.toUpperCase()}${ageText}${dateText}${roomText}${slotText}.\n\nSiamo a tua disposizione per definire tutti i dettagli magici della festa! ✨🎂`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
