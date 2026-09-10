import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { signInWithGoogle, logout } from '../lib/firebase';
import { Wand2, LogIn, LogOut, LayoutDashboard, Calendar as CalendarIcon } from 'lucide-react';

interface NavbarProps {
  onViewChange: (view: 'calendar' | 'admin') => void;
  currentView: 'calendar' | 'admin';
}

export const Navbar: React.FC<NavbarProps> = ({ onViewChange, currentView }) => {
  const { user, isAdmin } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onViewChange('calendar')}>
            <div className="p-2 bg-purple-600 rounded-lg text-white">
              <Wand2 className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tight text-gray-900 font-serif">
              ABRACADABRA
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <button
                onClick={() => onViewChange(currentView === 'calendar' ? 'admin' : 'calendar')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-colors"
              >
                {currentView === 'calendar' ? (
                  <><LayoutDashboard className="w-4 h-4" /> Dashboard</>
                ) : (
                  <><CalendarIcon className="w-4 h-4" /> Calendario</>
                )}
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ''} alt="avatar" className="w-8 h-8 rounded-full border" />
                <button
                  onClick={logout}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="Esci"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white font-medium hover:bg-gray-800 transition-shadow shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                Admin
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
