import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Booking, ROOMS, ROOM_COLORS, SLOT_LABELS } from '../types';
import { format, isAfter, startOfToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Trash2, Phone, Baby, Calendar, User, Search, Filter, 
  CheckCircle2, Clock, Lock, KeyRound, Sparkles, MessageCircle, AlertCircle, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';
import { BirthdayCakeSymbol } from './BirthdayCakeSymbol';

export const AdminDashboard: React.FC = () => {
  const { isAdminAuthenticated, verifyAdminPassword, setNewAdminPassword, isInitialPasswordDefault } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Password change modal state inside dashboard
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState(false);
  const [passChangeError, setPassChangeError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoom, setFilterRoom] = useState<string>('Tutte');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed'>('all');

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    const q = query(collection(db, 'bookings'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
      
      // Fetch all parent contacts
      const contactsMap: Record<string, string> = {};
      for (const b of data) {
        if (b.id) {
          try {
            const contactSnap = await getDocs(collection(db, 'bookings', b.id, 'contacts'));
            contactSnap.forEach(doc => {
              contactsMap[b.id!] = doc.data().parentPhone;
            });
          } catch (err) {
            console.warn("Contacts fetch note:", err);
          }
        }
      }
      setContacts(contactsMap);
    });
    return unsubscribe;
  }, [isAdminAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = verifyAdminPassword(password);
    if (!result.success) {
      setError(result.message || 'Password errata. Riprova.');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError(null);
    if (newPassInput.length < 4) {
      setPassChangeError('La nuova password deve contenere almeno 4 caratteri.');
      return;
    }
    if (newPassInput !== confirmPassInput) {
      setPassChangeError('Le password non coincidono.');
      return;
    }
    const success = await setNewAdminPassword(newPassInput);
    if (success) {
      setPassChangeSuccess(true);
      setTimeout(() => {
        setPassChangeSuccess(false);
        setIsChangingPass(false);
        setNewPassInput('');
        setConfirmPassInput('');
      }, 1200);
    } else {
      setPassChangeError('Errore nel salvataggio della password.');
    }
  };

  const handleDelete = async (id: string, childName: string) => {
    if (window.confirm(`Sei sicuro di voler eliminare la prenotazione per la festa di ${childName.toUpperCase()}?`)) {
      try {
        await deleteDoc(doc(db, 'bookings', id));
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  const handleToggleStatus = async (booking: Booking) => {
    if (!booking.id) return;
    const newStatus = booking.status === 'confirmed' ? 'pending' : 'confirmed';
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: newStatus
      });
    } catch (error) {
      console.error("Status update error:", error);
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 text-center"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Area Riservata Amministratore</h2>
          <p className="text-gray-500 text-sm mb-4">Inserisci la password per accedere al pannello di gestione.</p>
          
          {isInitialPasswordDefault && (
            <div className="mb-6 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800">
              Password iniziale predefinita: <strong>123456</strong>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={cn(
                  "w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl outline-none transition-all text-center font-black tracking-widest text-lg",
                  error ? "border-red-300 bg-red-50 focus:border-red-500" : "border-gray-100 focus:border-purple-600 focus:bg-white"
                )}
                placeholder="••••••"
              />
              {error && (
                <p className="text-red-500 text-xs font-bold mt-2">{error}</p>
              )}
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black shadow-lg shadow-purple-600/30 hover:bg-purple-700 transition-all active:scale-95"
            >
              ACCEDI ORA
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Filter Bookings
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.childName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (contacts[b.id!] && contacts[b.id!].includes(searchTerm));
    const matchesRoom = filterRoom === 'Tutte' || b.room === filterRoom;
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchesSearch && matchesRoom && matchesStatus;
  });

  const totalBookings = bookings.length;
  const pendingCount = bookings.filter(b => b.status !== 'confirmed').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 p-6 sm:p-8 rounded-[2.5rem] text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-widest text-purple-200">Area Gestionale</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Schede Compleanni & Feste</h2>
          <p className="text-purple-200 text-xs sm:text-sm mt-1">
            Visualizza tutti i dettagli, chiama i genitori e conferma le prenotazioni con la torta magica.
          </p>
        </div>

        <button
          onClick={() => setIsChangingPass(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-black transition-all backdrop-blur-md shrink-0 active:scale-95"
        >
          <KeyRound className="w-4 h-4 text-amber-300" />
          <span>Modifica Password Admin</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => setFilterStatus('all')}
          className={cn(
            "p-5 rounded-3xl border transition-all cursor-pointer shadow-sm",
            filterStatus === 'all' ? "bg-purple-50 border-purple-300 ring-2 ring-purple-400" : "bg-white border-gray-100 hover:border-purple-200"
          )}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Totale Feste</span>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mt-2">{totalBookings}</h3>
        </div>

        <div 
          onClick={() => setFilterStatus('pending')}
          className={cn(
            "p-5 rounded-3xl border transition-all cursor-pointer shadow-sm",
            filterStatus === 'pending' ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400" : "bg-white border-gray-100 hover:border-amber-200"
          )}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wider text-amber-700">In Attesa di Conferma</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-3xl font-black text-amber-600 mt-2">{pendingCount}</h3>
        </div>

        <div 
          onClick={() => setFilterStatus('confirmed')}
          className={cn(
            "p-5 rounded-3xl border transition-all cursor-pointer shadow-sm",
            filterStatus === 'confirmed' ? "bg-green-50 border-green-300 ring-2 ring-green-400" : "bg-white border-gray-100 hover:border-green-200"
          )}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wider text-green-700">Confermate 🎂</span>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-3xl font-black text-green-600 mt-2">{confirmedCount}</h3>
        </div>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cerca per nome bambino o numero di telefono..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:bg-white focus:border-purple-500 rounded-2xl outline-none transition-all font-bold text-sm text-gray-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Room Filter */}
          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <Filter className="text-gray-400 w-4 h-4" />
            <select
              value={filterRoom}
              onChange={e => setFilterRoom(e.target.value)}
              className="w-full sm:w-44 py-3 px-3 bg-gray-50 border border-gray-100 focus:bg-white focus:border-purple-500 rounded-2xl outline-none font-bold text-xs text-gray-700"
            >
              <option value="Tutte">Tutte le Sale</option>
              {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black transition-all",
                filterStatus === 'all' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Tutte
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black transition-all",
                filterStatus === 'pending' ? "bg-amber-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
              )}
            >
              In Attesa
            </button>
            <button
              onClick={() => setFilterStatus('confirmed')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black transition-all",
                filterStatus === 'confirmed' ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Confermate 🎂
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            Elenco Schede Prenotazioni
            <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-black">
              {filteredBookings.length}
            </span>
          </h3>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredBookings.map(booking => {
              const isConfirmed = booking.status === 'confirmed';
              const parentPhone = contacts[booking.id!] || '';

              return (
                <motion.div
                  layout
                  key={booking.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "rounded-[2rem] p-6 shadow-sm border transition-all relative overflow-hidden",
                    isConfirmed 
                      ? "bg-gradient-to-br from-white via-amber-50/20 to-green-50/30 border-amber-200/80 shadow-amber-500/5 ring-1 ring-amber-300/40" 
                      : "bg-white border-gray-100 hover:border-purple-200"
                  )}
                >
                  {/* Confirmed Glow Banner */}
                  {isConfirmed && (
                    <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500" />
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Main Info */}
                    <div className="flex gap-4">
                      {/* Room / Avatar Icon */}
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-inner font-black",
                        ROOM_COLORS[booking.room]
                      )}>
                        <Baby className="w-7 h-7 mb-0.5" />
                        <span className="text-[9px] uppercase tracking-tighter text-center leading-none px-1">
                          {booking.room.replace('SALA ', '')}
                        </span>
                      </div>

                      <div>
                        {/* Child Name & Age */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-gray-900 text-xl tracking-tight uppercase">
                            {booking.childName}
                          </h4>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-black rounded-lg">
                            {booking.childAge} ANNI
                          </span>
                        </div>

                        {/* Date & Slot */}
                        <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm font-bold mt-1">
                          <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                          <span>{format(new Date(booking.date), 'EEEE d MMMM yyyy', { locale: it })}</span>
                          <span className="text-gray-300">•</span>
                          <span className="font-black text-purple-700">{SLOT_LABELS[booking.slot]}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="self-start">
                      {isConfirmed ? (
                        <BirthdayCakeSymbol size="md" animated={true} />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-black border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          IN ATTESA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact & Notes Details */}
                  <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Parent Phone */}
                    <div className="flex items-center justify-between p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="truncate">
                          <span className="text-[10px] font-black uppercase text-indigo-400 block leading-none">Genitore</span>
                          <span className="text-sm font-black text-indigo-900 truncate">
                            {parentPhone || 'Nessun recapito'}
                          </span>
                        </div>
                      </div>

                      {parentPhone && (
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <a
                            href={`tel:${parentPhone}`}
                            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
                            title="Chiama genitore"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/${parentPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                            title="Messaggio WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Notes / Special Requests */}
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-center">
                      <span className="text-[10px] font-black uppercase text-gray-400 block leading-none mb-0.5">Note Festa</span>
                      <p className="text-xs font-bold text-gray-700 line-clamp-2">
                        {booking.notes ? `"${booking.notes}"` : <span className="text-gray-400 italic">Nessuna nota specificata</span>}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 flex items-center justify-between gap-3">
                    {/* Confirm / Toggle Button */}
                    <button
                      onClick={() => handleToggleStatus(booking)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md",
                        isConfirmed 
                          ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                          : "bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-500 hover:to-pink-600 text-white shadow-orange-500/25"
                      )}
                    >
                      {isConfirmed ? (
                        <>
                          <Clock className="w-4 h-4 text-amber-700" />
                          <span>Ripristina "In Attesa"</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-yellow-200" />
                          <span>CONFERMA PRENOTAZIONE (Torta 🎂🕯️)</span>
                        </>
                      )}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(booking.id!, booking.childName)}
                      className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                      title="Elimina prenotazione"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        
        {filteredBookings.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-bold">Nessuna prenotazione trovata con i filtri correnti.</p>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangingPass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChangingPass(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative z-10 border border-gray-100"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Modifica Password</h3>
                <p className="text-gray-500 text-xs mt-1">Imposta una nuova password personale per accedere come amministratore.</p>
              </div>

              {passChangeSuccess ? (
                <div className="text-center py-6 space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto animate-bounce" />
                  <p className="text-green-700 font-black text-lg">Password aggiornata con successo!</p>
                </div>
              ) : (
                <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase mb-1">Nuova Password</label>
                    <input
                      type="password"
                      required
                      value={newPassInput}
                      onChange={e => setNewPassInput(e.target.value)}
                      placeholder="Minimo 4 caratteri..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-purple-600 rounded-2xl outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase mb-1">Conferma Nuova Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassInput}
                      onChange={e => setConfirmPassInput(e.target.value)}
                      placeholder="Ripeti la nuova password..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-purple-600 rounded-2xl outline-none font-bold"
                    />
                  </div>

                  {passChangeError && (
                    <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{passChangeError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsChangingPass(false)}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black text-xs"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs shadow-md shadow-purple-600/30"
                    >
                      Salva Password
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
