"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type DemoSessionContextValue = {
  name: string;
  setName: (value: string) => void;
};

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null);

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [name, setNameState] = useState("Demo team");

  useEffect(() => {
    const stored = window.localStorage.getItem("roadmap-studio-session-name");
    if (stored) {
      setNameState(stored);
    }
  }, []);

  const value = useMemo(
    () => ({
      name,
      setName: (nextName: string) => {
        const trimmed = nextName.trim() || "Demo team";
        window.localStorage.setItem("roadmap-studio-session-name", trimmed);
        setNameState(trimmed);
      },
    }),
    [name]
  );

  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>;
}

export function useDemoSession() {
  const context = useContext(DemoSessionContext);
  if (!context) {
    throw new Error("useDemoSession must be used within DemoSessionProvider");
  }
  return context;
}
