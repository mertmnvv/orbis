'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type LayoutContextType = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <LayoutContext.Provider value={{ isSidebarOpen, toggleSidebar: () => setIsSidebarOpen((p) => !p) }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext must be used within a LayoutProvider');
  }
  return context;
}
