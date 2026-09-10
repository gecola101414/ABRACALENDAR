import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

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

const ADMIN_EMAIL = 'gecolakey@gmail.com';
const DEFAULT_INITIAL_PASS = '123456';

// Safe storage helpers (prevent crashes in strict iframes or private modes)
const safeStorage = {
  getItem: (storage: Storage, key: string): string | null => {
    try {
      return storage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (storage: Storage, key: string, value: string): void => {
    try {
      storage.setItem(key, value);
    } catch (e) {
      // Ignore private mode quota/security errors
    }
  },
  removeItem: (storage: Storage, key: string): void => {
    try {
      storage.removeItem(key);
    } catch (e) {
      // Ignore
    }
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState<string>('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [storedAdminPassword, setStoredAdminPassword] = useState<string>(() => {
    return safeStorage.getItem(localStorage, 'abracadabra_admin_pass') || DEFAULT_INITIAL_PASS;
  });
  const [isInitialPasswordDefault, setIsInitialPasswordDefault] = useState<boolean>(() => {
    const local = safeStorage.getItem(localStorage, 'abracadabra_admin_is_default');
    return local ? local === 'true' : true;
  });

  // Real-time Firestore sync of admin password
  useEffect(() => {
    // Check if previously authenticated in this session or local storage
    const sessionAuth = safeStorage.getItem(sessionStorage, 'admin_authenticated') === 'true';
    const localAuth = safeStorage.getItem(localStorage, 'admin_authenticated') === 'true';
    if (sessionAuth || localAuth) {
      setIsAdminAuthenticated(true);
    }

    // Generate or retrieve persistent browser device ID
    let deviceId = safeStorage.getItem(localStorage, 'abracadabra_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      safeStorage.setItem(localStorage, 'abracadabra_device_id', deviceId);
    }
    setOwnerId(deviceId);

    // Subscribe to admin settings in Firestore in real-time
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'admin'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.password) {
          const cloudPass = String(data.password).trim();
          const cloudIsDefault = data.isDefault ?? (cloudPass === DEFAULT_INITIAL_PASS);
          setStoredAdminPassword(cloudPass);
          setIsInitialPasswordDefault(cloudIsDefault);
          safeStorage.setItem(localStorage, 'abracadabra_admin_pass', cloudPass);
          safeStorage.setItem(localStorage, 'abracadabra_admin_is_default', String(cloudIsDefault));
        }
      }
    }, (error) => {
      console.warn("Real-time settings listener notice:", error);
    });

    // Auth state observer
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
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

    return () => {
      unsubscribeSettings();
      unsubscribeAuth();
    };
  }, []);

  const verifyAdminPassword = useCallback((inputPass: string) => {
    const trimmed = inputPass.trim();
    if (!trimmed) {
      return { success: false, isDefault: isInitialPasswordDefault, message: 'Inserisci una password.' };
    }
    
    // 1. Matches customized stored password
    if (trimmed === storedAdminPassword && storedAdminPassword !== DEFAULT_INITIAL_PASS) {
      setIsAdminAuthenticated(true);
      safeStorage.setItem(sessionStorage, 'admin_authenticated', 'true');
      safeStorage.setItem(localStorage, 'admin_authenticated', 'true');
      return { success: true, isDefault: false };
    }

    // 2. Matches default initial password (123456)
    if (trimmed === DEFAULT_INITIAL_PASS) {
      if (isInitialPasswordDefault || storedAdminPassword === DEFAULT_INITIAL_PASS) {
        // Needs setting custom personal password
        return { success: true, isDefault: true };
      } else {
        // Fallback: allow 123456 as super-admin reset or direct login
        setIsAdminAuthenticated(true);
        safeStorage.setItem(sessionStorage, 'admin_authenticated', 'true');
        safeStorage.setItem(localStorage, 'admin_authenticated', 'true');
        return { success: true, isDefault: false };
      }
    }
    
    return { 
      success: false, 
      isDefault: isInitialPasswordDefault, 
      message: 'Password non corretta. Riprova con la tua password personale o con 123456.' 
    };
  }, [storedAdminPassword, isInitialPasswordDefault]);

  const setNewAdminPassword = useCallback(async (newPass: string): Promise<boolean> => {
    const trimmed = newPass.trim();
    if (!trimmed || trimmed.length < 4) return false;

    try {
      setStoredAdminPassword(trimmed);
      setIsInitialPasswordDefault(false);
      safeStorage.setItem(localStorage, 'abracadabra_admin_pass', trimmed);
      safeStorage.setItem(localStorage, 'abracadabra_admin_is_default', 'false');
      
      // Save to Firestore for all computers/devices sync
      try {
        await setDoc(doc(db, 'settings', 'admin'), {
          password: trimmed,
          isDefault: false,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore password save note:', err);
      }

      setIsAdminAuthenticated(true);
      safeStorage.setItem(sessionStorage, 'admin_authenticated', 'true');
      safeStorage.setItem(localStorage, 'admin_authenticated', 'true');
      return true;
    } catch (e) {
      console.error('Error saving new password:', e);
      return false;
    }
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdminAuthenticated(false);
    safeStorage.removeItem(sessionStorage, 'admin_authenticated');
    safeStorage.removeItem(localStorage, 'admin_authenticated');
  }, []);

  const openAdminLoginModal = useCallback(() => setIsAdminModalOpen(true), []);
  const closeAdminLoginModal = useCallback(() => setIsAdminModalOpen(false), []);

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
