import { create } from "zustand";

interface UiState {
  isSidebarOpen: boolean;
  activeModal: string | null;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setActiveModal: (modalId: string | null) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  activeModal: null,
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setActiveModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
}));
