# GATE OS — Audit Findings & Continuation Brief (2026-09-17)

This supplements `handover.md` (the authoritative product/architecture spec — read that first). This file is the *evidence* from actually auditing the current on-disk code against that spec's claims, per its own §75 directive ("never trust previous LLM reports blindly"). Written by Claude (Sonnet 5) after a full read of every AI-layer and Release 2 file. Do not re-derive this from scratch — read it, spot-check anything surprising, then proceed.

## Zero-budget constraint (binding on all future work)

The user has **no budget** — every dependency, hosting choice, and API must run on a genuinely free tier, while still being a real, publicly deployable app (not just localhost). Flag any cost risk before adding a dependency or service.

## Repo state

- Git: 2 commits (`6ae02cc` exam repository/storage, `7224390` "release 2 complete"). Everything under `lib/ai/`, `app/(dashboard)/ai-tutor/`, `app/(dashboard)/ai-mentor/`, `types/ai.types.ts` is **uncommitted** (untracked), plus modified-but-uncommitted changes to bookmarks/mistakes/revision/setup/results-review pages, exam-builder, question-repository, cache files, use-data-store, use-study-store, exam.types, study.types.
- `.env.local` exists, is gitignored (not in history), contains a real 53-char key under both `GOOGLE_GENERATIVE_AI_API_KEY` and `NEXT_PUBLIC_GEMINI_API_KEY`.
- IndexedDB: `GatePrepOS_DB` v7, 12 object stores (Metadata, QuestionCache, ExamSessions, UserMutations, AnalyticsSnapshots, StudyMetrics, Mistakes, Bookmarks, CustomTemplates, AIResponses, AIGeneratedQuestions, AIMemory). `AIMemory` is already a generic key→value bucket ready for Module C use.

## What's genuinely solid (verified by reading logic, not file names)

- Release 1: data layer, AST pipeline, exam engine, timer, palette — real.
- Release 2: Bookmarks, Mistakes (with real re-validation/mastery logic), Revision (builder + session), Analytics (Recharts, mostly real data), Exam Results + Review, Command Palette (globally wired, Ctrl/Cmd+K), Calendar/Study Planner (`components/dashboard/study-planner.tsx`, 878 lines, full CRUD), 8 dashboard widgets — all real, data-driven, not stubs.
- 5 learning engines (`lib/learning/*`): MasteryEngine, FocusEngine, RecommendationEngine, AdaptiveEngine, LearningEngine — genuinely sophisticated deterministic algorithms (weighted priority scores, spaced-repetition-style scheduling, trend detection). This is the best-quality layer in the codebase.
- AI Foundation (Module A) and AI Tutor support modules (context builder, prompt builder, response parser, rate limiter, memory persistence) — real, working, non-trivial.
- Module C groundwork already exists: `lib/ai/memory/{MemoryEngine,ConversationMemory,InsightMemory,KnowledgeGraph,LearningMemory}.ts`, `/ai-mentor` page. Not vaporware — real algorithms (revision priority formula, readiness/rank prediction, mistake pattern mining, prerequisite graph traversal).

## Must-fix before building more AI features on top

1. **Live security leak (P0)**: `lib/ai/gemini.ts` resolves `NEXT_PUBLIC_GEMINI_API_KEY` even server-side, and `AIService`/`AIClient` are called directly from `"use client"` pages (`ai-tutor/page.tsx`, `ai-mentor/page.tsx`). No `app/api/` route exists at all. If deployed as-is, the key ships in every visitor's JS bundle. **Fix**: create `app/api/ai/*` route handler(s), move all `@google/genai` calls server-side, drop the client from calling `AIService` directly (call the API route instead), remove `NEXT_PUBLIC_` prefix from the key.
2. **Correctness bug**: AI-generated practice questions hardcode `is_correct: o.option_id === "A"` regardless of what the AI actually returned — the AI response schema for practice questions has no correctness field being parsed/stored.
3. **Fake telemetry pollutes real memory**: `ai-tutor/page.tsx` calls `LearningMemory.recordInteraction(...)` with hardcoded `isCorrect: true, timeSpentSeconds: 60, confidenceBefore: 50, confidenceAfter: 80` on every explanation — this corrupts the exact dataset Module C's MemoryEngine/InsightMemory reason over. Must capture real values or omit the call when real values aren't available.
4. **Mocked readiness inputs**: `ai-mentor/page.tsx` passes `averageConfidence = 70 // Mock`, `plannerCompletion = 75 // Baseline default` into `MemoryEngine.predictExamReadiness`, and computes its own ad hoc mastery map instead of calling the real `MasteryEngine.calculateTopicMastery` used elsewhere. Fix: wire real computed values through.
5. **`ConversationMemory` is dead code in practice**: exists, works, is never called from `ai-tutor/page.tsx` — chat history lives only in React state and is lost on refresh.
6. **PWA is broken**: `public/sw.js` has TypeScript syntax (`: any`) in a `.js` file → browser `SyntaxError` on parse → silently fails to register (caught by a `.catch()`) → offline caching does not work despite looking complete. Fix: strip type annotations or add a build step compiling `.ts` → `public/sw.js`.
7. Minor cleanup: `design-system/*` is unused (zero imports — real theming is via CSS custom properties consumed as Tailwind arbitrary values); `motion` and `framer-motion` are both installed and used inconsistently (standardize on `motion/react`); `PersonalNotesDrawer` component exists but bookmarks/mistakes pages duplicate its markup inline instead of using it; analytics page's accuracy-trend chart has one fake data series (`50 + ((idx*17)%40)+1` instead of real per-session accuracy); Notes are only a field on Mistake/Bookmark entries, not a first-class store/page; Calendar events are stored as a JSON blob under a `Metadata` key, not a real indexed store, and `use-study-store` has no calendar slice (the calendar UI talks to `IDBManager` directly).

## Recommended order of work

1. Fix the P0 security issue + the two correctness bugs (#1-3 above) — small, contained, unblocks trusting any data Module C would read.
2. Fix #4-5 so Module C's inputs are real instead of partially mocked.
3. Then proceed to Module C proper (AI Mentor Engine, Practice Generator, Shortcut Intelligence, Mistake Pattern Discovery, Intelligent Revision Queue, Readiness Predictor, Conversation/Explain Modes, Follow-up Generator, Study Planner integration, Learning Timeline, Knowledge Graph expansion, Export Engine) — reusing the existing `lib/ai/memory/*` scaffolding rather than rebuilding it. The Knowledge Graph's content is a ~17-node seed (Discrete Math/Algorithms/Data Structures only) and needs real GATE CSE syllabus coverage (OS, DBMS, CN, TOC, Digital Logic, COA).
4. PWA fix and design-system/notes-drawer cleanup can happen alongside or after, they're not blocking.
5. Everything must stay on free tiers (Vercel free tier hosting, Gemini free-tier quota, IndexedDB — no paid backend) per the zero-budget constraint.

## Process note

This audit was done from a Claude Code session rooted in a different (stale) directory (`D:\Personal\Adil GATE\GATE_OS`) that turned out not to be the real project; all analysis above was done via background agents pointed at this repo's absolute path. A second interactive session (`r2ma-stable-77`) is already open rooted correctly in this directory — continue there for a clean working directory instead of fighting path friction.
