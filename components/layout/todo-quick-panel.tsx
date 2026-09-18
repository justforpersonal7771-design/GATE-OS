"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ListTodo, Plus, Trash2, X } from "lucide-react";
import { useTodoStore } from "@/store/use-todo-store";
import { TodoItem } from "@/types/todo.types";

const PRIORITY_COLORS: Record<TodoItem["priority"], string> = {
  Low: "bg-blue-500",
  Medium: "bg-amber-500",
  High: "bg-rose-500",
};

export function TodoQuickPanel() {
  const { items, loadItems, addItem, toggleItem, deleteItem } = useTodoStore();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const pending = items.filter((i) => !i.completed);
  const completed = items.filter((i) => i.completed);

  const handleAdd = () => {
    if (!text.trim()) return;
    addItem(text);
    setText("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-[320px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden z-50"
    >
      <div className="relative overflow-hidden p-4 flex items-center justify-between bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-white" />
          <span className="font-extrabold text-xs uppercase tracking-widest text-white">To-Do List</span>
        </div>
        <span className="relative text-[10px] font-black text-white/90 uppercase tracking-wider font-mono">
          {pending.length} pending
        </span>
      </div>

      <div className="p-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Quick task, no due date..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleAdd}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
        {items.length === 0 ? (
          <div className="p-6 text-center text-[11px] font-semibold text-[var(--text-muted)]">
            Nothing on your list yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            <AnimatePresence initial={false}>
              {[...pending, ...completed].map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 flex items-center gap-2.5 hover:bg-[var(--surface-secondary)]/50 transition-colors group"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className={`w-4 h-4 rounded-full border shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                      item.completed ? "bg-emerald-500 border-emerald-500" : "border-[var(--border)] hover:border-emerald-500"
                    }`}
                  >
                    {item.completed && <span className="text-white text-[9px] leading-none">✓</span>}
                  </button>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLORS[item.priority]}`} title={`${item.priority} priority`} />
                  <span
                    className={`flex-1 text-xs font-semibold truncate ${
                      item.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-rose-500 transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
