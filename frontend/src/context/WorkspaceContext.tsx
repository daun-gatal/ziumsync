import { createContext, useContext, useState, type ReactNode } from 'react';

interface WorkspaceContextType {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  selectedId: null,
  setSelectedId: () => undefined,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <WorkspaceContext.Provider value={{ selectedId, setSelectedId }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}
