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
  reorderItems: (draggedId: string, targetId: string) => Promise<void>;
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

  reorderItems: async (draggedId, targetId) => {
    if (draggedId === targetId) return;
    const items = [...get().items];
    const fromIdx = items.findIndex((i) => i.id === draggedId);
    const toIdx = items.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    set({ items });
    await IDBManager.saveTodoItems(items);
  },
}));
