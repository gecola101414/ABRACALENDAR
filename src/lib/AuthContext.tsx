import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isAdminAuthenticated: boolean;
  isInitialPasswordDefault: boolean;
  verifyAdminPassword: (pass: string) => { success: boolean; isDefault: boolean; message?: string };
  setNewAdminPassword: (newPass: string) => Promise<boolean>;
  logoutAdmin: () => void;
  openAdminLoginModal: () => void;
  closeAdminLoginModal: () => void;
  isAdminModalOpen: boolean;
  isAnonymous: boolean;
  ownerId: string;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false, 
  isAdminAuthenticated: false,
  isInitialPasswordDefault: true,
  verifyAdminPassword: () => ({ success: false, isDefault: true }),
  setNewAdminPassword: async () => false,
  logoutAdmin: () => {},
  openAdminLoginModal: () => {},
  closeAdminLoginModal: () => {},
  isAdminModalOpen: false,
  isAnonymous: false,
  ownerId: ''
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string>('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [storedAdminPassword, setStoredAdminPassword] = useState<string>('123456');
  const [isInitialPasswordDefault, setIsInitialPasswordDefault] = useState<boolean>(true);

  const ADMIN_EMAIL = 'gecolakey@gmail.com';
  const DEFAULT_INITIAL_PASS = '123456';

  // Load admin password from Firestore or localStorage
  const loadAdminPassword = async () => {
    try {
      // 1. Try LocalStorage
      const localPass = localStorage.getItem('abracadabra_admin_pass');
      const localIsDefault = localStorage.getItem('abracadabra_admin_is_default');
      
      // 2. Try Firestore
      const docRef = doc(db, 'settings', 'admin');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().password) {
        const cloudPass = docSnap.data().password;
        const cloudIsDefault = docSnap.data().isDefault ?? (cloudPass === DEFAULT_INITIAL_PASS);
        setStoredAdminPassword(cloudPass);
        setIsInitialPasswordDefault(cloudIsDefault);
        localStorage.setItem('abracadabra_admin_pass', cloudPass);
        localStorage.setItem('abracadabra_admin_is_default', String(cloudIsDefault));
      } else if (localPass) {
        setStoredAdminPassword(localPass);
        setIsInitialPasswordDefault(localIsDefault === 'true' || localPass === DEFAULT_INITIAL_PASS);
      } else {
        setStoredAdminPassword(DEFAULT_INITIAL_PASS);
        setIsInitialPasswordDefault(true);
      }
    } catch (e) {
      const localPass = localStorage.getItem('abracadabra_admin_pass') || DEFAULT_INITIAL_PASS;
      setStoredAdminPassword(localPass);
      setIsInitialPasswordDefault(localPass === DEFAULT_INITIAL_PASS);
    }
  };

  useEffect(() => {
    // Check if previously authenticated in this session
    const isAuth = sessionStorage.getItem('admin_authenticated') === 'true';
    setIsAdminAuthenticated(isAuth);
    
    // Load persisted password
    loadAdminPassword();

    // Generate or retrieve persistent browser device ID
    let deviceId = localStorage.getItem('abracadabra_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('abracadabra_device_id', deviceId);
    }
    setOwnerId(deviceId);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        try {
          const cred = await signInAnonymously(auth);
          if (cred.user) {
            setOwnerId(cred.user.uid);
            setUser(cred.user);
          }
        } catch (error: any) {
          if (error.code !== 'auth/admin-restricted-operation') {
            console.warn("Firebase Auth Note:", error.message);
          }
        } finally {
          setLoading(false);
        }
      } else {
        setUser(currentUser);
        setOwnerId(currentUser.uid);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const verifyAdminPassword = (inputPass: string) => {
    const trimmed = inputPass.trim();
    
    // Check if matches stored password OR initial default
    if (trimmed === storedAdminPassword || (isInitialPasswordDefault && trimmed === DEFAULT_INITIAL_PASS)) {
      const isDefault = storedAdminPassword === DEFAULT_INITIAL_PASS || isInitialPasswordDefault;
      if (!isDefault) {
        // Log in directly
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('admin_authenticated', 'true');
      }
      return { success: true, isDefault };
    }
    
    return { success: false, isDefault: isInitialPasswordDefault, message: 'Password non corretta. Riprova.' };
  };

  const setNewAdminPassword = async (newPass: string): Promise<boolean> => {
    const trimmed = newPass.trim();
    if (!trimmed || trimmed.length < 4) return false;

    try {
      setStoredAdminPassword(trimmed);
      setIsInitialPasswordDefault(false);
      localStorage.setItem('abracadabra_admin_pass', trimmed);
      localStorage.setItem('abracadabra_admin_is_default', 'false');
      
      // Save to Firestore as well for cross-device sync
      try {
        await setDoc(doc(db, 'settings', 'admin'), {
          password: trimmed,
          isDefault: false,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore password save note (using local):', err);
      }

      setIsAdminAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      return true;
    } catch (e) {
      console.error('Error saving new password:', e);
      return false;
    }
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
  };

  const openAdminLoginModal = () => setIsAdminModalOpen(true);
  const closeAdminLoginModal = () => setIsAdminModalOpen(false);

  // User is considered admin if they verified via password OR logged in via admin Google email
  const isGoogleAdmin = user?.email === ADMIN_EMAIL;
  const isAdmin = isAdminAuthenticated || isGoogleAdmin;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      isAdminAuthenticated: isAdmin,
      isInitialPasswordDefault,
      verifyAdminPassword,
      setNewAdminPassword,
      logoutAdmin,
      openAdminLoginModal,
      closeAdminLoginModal,
      isAdminModalOpen,
      isAnonymous: user?.isAnonymous ?? false, 
      ownerId 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

