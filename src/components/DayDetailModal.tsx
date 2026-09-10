import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  X, CheckCircle2, AlertCircle, Phone, Baby, Calendar as CalIcon, 
  Clock, Wand2, FileText, Info, Sparkles, Trash2, MessageCircle, ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROOMS, SLOTS, Booking, Slot, Room, ROOM_COLORS, SLOT_LABELS } from '../types';
import { db } from '../lib/firebase';
import { doc, writeBatch, serverTimestamp, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import { BirthdayCakeSymbol } from './BirthdayCakeSymbol';
import { BirthdayWhatsAppChat } from './BirthdayWhatsAppChat';
import { AbracadabraNotesBox } from './AbracadabraNotesBox';
import { getBirthdayWhatsAppUrl } from '../lib/whatsapp';
import { ErrorBoundary } from './ErrorBoundary';

interface DayDetailModalProps {
  date: Date;
  bookings: Booking[];
  onClose: () => void;
  initialSlot?: { room: Room, slot: Slot };
  initialBooking?: Booking;
}

const DayDetailModalInner: React.FC<DayDetailModalProps> = ({ 
  date, 
  bookings, 
  onClose, 
  initialSlot,
  initialBooking 
}) => {
  const { isAdmin, user, ownerId } = useAuth();
  const [selectedSlot, setSelectedSlot] = useState<{ room: Room, slot: Slot } | null>(initialSlot || null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(initialBooking?.id || null);
  const [formData, setFormData] = useState({ childName: '', childAge: '', parentPhone: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [contactDetails, setContactDetails] = useState<Record<string, { parentPhone: string }>>({});

  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const dateStr = format(date, 'yyyy-MM-dd');

  // Find booking for the currently selected slot or active booking
  const currentSlotBooking = bookings.find(b => 
    (activeBookingId && b.id === activeBookingId) ||
    (selectedSlot && b.date === dateStr && b.room === selectedSlot.room && b.slot === selectedSlot.slot)
  );

  const fetchContacts = async () => {
    const contactsMap: Record<string, { parentPhone: string }> = {};
    
    // Check all bookings present in the day or matching selected booking
    for (const booking of bookings) {
      if (!booking.id) continue;
      
      // If already stored in booking document
      if (booking.parentPhone) {
        contactsMap[booking.id] = { parentPhone: booking.parentPhone };
      }

      // Also try fetching from contacts subcollection
      try {
        const contactSnap = await getDocs(collection(db, 'bookings', booking.id, 'contacts'));
        contactSnap.forEach(cDoc => {
          const data = cDoc.data() as { parentPhone?: string };
          if (data?.parentPhone) {
            contactsMap[booking.id!] = { parentPhone: data.parentPhone };
          }
        });
      } catch (e) {
        // Safe fallback
      }
    }
    setContactDetails(contactsMap);
  };

  useEffect(() => {
    fetchContacts();
  }, [bookings, user, isAdmin, ownerId, currentSlotBooking?.id]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const bookingId = doc(collection(db, 'bookings')).id;
      const bookingRef = doc(db, 'bookings', bookingId);
      const contactRef = doc(db, 'bookings', bookingId, 'contacts', 'info');

      const cleanPhone = formData.parentPhone.trim();

      const publicData = {
        childName: formData.childName.trim(),
        childAge: Number(formData.childAge),
        room: selectedSlot.room,
        slot: selectedSlot.slot,
        date: dateStr,
        notes: formData.notes.trim(),
        parentPhone: cleanPhone, // Saved directly on booking document
        ownerUid: ownerId,
        createdAt: serverTimestamp(),
        status: isAdmin ? 'confirmed' : 'pending' // Admin auto-confirms if creating
      };

      const privateData = {
        parentPhone: cleanPhone
      };

      batch.set(bookingRef, publicData);
      batch.set(contactRef, privateData);

      await batch.commit();

      // Immediately register in local contact cache
      setContactDetails(prev => ({
        ...prev,
        [bookingId]: { parentPhone: cleanPhone }
      }));

      onClose();
    } catch (error) {
      console.error("Booking error:", error);
      alert("Errore durante la prenotazione. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateParentPhone = async () => {
    if (!currentSlotBooking?.id || !newPhoneInput.trim() || isSavingPhone) return;
    setIsSavingPhone(true);
    try {
      const cleanPhone = newPhoneInput.trim();
      const batch = writeBatch(db);
      const bRef = doc(db, 'bookings', currentSlotBooking.id);
      const cRef = doc(db, 'bookings', currentSlotBooking.id, 'contacts', 'info');

      batch.update(bRef, { parentPhone: cleanPhone });
      batch.set(cRef, { parentPhone: cleanPhone }, { merge: true });
      await batch.commit();

      setContactDetails(prev => ({
        ...prev,
        [currentSlotBooking.id!]: { parentPhone: cleanPhone }
      }));
      setEditingPhone(false);
      setNewPhoneInput('');
    } catch (err) {
      console.error("Error updating phone:", err);
      alert("Errore nell'aggiornamento del numero telefonico.");
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleToggleConfirm = async (booking: Booking) => {
    if (!booking.id) return;
    setActionLoading(true);
    const newStatus = booking.status === 'confirmed' ? 'pending' : 'confirmed';
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: newStatus
      });
    } catch (err) {
      console.error("Toggle error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    if (!booking.id) return;
    if (window.confirm(`Sei sicuro di voler eliminare la prenotazione per ${booking.childName?.toUpperCase()}?`)) {
      setActionLoading(true);
      try {
        await deleteDoc(doc(db, 'bookings', booking.id));
        setActiveBookingId(null);
        setSelectedSlot(null);
      } catch (err) {
        console.error("Delete error:", err);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const activeParentPhone = currentSlotBooking?.parentPhone || (currentSlotBooking?.id ? contactDetails[currentSlotBooking.id]?.parentPhone : '') || '';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
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
        className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[92vh] border border-gray-100"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <CalIcon className="text-amber-400 w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black capitalize leading-tight">
                {format(date, 'EEEE d MMMM yyyy', { locale: it })}
              </h3>
              <p className="text-xs text-purple-200 font-bold">
                {isAdmin ? "Pannello Dettaglio & Schede Prenotazioni" : "Stato Sale & Prenotazione Festa"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95 text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Room & Slot Selector Cards */}
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">
              Seleziona una sala o clicca su una prenotazione:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ROOMS.map(room => (
                <div key={room} className="space-y-2 bg-gray-50/60 p-2.5 rounded-2xl border border-gray-100">
                  <div className={cn(
                    "p-2 rounded-xl border text-center text-[10px] font-black shadow-sm tracking-wide",
                    ROOM_COLORS[room]
                  )}>
                    {room.replace('SALA ', '')}
                  </div>
                  <div className="space-y-1.5">
                    {SLOTS.map(slot => {
                      const booking = bookings.find(b => b.date === dateStr && b.room === room && b.slot === slot);
                      const isSelected = selectedSlot?.room === room && selectedSlot?.slot === slot;
                      const isOwner = booking?.ownerUid === ownerId;
                      const canSeeDetails = isAdmin || isOwner;
                      const isConfirmed = booking?.status === 'confirmed';

                      return (
                        <button
                          key={slot}
                          onClick={() => {
                            setSelectedSlot({ room, slot });
                            if (booking?.id) {
                              setActiveBookingId(booking.id);
                            } else {
                              setActiveBookingId(null);
                            }
                          }}
                          className={cn(
                            "w-full p-2.5 rounded-xl border-2 transition-all flex flex-col gap-0.5 text-left relative overflow-hidden group",
                            isSelected
                              ? "ring-2 ring-purple-600 border-purple-600 bg-purple-50 shadow-md"
                              : booking
                                ? isConfirmed
                                  ? "bg-amber-50/80 border-amber-300 hover:border-amber-400"
                                  : "bg-purple-50/50 border-purple-200 hover:border-purple-300"
                                : "bg-white border-dashed border-gray-200 hover:border-purple-300"
                          )}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                              {SLOT_LABELS[slot]}
                            </span>
                            {isConfirmed && <span className="text-xs">🎂</span>}
                          </div>
                          
                          {booking ? (
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              <span className={cn(
                                "text-xs font-black truncate",
                                canSeeDetails ? "text-gray-900 uppercase" : "text-gray-500 font-bold"
                              )}>
                                {canSeeDetails ? (
                                  <>
                                    {booking.childName} {booking.childAge ? `(${booking.childAge}a)` : ''}
                                  </>
                                ) : "OCCUPATA"}
                              </span>
                              <span className={cn(
                                "text-[8px] font-black px-1.5 py-0.5 rounded-md w-fit uppercase",
                                isConfirmed 
                                  ? "bg-amber-200 text-amber-900 font-black" 
                                  : "bg-purple-100 text-purple-800"
                              )}>
                                {isConfirmed ? "CONFERMATA 🎂" : "IN ATTESA ⏳"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-purple-400 group-hover:text-purple-600 mt-0.5">
                              + DISPONIBILE
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIVE VIEW: SCHEDA PRENOTAZIONE (If slot has booking) */}
          {currentSlotBooking ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-purple-50 via-white to-amber-50/40 rounded-3xl p-6 sm:p-8 border-2 border-purple-200 shadow-xl relative overflow-hidden"
            >
              {/* Confirmed Top Ribbon */}
              {currentSlotBooking.status === 'confirmed' && (
                <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500" />
              )}

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-purple-100">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center font-black shadow-inner",
                    ROOM_COLORS[currentSlotBooking.room]
                  )}>
                    <Baby className="w-8 h-8" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight">
                        {isAdmin || currentSlotBooking.ownerUid === ownerId ? currentSlotBooking.childName : 'Festa di Compleanno'}
                      </h4>
                      {currentSlotBooking.childAge && (
                        <span className="px-3 py-1 bg-purple-600 text-white rounded-xl text-xs font-black shadow-sm">
                          {currentSlotBooking.childAge} ANNI
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-500 mt-0.5">
                      {currentSlotBooking.room} • {SLOT_LABELS[currentSlotBooking.slot]}
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div>
                  {currentSlotBooking.status === 'confirmed' ? (
                    <BirthdayCakeSymbol size="lg" animated={true} />
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>IN ATTESA DI CONFERMA</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                {/* Contact Phone (for Admin or Owner) */}
                <div className="p-4 bg-white rounded-2xl border border-purple-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-purple-600 block">
                        Recapito Telefonico Genitore
                      </span>
                      {isAdmin && !editingPhone && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewPhoneInput(activeParentPhone || '');
                            setEditingPhone(true);
                          }}
                          className="text-[10px] font-black text-purple-700 hover:text-purple-900 underline"
                        >
                          {activeParentPhone ? 'Modifica numero' : '+ Inserisci numero'}
                        </button>
                      )}
                    </div>

                    {editingPhone ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="tel"
                          value={newPhoneInput}
                          onChange={(e) => setNewPhoneInput(e.target.value)}
                          placeholder="Es: 3401234567"
                          className="w-full px-3 py-2 text-sm font-bold border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isSavingPhone || !newPhoneInput.trim()}
                            onClick={handleUpdateParentPhone}
                            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-black transition-all disabled:opacity-50"
                          >
                            {isSavingPhone ? 'Salvataggio...' : 'Salva Numero'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPhone(false)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all"
                          >
                            Annulla
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900 font-black text-lg">
                        <Phone className="w-5 h-5 text-purple-600 shrink-0" />
                        <span>{activeParentPhone || <span className="text-gray-400 font-normal italic text-sm">Recapito non presente</span>}</span>
                      </div>
                    )}
                  </div>

                  {activeParentPhone && !editingPhone ? (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-purple-50">
                      {/* Direct WhatsApp Web Button */}
                      <a
                        href={getBirthdayWhatsAppUrl(
                          activeParentPhone, 
                          currentSlotBooking.childName, 
                          currentSlotBooking.childAge, 
                          format(date, 'd MMMM yyyy', { locale: it }), 
                          currentSlotBooking.room, 
                          SLOT_LABELS[currentSlotBooking.slot]
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] hover:bg-[#1ebd59] text-white rounded-xl font-black text-xs transition-all shadow-md hover:shadow-lg active:scale-95"
                        title="Clicca per aprire WhatsApp Web e messaggiare subito con il cliente"
                      >
                        <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
                        <span>Apri WhatsApp Web</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>

                      {/* Direct Call Button */}
                      <a
                        href={`tel:${activeParentPhone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
                        title="Chiama direttamente al telefono"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Chiama</span>
                      </a>
                    </div>
                  ) : null}
                </div>

                {/* Notes from Client */}
                <div className="p-4 bg-white rounded-2xl border border-purple-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-600 block mb-1">
                      Note Inserite dal Cliente
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-gray-700 leading-relaxed">
                      {currentSlotBooking.notes ? `"${currentSlotBooking.notes}"` : <span className="text-gray-400 italic">Nessuna richiesta speciale dal cliente</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Note di Abracadabra (Note Indelebili di Gestione Interna) */}
              <div className="mb-6">
                <AbracadabraNotesBox booking={currentSlotBooking} />
              </div>

              {/* Piccolo WhatsApp di Compleanno (Chat tra Cliente e Staff) */}
              <div className="mb-6">
                <BirthdayWhatsAppChat 
                  booking={currentSlotBooking} 
                  parentPhone={activeParentPhone} 
                />
              </div>

              {/* Admin Action Bar */}
              {isAdmin && (
                <div className="pt-4 border-t border-purple-100 flex flex-col sm:flex-row gap-3">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleToggleConfirm(currentSlotBooking)}
                    className={cn(
                      "flex-1 py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]",
                      currentSlotBooking.status === 'confirmed'
                        ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                        : "bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-500 hover:to-pink-600 text-white shadow-orange-500/25"
                    )}
                  >
                    {currentSlotBooking.status === 'confirmed' ? (
                      <>
                        <Clock className="w-4 h-4 text-amber-800" />
                        <span>Ripristina a "In Attesa"</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-yellow-200" />
                        <span>CONFERMA PRENOTAZIONE (Torta 🎂🕯️)</span>
                      </>
                    )}
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleDeleteBooking(currentSlotBooking)}
                    className="py-3.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all border border-red-200 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Elimina</span>
                  </button>
                </div>
              )}
            </motion.div>
          ) : selectedSlot ? (
            /* BOOKING FORM FOR FREE SLOT */
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-purple-50/80 rounded-3xl p-6 sm:p-8 border-2 border-purple-200 relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="mb-5">
                  <h4 className="text-2xl font-black text-purple-900 flex items-center gap-2">
                    <Wand2 className="w-6 h-6 text-purple-600" />
                    Prenota la tua festa!
                  </h4>
                  <p className="text-xs text-purple-700 font-bold uppercase tracking-wider mt-1">
                    {selectedSlot.room} • {SLOT_LABELS[selectedSlot.slot]}
                  </p>
                </div>

                <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-purple-800 uppercase ml-1">Nome Festeggiato/a</label>
                    <input
                      required
                      autoFocus
                      value={formData.childName}
                      onChange={e => setFormData({...formData, childName: e.target.value})}
                      className="w-full px-4 py-3 bg-white rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none transition-all text-sm font-bold text-gray-900 shadow-sm"
                      placeholder="Nome bambino/a..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-purple-800 uppercase ml-1">Anni Compiuti</label>
                    <input
                      required
                      type="number"
                      value={formData.childAge}
                      onChange={e => setFormData({...formData, childAge: e.target.value})}
                      className="w-full px-4 py-3 bg-white rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none transition-all text-sm font-bold text-gray-900 shadow-sm"
                      placeholder="Es: 6"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-purple-800 uppercase ml-1">Cellulare Genitore</label>
                    <input
                      required
                      type="tel"
                      value={formData.parentPhone}
                      onChange={e => setFormData({...formData, parentPhone: e.target.value})}
                      className="w-full px-4 py-3 bg-white rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none transition-all text-sm font-bold text-gray-900 shadow-sm"
                      placeholder="333 1234567"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-purple-800 uppercase ml-1">Note (Opzionale)</label>
                    <input
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      className="w-full px-4 py-3 bg-white rounded-2xl border-2 border-purple-100 focus:border-purple-600 outline-none transition-all text-sm font-bold text-gray-900 shadow-sm"
                      placeholder="Es: Intolleranze, animazione speciale..."
                    />
                  </div>

                  <div className="md:col-span-2 pt-2">
                    <button
                      disabled={isSubmitting}
                      className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-base shadow-lg shadow-purple-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? 'MAGIA IN CORSO...' : 'CONFERMA PRENOTAZIONE'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-3xl border border-gray-200">
              <p className="text-sm font-bold text-gray-500">
                Seleziona uno slot sopra per visualizzare la scheda o effettuare una prenotazione.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const DayDetailModal: React.FC<DayDetailModalProps> = (props) => {
  return (
    <ErrorBoundary fallbackTitle="Errore nella schermata di dettaglio">
      <DayDetailModalInner {...props} />
    </ErrorBoundary>
  );
};
