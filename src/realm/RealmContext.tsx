// src/database/RealmContext.ts
import Realm from 'realm';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Expense,
  ExpenseSplit,
  Group,
  Member,
} from '../models/schemas/schemas';

interface RealmContextType {
  realm: Realm | null;
}

const RealmContext = createContext<RealmContextType>({ realm: null });

export const RealmProvider = ({ children }: { children: React.ReactNode }) => {
  const [realm, setRealm] = useState<Realm | null>(null);
  console.log('RealmContext created:', RealmContext);

  useEffect(() => {
    const instance = new Realm({
      schema: [Group, Expense, Member, ExpenseSplit],
      schemaVersion: 1,
    });
    setRealm(instance);

    return () => {
      if (!instance.isClosed) {
        instance.close(); // closes ONCE when app unmounts
      }
    };
  }, []);

  return (
    <RealmContext.Provider value={{ realm }}>
      {realm !== null ? children : null}
    </RealmContext.Provider>
  );
};

export const useRealm = (): Realm => {
  const { realm } = useContext(RealmContext);
  if (realm === null || realm === undefined) {
    throw new Error('useRealm must be used inside RealmProvider');
  }
  return realm;
};
