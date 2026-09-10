import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { signInWithGoogle, logout } from '../lib/firebase';
import { Wand2, LogIn, LogOut, LayoutDashboard, Calendar as CalendarIcon, Shield, ShieldCheck } from 'lucide-react';
import { AdminAuthModal } from './AdminAuthModal';

interface NavbarProps {
  onViewChange: (view: 'calendar' | 'admin') => void;
  currentView: 'calendar' | 'admin';
}

export const Navbar: React.FC<NavbarProps> = ({ onViewChange, currentView }) => {
  const { user, isAdmin, logoutAdmin, isAdminModalOpen, openAdminLoginModal, closeAdminLoginModal } = useAuth();

  const handleAdminButtonClick = () => {
    if (isAdmin) {
      onViewChange(currentView === 'calendar' ? 'admin' : 'calendar');
    } else {
      openAdminLoginModal();
    }
  };

  const handleAuthSuccess = () => {
    onViewChange('admin');
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div 
              className="flex items-center gap-2 cursor-pointer group" 
              onClick={() => onViewChange('calendar')}
            >
              <div className="p-2 bg-purple-600 rounded-xl text-white group-hover:scale-105 transition-transform shadow-md shadow-purple-600/20">
                <Wand2 className="w-5 h-5" />
              </div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 font-serif">
                ABRACADABRA
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Amministratore Button */}
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAdminButtonClick}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-800 font-black text-xs sm:text-sm hover:bg-purple-200 transition-all shadow-sm"
                  >
                    {currentView === 'calendar' ? (
                      <><LayoutDashboard className="w-4 h-4 text-purple-700" /> <span className="hidden sm:inline">Pannello</span> Amministratore</>
                    ) : (
                      <><CalendarIcon className="w-4 h-4 text-purple-700" /> Vai al Calendario</>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      logoutAdmin();
                      if (user) logout();
                      onViewChange('calendar');
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                    title="Esci da Amministratore"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={openAdminLoginModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white font-black text-xs sm:text-sm hover:bg-purple-700 transition-all shadow-sm active:scale-95"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Amministratore</span>
                </button>
              )}

              {/* Optional User Avatar if logged with Google */}
              {user && (
                <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" className="w-7 h-7 rounded-full border border-purple-200" />
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Admin Auth Modal */}
      <AdminAuthModal
        isOpen={isAdminModalOpen}
        onClose={closeAdminLoginModal}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};
