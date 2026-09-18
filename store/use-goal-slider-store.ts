import { create } from "zustand";
import { IDBManager } from "@/lib/repository/storage/idb-manager";

const GOAL_SLIDER_TARGET_KEY = "goal_slider_target_percent";
export const GOAL_SLIDER_DEFAULT_PERCENT = 100;

interface GoalSliderState {
  targetPercent: number;
  loaded: boolean;
  load: () => Promise<void>;
  setTargetPercent: (percent: number) => Promise<void>;
  reset: () => Promise<void>;
}

// Global, app-wide "study prioritization lens" — set once in the Topbar's Goal Slider
// panel, read from anywhere (Setup topic picker, Dashboard, AI Mentor) via this store,
// so the recommendation stays consistent across every screen instead of living only
// on one page.
export const useGoalSliderStore = create<GoalSliderState>((set, get) => ({
  targetPercent: GOAL_SLIDER_DEFAULT_PERCENT,
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    const record = await IDBManager.getMetadata(GOAL_SLIDER_TARGET_KEY);
    const targetPercent = typeof record?.value === "number" ? record.value : GOAL_SLIDER_DEFAULT_PERCENT;
    set({ targetPercent, loaded: true });
  },

  setTargetPercent: async (percent) => {
    const clamped = Math.min(100, Math.max(5, Math.round(percent)));
    set({ targetPercent: clamped });
    await IDBManager.setMetadata(GOAL_SLIDER_TARGET_KEY, clamped);
  },

  reset: async () => {
    set({ targetPercent: GOAL_SLIDER_DEFAULT_PERCENT });
    await IDBManager.setMetadata(GOAL_SLIDER_TARGET_KEY, GOAL_SLIDER_DEFAULT_PERCENT);
  },
}));
