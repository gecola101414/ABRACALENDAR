import React, { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { X, CheckCircle2, AlertCircle, Phone, Baby, Calendar as CalIcon, Clock, Wand2, FileText, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROOMS, SLOTS, Booking, Slot, Room, ROOM_COLORS, SLOT_LABELS } from '../types';
import { db } from '../lib/firebase';
import { doc, writeBatch, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';

interface DayDetailModalProps {
  date: Date;
  bookings: Booking[];
  onClose: () => void;
  initialSlot?: { room: Room, slot: Slot };
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ date, bookings, onClose, initialSlot }) => {
  const { isAdmin, user, ownerId } = useAuth();
  const [selectedSlot, setSelectedSlot] = useState<{ room: Room, slot: Slot } | null>(initialSlot || null);
  const [formData, setFormData] = useState({ childName: '', childAge: '', parentPhone: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactDetails, setContactDetails] = useState<Record<string, { parentPhone: string }>>({});

  const dateStr = format(date, 'yyyy-MM-dd');

  const fetchContacts = async () => {
    const contactsMap: Record<string, { parentPhone: string }> = {};
    const relevantBookings = bookings.filter(b => b.date === dateStr);
    
    for (const booking of relevantBookings) {
      // Admin can see all, Owner can see their own (if authenticated)
      const isOwner = booking.ownerUid === ownerId;
      // We only fetch contacts from subcollection if user is Admin or authenticated Owner
      if (isAdmin || (isOwner && user)) {
        if (booking.id) {
          try {
            const contactSnap = await getDocs(collection(db, 'bookings', booking.id, 'contacts'));
            contactSnap.forEach(doc => {
              contactsMap[booking.id!] = doc.data() as { parentPhone: string };
            });
          } catch (e) {
            // This is expected if auth is off or not the owner
          }
        }
      }
    }
    setContactDetails(contactsMap);
  };

  React.useEffect(() => {
    fetchContacts();
  }, [bookings, user, isAdmin, ownerId]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const bookingId = doc(collection(db, 'bookings')).id;
      const bookingRef = doc(db, 'bookings', bookingId);
      const contactRef = doc(db, 'bookings', bookingId, 'contacts', 'info');

      const publicData = {
        childName: formData.childName,
        childAge: Number(formData.childAge),
        room: selectedSlot.room,
        slot: selectedSlot.slot,
        date: dateStr,
        notes: formData.notes,
        ownerUid: ownerId,
        createdAt: serverTimestamp(),
        status: 'pending'
      };

      const privateData = {
        parentPhone: formData.parentPhone
      };

      batch.set(bookingRef, publicData);
      batch.set(contactRef, privateData);

      await batch.commit();
      onClose();
    } catch (error) {
      console.error("Booking error:", error);
      alert("Errore durante la prenotazione. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header - Compact */}
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <CalIcon className="text-purple-600 w-5 h-5" />
              {format(date, 'EEEE d MMMM yyyy', { locale: it })}
            </h3>
            <p className="text-[10px] text-gray-500 font-medium">Stato delle sale e prenotazioni</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ROOMS.map(room => (
              <div key={room} className="space-y-2">
                <div className={cn(
                  "p-2 rounded-xl border text-center text-[10px] font-black shadow-sm",
                  ROOM_COLORS[room]
                )}>
                  {room.replace('SALA ', '')}
                </div>
                <div className="space-y-2">
                  {SLOTS.map(slot => {
                    const booking = bookings.find(b => b.date === dateStr && b.room === room && b.slot === slot);
                    const isSelected = selectedSlot?.room === room && selectedSlot?.slot === slot;
                    const isOwner = booking?.ownerUid === ownerId;
                    const canSeeDetails = isAdmin || isOwner;

                    return (
                      <button
                        key={slot}
                        disabled={!!booking && !isAdmin}
                        onClick={() => !booking && setSelectedSlot({ room, slot })}
                        className={cn(
                          "w-full p-2.5 rounded-lg border-2 transition-all flex flex-col gap-0.5 text-left relative overflow-hidden group",
                          booking
                            ? isOwner
                              ? "bg-amber-50 border-amber-400"
                              : "bg-gray-50 border-gray-100 opacity-60"
                            : isSelected
                              ? "bg-purple-600 border-purple-600 text-white shadow-md ring-2 ring-purple-100"
                              : "bg-white border-dashed border-gray-200 hover:border-purple-300"
                        )}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={cn(
                            "text-[8px] font-bold uppercase tracking-widest",
                            booking ? "text-gray-400" : isSelected ? "text-purple-100" : "text-gray-400"
                          )}>
                            {SLOT_LABELS[slot]}
                          </span>
                        </div>
                        
                        {booking ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-800 truncate">
                              {isOwner ? booking.childName : "OCCUPATA"}
                            </span>
                            {isOwner && (
                              <span className={cn(
                                "text-[7px] font-black px-1 rounded-sm mt-0.5 w-fit",
                                booking.status === 'confirmed' 
                                  ? "bg-green-100 text-green-700" 
                                  : "bg-amber-100 text-amber-700"
                              )}>
                                {booking.status === 'confirmed' ? "CONFERMATA" : "IN ATTESA"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={cn(
                            "text-[10px] font-bold",
                            isSelected ? "text-white" : "text-gray-300"
                          )}>
                            {isSelected ? "Selezionata" : "Libera"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Booking Form (Conditional) */}
          {selectedSlot && !isAdmin && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-purple-50 rounded-2xl p-4 border-2 border-purple-100 relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="mb-4">
                  <h4 className="text-xl font-black text-purple-900 flex items-center gap-2">
                    <Wand2 className="w-5 h-5" />
                    Prenota la tua festa!
                  </h4>
                  <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider mt-0.5">
                    {selectedSlot.room} • {SLOT_LABELS[selectedSlot.slot]}
                  </p>
                </div>

                <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-purple-700 uppercase ml-1">Nome Festeggiato/a</label>
                    <input
                      required
                      autoFocus
                      value={formData.childName}
                      onChange={e => setFormData({...formData, childName: e.target.value})}
                      className="w-full px-3 py-2 bg-white rounded-xl border-2 border-purple-100 focus:border-purple-500 outline-none transition-all text-sm font-bold"
                      placeholder="Nome..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-purple-700 uppercase ml-1">Anni Compiuti</label>
                    <input
                      required
                      type="number"
                      value={formData.childAge}
                      onChange={e => setFormData({...formData, childAge: e.target.value})}
                      className="w-full px-3 py-2 bg-white rounded-xl border-2 border-purple-100 focus:border-purple-500 outline-none transition-all text-sm font-bold"
                      placeholder="Es: 5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-purple-700 uppercase ml-1">Cellulare Genitore</label>
                    <input
                      required
                      type="tel"
                      value={formData.parentPhone}
                      onChange={e => setFormData({...formData, parentPhone: e.target.value})}
                      className="w-full px-3 py-2 bg-white rounded-xl border-2 border-purple-100 focus:border-purple-500 outline-none transition-all text-sm font-bold"
                      placeholder="333 1234567"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-purple-700 uppercase ml-1">Note (Opzionale)</label>
                    <input
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      className="w-full px-3 py-2 bg-white rounded-xl border-2 border-purple-100 focus:border-purple-500 outline-none transition-all text-sm font-bold"
                      placeholder="Es: Intolleranze..."
                    />
                  </div>

                  <div className="md:col-span-2 pt-1">
                    <button
                      disabled={isSubmitting}
                      className="w-full py-3 bg-purple-600 text-white rounded-xl font-black text-lg shadow-lg hover:bg-purple-700 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? 'MAGIA IN CORSO...' : 'MAGIA PRONTA!'}
                    </button>
                  </div>
                </form>

                <div className="flex gap-4 mt-6 pt-4 border-t border-purple-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">Confermata dall'amministratore</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">In attesa di verifica</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {isAdmin && (
            <div className="bg-indigo-50 rounded-2xl p-6 border-2 border-indigo-100">
              <h4 className="text-lg font-black text-indigo-900 mb-2">Modalità Amministratore</h4>
              <p className="text-indigo-700 text-sm">
                In qualità di amministratore puoi visualizzare i recapiti telefonici e gestire le prenotazioni.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
