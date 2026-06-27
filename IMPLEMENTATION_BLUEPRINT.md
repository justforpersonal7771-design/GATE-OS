# Implementation Blueprint: Personal GATE CSE 2027 Preparation OS

## PART 1: COMPLETE PRODUCTION FOLDER STRUCTURE

```text
/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── notes/page.tsx
│   │   ├── bookmarks/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── mistakes/page.tsx
│   │   ├── revision/page.tsx
│   ├── exam/
│   │   ├── setup/page.tsx
│   │   ├── arena/[id]/page.tsx
│   │   ├── results/[id]/page.tsx
│   ├── api/
│   │   ├── sync/route.ts
│   │   ├── ai/route.ts
│   ├── globals.css
│   ├── layout.tsx
├── components/
│   ├── ui/ (shadcn/Radix primitives)
│   ├── layout/
│   │   ├── topbar.tsx
│   │   ├── sidebar.tsx
│   ├── dashboard/
│   │   ├── stat-card.tsx
│   │   ├── countdown.tsx
│   │   ├── streak-chart.tsx
│   ├── exam/
│   │   ├── question-renderer.tsx
│   │   ├── latex-viewer.tsx
│   │   ├── option-card.tsx
│   │   ├── timer.tsx
│   │   ├── question-palette.tsx
│   │   ├── image-viewer.tsx
│   ├── calendar/
│   │   ├── event-calendar.tsx
│   │   ├── upcoming-tasks.tsx
│   ├── shared/
│   │   ├── offline-indicator.tsx
│   │   ├── empty-state.tsx
├── lib/
│   ├── repository/
│   │   ├── question-repository.ts
│   │   ├── index-builder.ts
│   ├── services/
│   │   ├── exam-service.ts
│   │   ├── sync-service.ts
│   │   ├── analytics-service.ts
│   │   ├── calendar-service.ts
│   │   ├── notes-service.ts
│   │   ├── bookmark-service.ts
│   │   ├── revision-service.ts
│   │   ├── image-resolver.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── queries.ts
│   ├── ai/
│   │   ├── tutor-engine.ts
│   │   ├── planner-engine.ts
│   ├── utils.ts
│   ├── constants.ts
├── store/
│   ├── use-exam-store.ts
│   ├── use-data-store.ts
│   ├── use-notes-store.ts
│   ├── use-bookmarks-store.ts
│   ├── use-calendar-store.ts
│   ├── use-analytics-store.ts
│   ├── use-sync-store.ts
│   ├── use-ui-store.ts
├── types/
│   ├── database.types.ts
│   ├── exam.types.ts
│   ├── question.types.ts
│   ├── analytics.types.ts
│   ├── api.types.ts
├── hooks/
│   ├── use-mobile.ts
│   ├── use-offline-sync.ts
│   ├── use-keyboard-shortcuts.ts
├── public/
│   ├── data/
│   │   ├── Aggregated_Output.json
│   ├── images/
│   │   ├── 2026-FN/
│   │   ├── 2026-AN/
│   │   ├── fallbacks/
├── supabase/
│   ├── migrations/
│   ├── schema.sql
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── metadata.json
```

---

## PART 2: FILE RESPONSIBILITIES

### `lib/repository/question-repository.ts`
*   **Purpose:** Singleton data access layer preventing direct JSON reads. Abstracts array scans via maps.
*   **Inputs:** Filters (subject, year, topic, etc.), Question IDs.
*   **Outputs:** Formatted `Question` objects, Test sets.
*   **Dependencies:** `index-builder.ts`, `Aggregated_Output.json`.

### `lib/repository/index-builder.ts`
*   **Purpose:** Run at app load once to build static maps (`Map<string, Question>`) for O(1) lookups.
*   **Inputs:** Raw JSON file list.
*   **Outputs:** Indexed maps (by ID, Subject, Year, Topic, Type, Difficulty).
*   **Dependencies:** Raw JSON loading.

### `lib/services/sync-service.ts`
*   **Purpose:** Orchestrator bridging Zustand persisted states and Supabase DB.
*   **Inputs:** Local queued mutations (from `useSyncStore`), connection status.
*   **Outputs:** Success/Failure callbacks, conflict resolutions.
*   **Dependencies:** `supabase/client.ts`, `useSyncStore`.

### `lib/services/image-resolver.ts`
*   **Purpose:** Maps `IMAGE_Q_XX_1` tokens to true URLs `/images/YYYY-SS/XX_1.png`. Handles 404s.
*   **Inputs:** String image tokens, Year, Shift.
*   **Outputs:** Absolute Image URL strings or Fallback placeholder URLs.
*   **Dependencies:** App configuration, static public folder structure.

### `lib/services/analytics-service.ts`
*   **Purpose:** Calc accuracy, streaks, weak topics. Generates radar chart payloads.
*   **Inputs:** User exam history, JSON Question metadata.
*   **Outputs:** Processed charts data (e.g., specific `Recharts` shapes), streak counts.
*   **Dependencies:** `useAnalyticsStore`, `question-repository.ts`.

### `lib/services/revision-service.ts`
*   **Purpose:** Implements Spaced Repetition sorting logic (foundational).
*   **Inputs:** Mistakes history, user performance arrays.
*   **Outputs:** Ordered lists of Question IDs for daily revision.
*   **Dependencies:** `useAnalyticsStore`, `useExamStore`.

### `lib/services/calendar-service.ts`
*   **Purpose:** Translates mock exam schedules, study goals into `FullCalendar` events.
*   **Inputs:** `useCalendarStore` user events, System generated goals.
*   **Outputs:** `EventInput[]` specifically formatted for UI.
*   **Dependencies:** `useCalendarStore`.

### `store/use-exam-store.ts`
*   **Purpose:** Client state for the active or paused test session.
*   **Inputs:** User answers (option index, NAT string), mark for review toggles.
*   **Outputs:** Computed statuses (Visited, Not Answered, Answered).
*   **Dependencies:** LocalStorage/IndexedDB persistence (Zustand persist).

---

## PART 3: ZUSTAND STORE BLUEPRINT

### `useExamStore`
*   **Responsibilities:** Live tracking of right-now answering states, timers.
*   **State Variables:** `activeSessionId`, `timeLeftMs`, `answers: Record<string, AnswerState>`, `statusMap: Record<string, 'visited'|'marked'|'answered'>`.
*   **Actions:** `startTest(config)`, `selectOption(qId, option)`, `markForReview(qId)`, `clearResponse(qId)`, `pauseTest()`, `submitTest()`.
*   **Persistence:** `sessionStorage` or local IndexedDB (for crash recovery).
*   **Location:** `/store/use-exam-store.ts`

### `useDataStore`
*   **Responsibilities:** Meta-tracking of data initialization status, offline availability.
*   **State Variables:** `isIndexesBuilt: boolean`, `totalQuestions: number`, `lastSyncTimestamp: number`.
*   **Actions:** `setIndexesReady()`, `updateSyncTime()`.
*   **Persistence:** `localStorage`.
*   **Location:** `/store/use-data-store.ts`

### `useNotesStore`
*   **Responsibilities:** Client cache of user's notes for fast type-ahead search.
*   **State Variables:** `notes: Record<string, Note>`, `searchQuery: string`.
*   **Actions:** `addNote(targetId, content)`, `updateNote(id, content)`, `deleteNote(id)`.
*   **Persistence:** Local storage, sync-bound.
*   **Location:** `/store/use-notes-store.ts`

### `useBookmarksStore`
*   **Responsibilities:** Toggles for question bookmarks, topic bookmarks.
*   **State Variables:** `bookmarkedQuestionIds: string[]`, `bookmarkedTopics: string[]`.
*   **Actions:** `toggleQuestionBookmark(qId)`, `toggleTopicBookmark(topic)`.
*   **Persistence:** Local storage, sync-bound.
*   **Location:** `/store/use-bookmarks-store.ts`

### `useCalendarStore`
*   **Responsibilities:** Local representation of the study planner.
*   **State Variables:** `events: CalendarEvent[]`, `currentView: 'day'|'week'|'month'`.
*   **Actions:** `addEvent()`, `removeEvent()`, `updateEvent()`, `generateRevisionEvents()`.
*   **Persistence:** Local storage, sync-bound.
*   **Location:** `/store/use-calendar-store.ts`

### `useAnalyticsStore`
*   **Responsibilities:** Cumulative historic data holding for dashboards.
*   **State Variables:** `examHistory: ExamSummary[]`, `streakDays: number`, `lastActiveDate: string`, `mistakesBank: Record<string, boolean>`.
*   **Actions:** `logExamResult()`, `updateStreak()`, `addToMistakesBank()`.
*   **Persistence:** Local storage, sync-bound.
*   **Location:** `/store/use-analytics-store.ts`

### `useSyncStore`
*   **Responsibilities:** Offline mutations queue.
*   **State Variables:** `isOnline: boolean`, `mutationQueue: QueuedAction[]`, `syncStatus: 'idle'|'syncing'|'error'`.
*   **Actions:** `setOnlineStatus()`, `enqueueMutation()`, `clearQueue()`.
*   **Persistence:** Local storage (vital).
*   **Location:** `/store/use-sync-store.ts`

### `useUIStore`
*   **Responsibilities:** Pure presentation toggles.
*   **State Variables:** `sidebarOpen: boolean`, `theme: 'light'|'dark'|'system'`, `activeModal: string|null`.
*   **Actions:** `toggleSidebar()`, `setTheme()`, `openModal()`, `closeModal()`.
*   **Persistence:** Local storage.
*   **Location:** `/store/use-ui-store.ts`

---

## PART 4: SERVICE LAYER BLUEPRINT

### `ExamService`
*   **Purpose:** Exam business logic. Test generation logic. Validating if responses are correct.
*   **Public Methods:** `generateMockTest()`, `evaluateTestSession()`, `calculateScore()`.
*   **Dependencies:** `question-repository.ts`, `useExamStore`.
*   **Expected Folder:** `/lib/services/exam-service.ts`

### `AnalyticsService`
*   **Purpose:** Aggregation engines for charts calculation.
*   **Public Methods:** `getSubjectAccuracies()`, `getWeeklyStudyHours()`, `identifyWeakTopics()`.
*   **Dependencies:** `useAnalyticsStore`, `question-repository.ts`.
*   **Expected Folder:** `/lib/services/analytics-service.ts`

### `SyncService`
*   **Purpose:** Managing background syncing of Zustand state up to Supabase.
*   **Public Methods:** `processQueue()`, `forceSync()`, `handleConflict()`.
*   **Dependencies:** `supabase/client.ts`, `useSyncStore`.
*   **Expected Folder:** `/lib/services/sync-service.ts`

### `ImageResolverService`
*   **Purpose:** Converts the proprietary string tokens into viable `<img src />` resources.
*   **Public Methods:** `resolveMainQuestionImages()`, `resolveOptionImage()`, `prefetchImagesForTest()`.
*   **Dependencies:** None (Pure string manipulation & configuration).
*   **Expected Folder:** `/lib/services/image-resolver.ts`

### `NotesService`, `BookmarkService`, `CalendarService`
*   **Purpose:** Handles standard Create, Read, Update, Delete for entities before putting them in the queue.
*   **Public Methods:** `save()`, `delete()`, `search()`.
*   **Dependencies:** Corresponding UI layer stores, `SyncService`.
*   **Expected Folder:** `/lib/services/*-service.ts`

---

## PART 5: SCREEN OWNERSHIP MAP

### Dashboard
*   **Components:** `stat-card`, `countdown`, `streak-chart`, `upcoming-tasks`
*   **Stores:** `useAnalyticsStore`, `useCalendarStore`
*   **Services:** `AnalyticsService`
*   **Repositories:** None

### Exam Setup
*   **Components:** Form selectors, Config toggles.
*   **Stores:** `useExamStore`
*   **Services:** `ExamService`
*   **Repositories:** `QuestionRepository` (for available topics/years)

### Exam Arena
*   **Components:** `question-renderer`, `timer`, `question-palette`, `latex-viewer`
*   **Stores:** `useExamStore`, `useSyncStore`
*   **Services:** `ImageResolverService`
*   **Repositories:** `QuestionRepository`

### Results Overview
*   **Components:** Charts (`recharts`), `stat-card`, solutions breakdown mapping.
*   **Stores:** `useExamStore` (final state), `useAnalyticsStore`
*   **Services:** `ExamService`, `AnalyticsService`
*   **Repositories:** `QuestionRepository`

### Calendar
*   **Components:** `event-calendar`
*   **Stores:** `useCalendarStore`
*   **Services:** `CalendarService`

### Notes / Bookmarks / Mistakes Bank
*   **Components:** Search bars, list item cards, `empty-state`
*   **Stores:** `useNotesStore`, `useBookmarksStore`, `useAnalyticsStore`
*   **Services:** `NotesService`, `BookmarkService`
*   **Repositories:** `QuestionRepository` (to resolve text previews for IDs)

---

## PART 6: MODULE IMPLEMENTATION ORDER

### Module 1: Foundation & Data Layer
*   **Goal:** Stand up Next.js app, parse the JSON file, build memory indexes, prove image resolutions.
*   **Files Created:** `question-repository.ts`, `index-builder.ts`, `image-resolver.ts`, `Aggregated_Output.json`.
*   **Dependencies:** None.
*   **Success Criteria:** Can load the app, open console, and query the repository singleton flawlessly.
*   **Testing Checklist:** Map builds in < 50ms, Image tokens resolve correctly.

### Module 2: UI Shell & Global State
*   **Goal:** Dashboard skeleton, routing setup, Zustand base stores. Theme toggling.
*   **Files Created:** `layout.tsx`, `use-ui-store.ts`, `sidebar.tsx`, `topbar.tsx`.
*   **Dependencies:** Module 1.
*   **Success Criteria:** Navigation between blank placeholder pages (Dashboard, Setup, Notes) works with dark mode.

### Module 3: Exam Engine (Core Loop)
*   **Goal:** Rendering test UI, answering questions, timer, palette states, saving locally.
*   **Files Created:** `use-exam-store.ts`, `ExamService`, `arena/[id]/page.tsx`, `timer.tsx`, `question-palette.tsx`.
*   **Dependencies:** Module 1, Module 2.
*   **Success Criteria:** Can begin a test, click options, mark for review, and submit mock results to console.

### Module 4: Exam Results & Analytics Display
*   **Goal:** Show accuracy, charts, mistakes pushing.
*   **Files Created:** `results/[id]/page.tsx`, `AnalyticsService`, `use-analytics-store.ts`, Recharts wrappers.
*   **Dependencies:** Module 3.
*   **Success Criteria:** Test submission routes to Results page. Radar charts populate efficiently.

### Module 5: Auxiliary Tools (Notes & Bookmarks)
*   **Goal:** Users can tag/bookmark while in exam arena and view them in central locations.
*   **Files Created:** `use-notes-store.ts`, `use-bookmarks-store.ts`, `notes/page.tsx`, `bookmarks/page.tsx`.
*   **Dependencies:** Module 3.
*   **Success Criteria:** Star a question mid-test; see it in Bookmarks tab later with a code-block preview.

### Module 6: Offline Resilience & Sync Layer
*   **Goal:** Intercept all state mutations, queue them if offline, push to Supabase when online.
*   **Files Created:** `use-sync-store.ts`, `SyncService`, `supabase/client.ts`.
*   **Dependencies:** Module 4, Module 5.
*   **Success Criteria:** Answer questions while network disconnected. Reconnect network -> Observe background sync to DB.

### Module 7: Calendar & Planner
*   **Goal:** Implement FullCalendar.
*   **Files Created:** `use-calendar-store.ts`, `calendar/page.tsx`, `upcoming-tasks.tsx`.
*   **Dependencies:** Module 2.
*   **Success Criteria:** Able to drag and drop a Mock Exam event and see it reflected on Dashboard.

---

## PART 7: AI CODE GENERATION READINESS REVIEW

### Missing Risks
1.  **JSON Payload Parsing at Build vs Client:** If the `Aggregated_Output.json` is large (e.g., >2MB), importing it directly into client-side JS bundles will crash browser memory and ruin Lighthouse scores. The `QuestionRepository` must be strictly scoped to server-side APIs, or we must fetch it dynamically via `fetch('/data/Aggregated_Output.json')` into an IndexedDB cache rather than a raw JS `import`.
2.  **Supabase Auth Ghosting:** Instructions say "Single user application. No authentication". If Supabase Row Level Security (RLS) policies aren't set to fully anonymous public, syncs will bounce with 401 Unauthorized. We must explicitly set up a completely public Table configuration or use a hardcoded anonymous UUID.

### Architectural Weaknesses
1.  **Image Fallbacks:** Re-rendering Next.js `next/image` handles component fallbacks fine, but if `<img />` tags are baked deeply inside raw MathJax Strings (Question Text), intercepting the `onError` handlers inside injected HTML is notoriously difficult. The HTML strings might require DOM sanitization post-processing to inject `onerror="this.src='/fallback.png'"` logic.

### Future Scaling Risks
1.  **Sync Conflicts:** A "Single User" app might be opened on an iPad and Desktop simultaneously. Simple "last write wins" on the Sync queue works for now, but a true CRDT (Conflict-free Replicated Data Type) might be necessary for Note text editing in Release 3.
2.  **Dataset growth:** 975 questions are fine for memory indexing. If it hits 10,000+ questions in Release 3, memory indexes will bottleneck start times. IndexedDB wrapping (like `Dexie.js`) would be a mandatory upgrade over purely memory maps.

**Code generation is primed to begin following the sequence laid out in Module 1.**
