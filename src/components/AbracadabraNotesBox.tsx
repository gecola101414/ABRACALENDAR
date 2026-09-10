import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Booking } from '../types';
import { useAuth } from '../lib/AuthContext';
import { Sparkles, Save, CheckCircle2, Lock, FileText, Wand2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AbracadabraNotesBoxProps {
  booking: Booking;
  className?: string;
  onUpdate?: (newNotes: string) => void;
}

export const AbracadabraNotesBox: React.FC<AbracadabraNotesBoxProps> = ({
  booking,
  className,
  onUpdate
}) => {
  const { isAdmin } = useAuth();
  const [notes, setNotes] = useState(booking.abracadabraNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setNotes(booking.abracadabraNotes || '');
    setHasChanges(false);
  }, [booking.abracadabraNotes]);

  const handleNotesChange = (val: string) => {
    setNotes(val);
    setHasChanges(val !== (booking.abracadabraNotes || ''));
  };

  const handleSaveNotes = async () => {
    if (!booking.id || isSaving) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        abracadabraNotes: notes.trim()
      });
      setSavedSuccess(true);
      setHasChanges(false);
      onUpdate?.(notes.trim());
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (error) {
      console.error("Error saving Abracadabra notes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn(
      "bg-gradient-to-br from-amber-50 via-orange-50/50 to-purple-50 rounded-3xl p-4 sm:p-5 border-2 border-amber-300/80 shadow-md relative overflow-hidden",
      className
    )}>
      {/* Magic Parchment Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-amber-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-400 text-purple-950 rounded-xl shadow-inner font-black">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-1.5">
              <span>Note Indelebili di Abracadabra</span>
              <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
            </h5>
            <p className="text-[10px] text-amber-800 font-bold">
              Memo riservati e indelebili dello staff (acconti, allestimenti, richieste)
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs font-black text-green-700 bg-green-100 border border-green-300 px-2.5 py-1 rounded-xl flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              Salvato!
            </span>
          )}
        </div>
      </div>

      {/* Textarea for Notes */}
      <div className="relative">
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Es: Acconto 50€ ricevuto via bonifico • Torta a tema Spiderman • Orario arrivo animatore 17:00 • Allergia fragole..."
          className="w-full p-3.5 bg-white/90 focus:bg-white rounded-2xl border-2 border-amber-200 focus:border-amber-500 outline-none text-xs sm:text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal transition-all shadow-inner leading-relaxed resize-y min-h-[90px]"
        />
      </div>

      {/* Footer with Save Action */}
      <div className="flex items-center justify-between mt-3 pt-2">
        <span className="text-[10px] font-bold text-amber-800/80">
          ✨ Rimangono sempre salvate per questa festa
        </span>

        <button
          type="button"
          disabled={isSaving || (!hasChanges && !savedSuccess)}
          onClick={handleSaveNotes}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95",
            hasChanges
              ? "bg-amber-500 hover:bg-amber-600 text-purple-950 ring-2 ring-amber-300 animate-pulse"
              : "bg-amber-200/80 hover:bg-amber-300 text-amber-950 disabled:opacity-60"
          )}
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Salvataggio...' : 'Salva Note Abracadabra'}</span>
        </button>
      </div>
    </div>
  );
};
