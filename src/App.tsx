/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Navbar } from './components/Navbar';
import { Calendar } from './components/Calendar';
import { DayDetailModal } from './components/DayDetailModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Booking, Room, Slot } from './types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AnimatePresence, motion } from 'framer-motion';
import { Wand2, PartyPopper, Sparkles, AlertCircle } from 'lucide-react';

function AdminAccessButton({ onViewChange }: { onViewChange: (v: 'calendar' | 'admin') => void }) {
  const { openAdminLoginModal } = useAuth();
  return (
    <div className="flex gap-2">
      <button 
        onClick={() => onViewChange('calendar')}
        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors text-xs"
      >
        Calendario
      </button>
      <button 
        onClick={openAdminLoginModal}
        className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-black hover:bg-purple-700 transition-all shadow-md text-xs active:scale-95"
      >
        Accedi con Password
      </button>
    </div>
  );
}

function AppContent() {
  const [view, setView] = useState<'calendar' | 'admin'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ room: Room, slot: Slot } | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { isAdmin, loading, isAnonymous, user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'bookings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
    });
    return unsubscribe;
  }, []);

  const handleSlotDoubleClick = (date: Date, room: Room, slot: Slot) => {
    setSelectedDate(date);
    setSelectedSlot({ room, slot });
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
    setSelectedSlot(undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-purple-50">
        <Wand2 className="w-12 h-12 text-purple-600 animate-bounce mb-4" />
        <p className="text-purple-900 font-black tracking-widest uppercase animate-pulse">Abracadabra...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 selection:bg-purple-200 selection:text-purple-900">
      <Navbar currentView={view} onViewChange={(v) => setView(v)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <AnimatePresence mode="wait">
          {view === 'calendar' ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Hero Section */}
              <div className="relative p-12 rounded-[3rem] bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <div className="absolute top-10 left-10"><Sparkles className="w-20 h-20" /></div>
                  <div className="absolute bottom-10 right-10"><PartyPopper className="w-24 h-24" /></div>
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="text-center md:text-left flex-1">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-none">
                      PRENOTA LA TUA <br/> FESTA MAGICA!
                    </h1>
                    <p className="text-lg md:text-xl text-purple-100 font-medium max-w-xl mx-auto md:mx-0">
                      Scegli il giorno, la sala e la fascia oraria. Tutto il resto è pura magia per il compleanno del tuo bambino.
                    </p>
                  </div>
                  <div className="flex -space-x-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl transform hover:-translate-y-2 transition-transform cursor-default">
                        <Wand2 className="w-8 h-8 text-white" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Calendar onSlotDoubleClick={handleSlotDoubleClick} />
            </motion.div>
          ) : (
            isAdmin ? (
              <AdminDashboard key="admin" />
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-md mx-auto p-8">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">Area Riservata Amministratore</h2>
                <p className="text-gray-500 text-sm mt-2">
                  Inserisci la password (iniziale: <strong>123456</strong>) per accedere alla gestione dei compleanni.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                  <button 
                    onClick={() => {
                      const { openAdminLoginModal } = (window as any);
                    }}
                    className="hidden"
                  >
                  </button>
                  <AdminAccessButton onViewChange={(v) => setView(v)} />
                </div>
              </div>
            )
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Wand2 className="w-6 h-6 text-purple-600" />
            <span className="text-xl font-black font-serif">ABRACADABRA</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">© 2026 Abracadabra Ludoteca • Via della Magia, 123</p>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {selectedDate && (
          <DayDetailModal 
            date={selectedDate} 
            bookings={bookings} 
            onClose={handleCloseModal}
            initialSlot={selectedSlot}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

