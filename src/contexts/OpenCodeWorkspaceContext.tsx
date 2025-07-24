"use client";

import { createContext, useContext, ReactNode } from "react";
import { useOpenCodeSession, UseOpenCodeSessionReturn } from "@/hooks/useOpenCodeWorkspace";

const OpenCodeSessionContext = createContext<UseOpenCodeSessionReturn | null>(null);

interface OpenCodeSessionProviderProps {
  children: ReactNode;
}

export function OpenCodeSessionProvider({ children }: OpenCodeSessionProviderProps) {
  const sessionState = useOpenCodeSession();
  
  return (
    <OpenCodeSessionContext.Provider value={sessionState}>
      {children}
    </OpenCodeSessionContext.Provider>
  );
}

export function useOpenCodeSessionContext(): UseOpenCodeSessionReturn {
  const context = useContext(OpenCodeSessionContext);
  if (!context) {
    throw new Error("useOpenCodeSessionContext must be used within an OpenCodeSessionProvider");
  }
  return context;
}