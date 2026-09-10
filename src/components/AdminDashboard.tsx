import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Booking, ROOMS, ROOM_COLORS, SLOT_LABELS } from '../types';
import { format, isAfter, startOfToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { Trash2, Phone, Baby, Calendar, User, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AdminDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoom, setFilterRoom] = useState<string>('Tutte');

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
      
      // Fetch all contacts for these bookings
      const contactsMap: Record<string, string> = {};
      for (const b of data) {
        if (b.id) {
          const contactSnap = await getDocs(collection(db, 'bookings', b.id, 'contacts'));
          contactSnap.forEach(doc => {
            contactsMap[b.id!] = doc.data().parentPhone;
          });
        }
      }
      setContacts(contactsMap);
    });
    return unsubscribe;
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Sicuro di voler eliminare questa prenotazione?')) {
      try {
        await deleteDoc(doc(db, 'bookings', id));
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.childName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRoom = filterRoom === 'Tutte' || b.room === filterRoom;
    return matchesSearch && matchesRoom;
  });

  const upcomingBookings = filteredBookings.filter(b => isAfter(new Date(b.date), startOfToday()));
  const pastBookings = filteredBookings.filter(b => !isAfter(new Date(b.date), startOfToday()));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Stats & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cerca per nome bambino..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-2xl transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={filterRoom}
              onChange={e => setFilterRoom(e.target.value)}
              className="flex-1 sm:w-48 py-3 px-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-2xl transition-all font-medium"
            >
              <option value="Tutte">Tutte le sale</option>
              {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-indigo-600 rounded-3xl p-6 shadow-lg text-white flex items-center justify-between">
          <div>
            <p className="text-indigo-100 font-bold uppercase tracking-wider text-xs">Totale Prenotazioni</p>
            <h3 className="text-4xl font-black">{bookings.length}</h3>
          </div>
          <Calendar className="w-12 h-12 opacity-20" />
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 px-2">
          Prossime Prenotazioni
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{upcomingBookings.length}</span>
        </h3>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {upcomingBookings.map(booking => (
              <motion.div
                layout
                key={booking.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group"
              >
                <div className="flex gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${ROOM_COLORS[booking.room]}`}>
                    <Baby className="w-8 h-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-black text-gray-900 text-lg truncate uppercase">{booking.childName}</h4>
                        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(booking.date), 'd MMMM yyyy', { locale: it })}
                          <span className="text-gray-300">•</span>
                          {SLOT_LABELS[booking.slot]}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(booking.id!)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-700">{booking.childAge} anni</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                          <Phone className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-indigo-600">{contacts[booking.id!] || 'Caricamento...'}</span>
                      </div>
                      {booking.notes && (
                        <div className="w-full mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-600 italic border-l-2 border-purple-300">
                          "{booking.notes}"
                        </div>
                      )}
                      <div className={`text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-widest ml-auto self-center ${ROOM_COLORS[booking.room]}`}>
                        {booking.room.split(' ').pop()}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {upcomingBookings.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">Nessuna prenotazione imminente trovata.</p>
          </div>
        )}
      </div>
    </div>
  );
};
