import React, { createContext, useContext, useRef } from 'react';
import Realm from 'realm';
import {
  Group, Member, Expense, Payment, ActivityLog, ExpenseSplit,
} from '../models/schemas/schemas';

const RealmContext = createContext<Realm | null>(null);

const realmConfig: Realm.Configuration = {
  schema: [Group, Member, Expense, Payment, ActivityLog, ExpenseSplit],
  schemaVersion: 5,
};

export const RealmProvider = ({ children }: { children: React.ReactNode }) => {
  const realmRef = useRef<Realm | null>(null);
  if (!realmRef.current || realmRef.current.isClosed) {
    realmRef.current = new Realm(realmConfig);
  }
  return <RealmContext.Provider value={realmRef.current}>{children}</RealmContext.Provider>;
};

export const useRealm = (): Realm => {
  const realm = useContext(RealmContext);
  if (!realm) throw new Error('useRealm must be used inside RealmProvider');
  return realm;
};
