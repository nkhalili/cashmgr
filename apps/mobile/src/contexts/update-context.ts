import { createContext, useContext } from 'react';

interface UpdateDevContext {
  simulateUpdate: () => void;
}

export const UpdateDevContext = createContext<UpdateDevContext | null>(null);

export function useUpdateDev() {
  return useContext(UpdateDevContext);
}
