import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserName, setUserName as saveUserName } from '../utils/userStorage';

type UserContextType = {
  userName: string;
  userLoaded: boolean;
  setUserName: (name: string) => void;
};

const UserContext = createContext<UserContextType>({
  userName: '',
  userLoaded: false,
  setUserName: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userName, setName] = useState('');
  const [userLoaded, setUserLoaded] = useState(false);
  useEffect(() => {
    try {
      const stored = getUserName();
      console.log('[UserContext] loaded from MMKV:', stored);
      setName(stored);
    } catch (e) {
      console.error('[UserContext] MMKV read failed:', e);
    }
    setUserLoaded(true);
  }, []);

  const setUserName = (name: string) => {
    try {
      saveUserName(name);
      console.log('[UserContext] saved to MMKV:', name);
    } catch (e) {
      console.error('[UserContext] MMKV write failed:', e);
    }
    setName(name.trim());
  };

  return (
    <UserContext.Provider value={{ userName, userLoaded, setUserName }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
