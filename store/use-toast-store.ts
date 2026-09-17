import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 3200;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, type = "success") => {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },

  dismiss: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));
