import { create } from "zustand";
import { IDBManager } from "@/lib/repository/storage/idb-manager";
import { TodoItem } from "@/types/todo.types";

interface TodoState {
  items: TodoItem[];
  loading: boolean;
  loaded: boolean;
  loadItems: () => Promise<void>;
  addItem: (text: string, priority?: TodoItem["priority"]) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  items: [],
  loading: false,
  loaded: false,

  loadItems: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const items = await IDBManager.getTodoItems();
      set({ items, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (text, priority = "Medium") => {
    if (!text.trim()) return;
    const item: TodoItem = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      priority,
      createdAt: new Date().toISOString(),
    };
    const updated = [item, ...get().items];
    set({ items: updated });
    await IDBManager.saveTodoItems(updated);
  },

  toggleItem: async (id) => {
    const updated = get().items.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i));
    set({ items: updated });
    await IDBManager.saveTodoItems(updated);
  },

  deleteItem: async (id) => {
    const updated = get().items.filter((i) => i.id !== id);
    set({ items: updated });
    await IDBManager.saveTodoItems(updated);
  },
}));
