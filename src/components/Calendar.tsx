import React, { useState, useEffect } from 'react';
import { 
  format, 
  addWeeks, 
  subWeeks, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday,
  addDays
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, PartyPopper, Calendar as CalendarIcon, Info, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { ROOMS, SLOTS, Booking, getItalianHoliday, ROOM_COLORS, Room, Slot, SLOT_LABELS } from '../types';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';

interface CalendarProps {
  onSlotDoubleClick: (date: Date, room: Room, slot: Slot) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ onSlotDoubleClick }) => {
  const { user, ownerId } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'bookings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
    });
    return unsubscribe;
  }, []);

  const weekStart = startOfWeek(currentDate, { locale: it });
  const weekEnd = endOfWeek(weekStart, { locale: it });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
      {/* Header - Compact */}
      <div className="p-4 bg-white border-b flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 capitalize leading-tight">
              Settimana {format(weekStart, 'd MMMM', { locale: it })} - {format(weekEnd, 'd MMMM yyyy', { locale: it })}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Doppio clic per prenotare</span>
            </div>
          </div>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl gap-1 scale-90 md:scale-100">
          <button onClick={prevWeek} className="p-1.5 hover:bg-white rounded-lg transition-all hover:shadow-sm">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-xs font-bold text-gray-600 hover:bg-white rounded-lg transition-all hover:shadow-sm"
          >
            Oggi
          </button>
          <button onClick={nextWeek} className="p-1.5 hover:bg-white rounded-lg transition-all hover:shadow-sm">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full border-collapse min-w-[900px] table-fixed">
          <thead>
            <tr>
              <th className="p-3 bg-gray-50 border-r border-b text-left w-48 shrink-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sala / Giorno</span>
              </th>
              {days.map(day => {
                const holiday = getItalianHoliday(day);
                return (
                  <th 
                    key={day.toString()} 
                    className={cn(
                      "p-2 border-b text-center",
                      isToday(day) ? "bg-amber-50/50" : "bg-white",
                      holiday ? "text-red-500" : "text-gray-900"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold uppercase tracking-tight opacity-50">
                        {format(day, 'EEEE', { locale: it })}
                      </span>
                      <span className={cn(
                        "text-xl font-black",
                        isToday(day) && "text-amber-600"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {holiday && (
                        <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5 bg-red-100 px-1.5 py-0.5 rounded-full">
                          {holiday}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ROOMS.map(room => (
              <tr key={room} className="group">
                <td className={cn(
                  "p-3 border-r border-b font-black text-xs tracking-tight",
                  ROOM_COLORS[room],
                  "bg-opacity-10 border-opacity-20"
                )}>
                  {room.replace('SALA ', '')}
                </td>
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayBookings = bookings.filter(b => b.date === dateStr && b.room === room);
                  
                  return (
                    <td key={dateStr} className={cn(
                      "p-1 border-r border-b align-top transition-colors",
                      isToday(day) ? "bg-amber-50/10" : "bg-white group-hover:bg-gray-50/30"
                    )}>
                      <div className="flex flex-col gap-1">
                        {SLOTS.map(slot => {
                          const booking = dayBookings.find(b => b.slot === slot);
                          const isOwner = booking?.ownerUid === ownerId;
                          
                          return (
                            <motion.div
                              key={slot}
                              whileHover={{ scale: booking ? 1 : 1.02 }}
                              onDoubleClick={() => !booking && onSlotDoubleClick(day, room, slot)}
                              className={cn(
                                "py-1.5 px-2 rounded-lg border transition-all select-none cursor-pointer text-center",
                                booking 
                                  ? isOwner
                                    ? "bg-amber-100 border-amber-400 shadow-sm z-10 relative"
                                    : "bg-gray-100 border-gray-200 opacity-60 cursor-default" 
                                  : "bg-white border-dashed border-gray-200 hover:border-purple-400 hover:shadow-sm hover:z-10 relative group/slot"
                              )}
                            >
                              <div className="flex flex-col items-center justify-center min-h-[32px]">
                                <span className={cn(
                                  "text-[8px] font-bold uppercase tracking-tighter",
                                  booking ? isOwner ? "text-amber-800" : "text-gray-400" : "text-gray-400 group-hover/slot:text-purple-500"
                                )}>
                                  {SLOT_LABELS[slot].charAt(0)}
                                </span>
                                {booking ? (
                                  <div className="flex items-center justify-center gap-0.5 w-full">
                                    {booking.status === 'confirmed' && (
                                      <span className="text-xs shrink-0 animate-bounce" title="Festa Confermata!">🎂</span>
                                    )}
                                    <span className={cn(
                                      "text-[10px] font-black truncate px-0.5",
                                      isOwner ? "text-amber-900" : "text-gray-700"
                                    )}>
                                      {isOwner ? booking.childName : "OCCUPATA"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-black text-gray-200 group-hover/slot:text-purple-300">
                                    LIBERO
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t flex flex-wrap gap-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-white border border-dashed border-gray-300" />
          <span>Libero</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-400" />
          <span>Tua Prenotazione</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-gray-200 border border-gray-300" />
          <span>Occupata</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-amber-700 font-black">
          <span className="text-xs">🎂</span>
          <span>Festa Confermata dall'Amministratore</span>
        </div>
      </div>
    </div>
  );
};
