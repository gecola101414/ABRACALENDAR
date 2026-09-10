import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Booking, ChatMessage } from '../types';
import { useAuth } from '../lib/AuthContext';
import { Send, Sparkles, CheckCheck, Smile, MessageSquare, ShieldCheck, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface BirthdayWhatsAppChatProps {
  booking: Booking;
  parentPhone?: string;
  className?: string;
}

const QUICK_BIRTHDAY_REPLIES = [
  "👋 Ciao! Benvenuti in Abracadabra! Come possiamo rendere magica la festa?",
  "🎂 Ci sono allergie o richieste speciali per torta e buffet?",
  "⏰ Potete arrivare 20 minuti prima per accogliere gli invitati e l'allestimento!",
  "✨ La prenotazione per la sala è confermata e tutto è pronto!",
  "🎈 Servono addobbi speciali a tema o animazione?"
];

const BIRTHDAY_EMOJIS = ["🎂", "🎈", "🎁", "🪄", "🥳", "🎉", "🍰", "⭐", "🍿", "👑"];

export const BirthdayWhatsAppChat: React.FC<BirthdayWhatsAppChatProps> = ({
  booking,
  parentPhone,
  className
}) => {
  const { isAdmin, ownerId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [senderRole, setSenderRole] = useState<'admin' | 'parent'>(isAdmin ? 'admin' : 'parent');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!booking.id) return;

    const messagesRef = collection(db, 'bookings', booking.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatMessage));
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    }, (error) => {
      console.warn("Real-time chat listener note:", error);
    });

    return () => unsubscribe();
  }, [booking.id]);

  useEffect(() => {
    setSenderRole(isAdmin ? 'admin' : 'parent');
  }, [isAdmin]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !booking.id || isSending) return;

    setIsSending(true);
    try {
      const senderName = senderRole === 'admin' 
        ? 'Staff Abracadabra 🧙‍♂️' 
        : `Genitore di ${booking.childName} 🎈`;

      await addDoc(collection(db, 'bookings', booking.id, 'messages'), {
        sender: senderRole,
        senderName,
        text,
        createdAt: serverTimestamp(),
        timestamp: Date.now()
      });

      if (!textToSend) {
        setInputText('');
      }
      setShowEmojis(false);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error sending birthday message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const formatMessageTime = (msg: ChatMessage) => {
    if (!msg.createdAt) return 'Adesso';
    try {
      if (typeof msg.createdAt?.toDate === 'function') {
        return format(msg.createdAt.toDate(), 'HH:mm');
      }
      if (msg.timestamp) {
        return format(new Date(msg.timestamp), 'HH:mm');
      }
    } catch (e) {
      return '';
    }
    return '';
  };

  return (
    <div className={cn(
      "flex flex-col bg-[#efeae2] rounded-3xl overflow-hidden border-2 border-emerald-600/30 shadow-xl",
      className
    )}>
      {/* WhatsApp Style Top Header */}
      <div className="bg-[#075e54] text-white p-3.5 sm:p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-xl shadow-inner border border-emerald-400/40">
              🎂
            </div>
            <div className="w-3 h-3 bg-emerald-400 rounded-full absolute bottom-0 right-0 border-2 border-[#075e54]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="font-black text-sm sm:text-base leading-tight">
                WhatsApp Compleanno: {booking.childName}
              </h5>
            </div>
            <p className="text-[11px] text-emerald-200 font-medium leading-none mt-0.5">
              Chat diretta con {isAdmin ? 'il Cliente' : 'lo Staff Abracadabra'} ✨
            </p>
          </div>
        </div>

        {/* Sender Role Selector (if admin or demo) */}
        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setSenderRole('admin')}
            className={cn(
              "px-2 py-1 rounded-lg transition-all flex items-center gap-1",
              senderRole === 'admin' ? "bg-amber-400 text-purple-950 font-black shadow-sm" : "text-emerald-100 hover:text-white"
            )}
            title="Invia come Staff"
          >
            <ShieldCheck className="w-3 h-3" />
            <span className="hidden sm:inline">Staff</span>
          </button>
          <button
            type="button"
            onClick={() => setSenderRole('parent')}
            className={cn(
              "px-2 py-1 rounded-lg transition-all flex items-center gap-1",
              senderRole === 'parent' ? "bg-emerald-400 text-emerald-950 font-black shadow-sm" : "text-emerald-100 hover:text-white"
            )}
            title="Invia come Genitore"
          >
            <User className="w-3 h-3" />
            <span className="hidden sm:inline">Genitore</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Chat Body */}
      <div 
        className="flex-1 p-4 space-y-3 overflow-y-auto min-h-[220px] max-h-[300px] bg-repeat"
        style={{
          backgroundImage: `radial-gradient(#d1d7db 1px, transparent 1px)`,
          backgroundSize: '16px 16px'
        }}
      >
        {/* Welcome Notice Card */}
        <div className="mx-auto max-w-xs text-center p-2.5 bg-amber-50/90 rounded-2xl border border-amber-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-amber-900 leading-tight">
            🎈 Benvenuto nel Wazzap di Compleanno per <strong>{booking.childName.toUpperCase()}</strong>!
          </p>
          <p className="text-[9px] text-amber-700 mt-0.5">
            Usa questa chat per accordi veloci su orari, addobbi e dettagli festa.
          </p>
        </div>

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isFromAdmin = msg.sender === 'admin';
          const isMyMessage = (isAdmin && isFromAdmin) || (!isAdmin && !isFromAdmin);

          return (
            <motion.div
              key={msg.id || String(msg.createdAt)}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex flex-col max-w-[85%] sm:max-w-[75%]",
                isMyMessage ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-3 rounded-2xl shadow-sm text-xs font-medium relative group",
                isFromAdmin
                  ? "bg-[#e2f7cb] text-[#111b21] rounded-tr-xs border border-emerald-200"
                  : "bg-white text-[#111b21] rounded-tl-xs border border-gray-200"
              )}>
                {/* Author Label */}
                <div className="flex items-center gap-1 mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider",
                    isFromAdmin ? "text-purple-700" : "text-emerald-700"
                  )}>
                    {msg.senderName || (isFromAdmin ? 'Staff Abracadabra 🧙‍♂️' : 'Genitore 🎈')}
                  </span>
                </div>

                {/* Message Text */}
                <p className="text-sm font-semibold whitespace-pre-wrap leading-relaxed">
                  {msg.text}
                </p>

                {/* Timestamp & Double Check */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-gray-500 font-bold">
                  <span>{formatMessageTime(msg)}</span>
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                </div>
              </div>
            </motion.div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Responses Carousel */}
      <div className="bg-[#f0f2f5] px-3 py-2 border-t border-gray-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-black uppercase text-gray-400 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          Suggeriti:
        </span>
        {QUICK_BIRTHDAY_REPLIES.map((reply, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(reply)}
            className="text-[11px] font-bold bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full px-3 py-1 shrink-0 transition-all hover:scale-105 active:scale-95 shadow-xs truncate max-w-[220px]"
            title={reply}
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Emojis Selector Bar */}
      <AnimatePresence>
        {showEmojis && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white px-3 py-2 border-t border-gray-200 flex items-center gap-2 overflow-x-auto"
          >
            {BIRTHDAY_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="text-lg hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input Bar */}
      <div className="p-2 sm:p-3 bg-[#f0f2f5] border-t border-gray-200 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className={cn(
            "p-2 rounded-full transition-colors text-gray-500 hover:text-amber-600 hover:bg-gray-200",
            showEmojis && "bg-amber-100 text-amber-600"
          )}
          title="Emoji compleanno"
        >
          <Smile className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={`Scrivi un messaggio come ${senderRole === 'admin' ? 'Staff' : 'Genitore'}...`}
          className="flex-1 bg-white rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-900 outline-none border border-gray-200 focus:border-emerald-500 shadow-inner"
        />

        <button
          type="button"
          disabled={!inputText.trim() || isSending}
          onClick={() => handleSendMessage()}
          className="p-2.5 bg-[#00a884] hover:bg-[#075e54] text-white rounded-full transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:hover:bg-[#00a884]"
          title="Invia messaggio"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
