'use client';
import { createContext, useContext } from 'react';
type Value = { clinicId: string; branchId: string | null; branchName: string };
const Context = createContext<Value | null>(null);
export function AppBranchProvider({ value, children }: { value: Value; children: React.ReactNode }) { return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useAppBranch() { const value = useContext(Context); if (!value) throw new Error('App branch context is unavailable'); return value; }
