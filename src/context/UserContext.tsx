import React, { createContext, useContext, useState } from 'react';
import { getUserName, setUserName as saveUserName } from '../utils/userStorage';

type UserContextType = {
  userName: string;
  setUserName: (name: string) => void;
};

const UserContext = createContext<UserContextType>({
  userName: '',
  setUserName: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userName, setName] = useState(() => getUserName());

  const setUserName = (name: string) => {
    saveUserName(name);
    setName(name.trim());
  };

  return (
    <UserContext.Provider value={{ userName, setUserName }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
