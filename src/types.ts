import { format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';

export type Room = 'SALA FATA TURCHINA' | 'SALA FOLLETTO ZURLI' | 'SALA MAGO MERLINO';
export type Slot = 'MATTINA' | 'POMERIGGIO' | 'SERA';

export interface Booking {
  id?: string;
  childName: string;
  childAge: number;
  room: Room;
  slot: Slot;
  date: string; // yyyy-MM-dd
  notes?: string;
  ownerUid?: string;
  createdAt: any;
}

export interface BookingWithContact extends Booking {
  parentPhone: string;
}

export const ROOMS: Room[] = [
  'SALA FATA TURCHINA',
  'SALA FOLLETTO ZURLI',
  'SALA MAGO MERLINO'
];

export const SLOTS: Slot[] = ['MATTINA', 'POMERIGGIO', 'SERA'];

export const ROOM_COLORS: Record<Room, string> = {
  'SALA FATA TURCHINA': 'bg-cyan-100 border-cyan-300 text-cyan-800',
  'SALA FOLLETTO ZURLI': 'bg-lime-100 border-lime-300 text-lime-800',
  'SALA MAGO MERLINO': 'bg-purple-100 border-purple-300 text-purple-800'
};

export const SLOT_LABELS: Record<Slot, string> = {
  'MATTINA': '☀️ Mattina',
  'POMERIGGIO': '⛅ Pomeriggio',
  'SERA': '🌙 Sera'
};

export const getItalianHoliday = (date: Date): string | null => {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  
  if (m === 1 && d === 1) return 'Capodanno';
  if (m === 1 && d === 6) return 'Epifania';
  if (m === 4 && d === 25) return 'Liberazione';
  if (m === 5 && d === 1) return 'Festa del Lavoro';
  if (m === 6 && d === 2) return 'Festa della Repubblica';
  if (m === 8 && d === 15) return 'Ferragosto';
  if (m === 11 && d === 1) return 'Ognissanti';
  if (m === 12 && d === 8) return 'Immacolata';
  if (m === 12 && d === 25) return 'Natale';
  if (m === 12 && d === 26) return 'S. Stefano';
  
  // Easter (Pasqua) and Easter Monday (Pasquetta) are variable, but for simplicity we'll stick to fixed ones 
  // or add a more complex calculation if needed. For now, fixed ones cover most.
  return null;
};
