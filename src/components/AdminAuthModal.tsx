import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, KeyRound, ShieldCheck, X, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { verifyAdminPassword, setNewAdminPassword, isInitialPasswordDefault } = useAuth();
  
  // Step: 'enter_password' | 'set_new_password' | 'success'
  const [step, setStep] = useState<'enter_password' | 'set_new_password' | 'success'>('enter_password');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setStep('enter_password');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password.trim()) {
      setError('Inserisci la password per continuare.');
      return;
    }

    const result = verifyAdminPassword(password);
    if (result.success) {
      if (result.isDefault) {
        // First login using 123456: prompt to choose personal password
        setStep('set_new_password');
      } else {
        // Logged in with personalized password
        setStep('success');
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 800);
      }
    } else {
      setError(result.message || 'Password errata. Riprova.');
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 4) {
      setError('La nuova password deve contenere almeno 4 caratteri.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Le due password non coincidono. Controlla e riprova.');
      return;
    }

    if (newPassword === '123456') {
      setError('Scegli una password personale diversa da quella iniziale (123456).');
      return;
    }

    setIsSubmitting(true);
    const success = await setNewAdminPassword(newPassword);
    setIsSubmitting(false);

    if (success) {
      setStep('success');
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1000);
    } else {
      setError('Errore nel salvataggio della password. Riprova.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 p-6 sm:p-8 border border-gray-100"
      >
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {step === 'enter_password' && (
            <motion.div
              key="step-enter"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Accesso Amministratore</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Inserisci la password per gestire le schede dei compleanni e confermare le prenotazioni.
                </p>
                {isInitialPasswordDefault && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Password iniziale predefinita: <strong className="font-mono font-black">123456</strong></span>
                  </div>
                )}
              </div>

              <form onSubmit={handleVerifyPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5 ml-1">
                    Password Amministratore
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      autoFocus
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 focus:border-purple-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-900 text-center text-lg tracking-widest"
                    />
                  </div>
                  {error && (
                    <div className="flex items-center gap-1.5 mt-2 text-red-600 text-xs font-bold px-1">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-base shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span>Verifica & Continua</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          )}

          {step === 'set_new_password' && (
            <motion.div
              key="step-set-new"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Imposta Nuova Password</h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  Hai effettuato il primo accesso con la password iniziale (<strong>123456</strong>). Imposta ora la tua nuova password personale per proteggere l'area amministratore.
                </p>
              </div>

              <form onSubmit={handleSaveNewPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1 ml-1">
                    Nuova Password Personale
                  </label>
                  <input
                    type="password"
                    autoFocus
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nuova password..."
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 focus:border-amber-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1 ml-1">
                    Conferma Nuova Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ripeti la password..."
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 focus:border-amber-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-900"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold px-1">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white rounded-2xl font-black text-base shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5 text-yellow-200" />
                  <span>{isSubmitting ? 'Salvataggio...' : 'Salva Password & Accedi'}</span>
                </button>
              </form>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-4"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-gray-900">Accesso Eseguito!</h3>
              <p className="text-gray-500 text-sm font-medium">
                Benvenuto nell'Area Amministratore di Abracadabra.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
