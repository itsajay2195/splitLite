import { create } from 'zustand';

type AppState = {
  selectedGroupId: string | null;
  setSelectedGroup: (id: string | null) => void;
};

export const useAppStore = create<AppState>(set => ({
  selectedGroupId: null,
  setSelectedGroup: id => set({ selectedGroupId: id }),
}));
