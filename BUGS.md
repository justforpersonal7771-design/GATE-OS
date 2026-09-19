# GATE OS — Bug & Feature Backlog

Master tracking list. Source: user's full-app review on the deployed build (2026-09-19), screenshots in `D:\Personal\Adil GATE\GATE_OS\bugs\images\`, plus carry-over items found during the earlier UI/UX animation pass (see `project_ui_ux_pass_state` memory). Priority reflects functional breakage first, cosmetic polish last — not necessarily the order items were reported.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done & verified

---

## P0 — Critical (broken functionality / data integrity)

- [x] **Goal Slider is not actually functional** — renamed to Focus Target. Two layers now fixed:
  1. Tag propagation: a goal-scoped test's `GoalTag` now flows into its ExamSession (Results, Dashboard Recent Exams), Mistakes made and Bookmarks created during that session (`sourceGoalTag`, badge in both list sidebars), and the Revision queue (derives from mistakes/bookmarks). Analytics and AI Generated/Practice sets propagation not done — no natural per-record slot yet, lower value, flagged as future work.
  2. **The actual functional gap the user found**: Focus Target only ever affected its own in-panel "Launch Test" button — Setup's own Subject/Section/Custom Test generation completely ignored it (confirmed via screenshot: 36% goal set, but "Official Year Paper"/Subject Test blueprints still showed the full unfiltered pool). Fixed: Subject/Section/Custom Test generation in Setup now filters to in-goal topics and orders questions Easy → Medium → Hard (higher-priority topics first within each tier) when Focus Target is active, with a visible badge on the Generated Blueprint and the Volume/"Available" count updated to match. Deliberately left unfiltered: **Year Paper** (must stay a true, unmodified replica of that year's real exam) and **Topic Test** (student already picked one specific topic; filtering could empty the pool if that topic isn't in-goal). *(Taskbar #7)*
- [x] **AI-generated practice questions are low quality and mis-tagged.** Real root cause found: `buildPracticePrompt` never actually used the topic/subject the caller passed in — it silently substituted `currentQuestion?.topic || context.weakTopics[0] || 'Algorithms'`, so generated content (and its displayed tag) could drift from what was actually requested. The system prompt also explicitly instructed the model to mix in unrelated subjects ("interdisciplinary... combining ToC with Algorithms, Data Structures...") which explains "not just rounding up around the questions." Now takes explicit `topic`/`subject` params used throughout, instructs the model to stay strictly on-topic, and generation is no longer cached (`bypassCache: true`) so repeated clicks give genuinely different sets. *(AI Generated #2)*
- [x] **AI Generated test timer was wrong** (and the raw draft-building for that flow was fragile enough to risk the reported "error on start"). Root cause: `ExamTimer` read duration from `useExamStore().currentDraft`, but the AI Generated "Start Test" flow never populated that store (it hand-builds a draft and calls `startSession()` directly) — timer silently fell back to a hardcoded 3-hour default. Fixed by reading duration from the active session's own draft instead (works regardless of which flow started it), and made the AI-generated draft properly typed/synced into `useExamStore` too. *(AI Generated #4)*
- [x] Markdown pipe-table syntax rendered as raw `| a | b |` text instead of an HTML table. Real root cause (deeper than first suspected): table detection was running *after* FSM tokenization, but the tokenizer splits any table row containing inline LaTeX (`\(i\)`) into separate text/math tokens — so no single fragment ever looked like a complete `| a | b |` line for detection to match. Fixed by splitting table regions out of the *raw* text before tokenizing. Verified on `GATE_CS_2025_AN_Q8` — real rendered `<table>` now. *(carry-over, resolved)*
- [x] Math expressions / markdown not formatting correctly in the AI Generated section — the generated question/option text was wrapped as a single raw text node instead of being run through the parser at all (no LaTeX, no markdown, no tables). Now uses `AIResponseParser.parse()`, same pipeline as AI Tutor explanations/shortcuts. *(AI Generated #1)*
- [ ] Personal Notes and Workspace Notes markdown doesn't render — should feel like a WhatsApp/Telegram-style rich text box; fix must be applied consistently everywhere notes are edited. *(Bookmarks #2, #8)*
- [x] Today's Focus card is not dynamic — Setup page never read the `?subject=`/`?topic=` query params Focus Center was already sending; now pre-selects Deployment Type + Target Subject/Topic correctly. Verified with real deep-links.
- [x] Recent Mock Tests don't store what the test actually was — `RecentSessionSummary.config` was hardcoded to `{name: "Exam Session"}`; now carries the real `TestConfig`, shows a working drill-down, and "Practice Again" relaunches the identical config. Verified end-to-end.
- [x] Revision page: changing the revision-parameter selection didn't change the Dynamic Revision Queue — `getPersonalizedIntelligence()` always builds one blended queue regardless of mode; now filtered client-side by `item.type`/topic membership per selected mode.

## P0 — Additional (reported after initial triage)

- [x] **Dataset/image-manifest exposed as static files, trivially scrapeable via the Network tab.** No real fix exists that fully prevents this for a client-rendered app (browser must receive the content it renders — disclosed honestly), but moved `Aggregated_Output.json`/`image-manifest.json` off `public/` (no longer a guessable static URL) and behind `/api/dataset`/`/api/image-manifest` server routes with rate limiting (20 req/min/IP) and cross-origin request blocking. Raises the bar meaningfully against casual copying and scripted bulk-scraping without needing auth to exist yet. Found and fixed two real, unrelated pre-existing bugs while verifying this didn't break offline mode: (1) the Service Worker's registration call was inside a `window.addEventListener("load", ...)` nested in a `useEffect` — by the time that effect runs post-hydration, the page's `load` event has already fired, so the listener never receives it and the SW never registered at all in normal use; (2) the precache list included a `/globals.css` entry that doesn't exist at that literal path in this Next.js build, and `cache.addAll()` fails atomically on any single bad URL — so *nothing* was ever being precached, silently, this whole time. Fixed both; verified via a full production build that offline mode now genuinely works end-to-end (dataset included, fully styled render, "OFFLINE" indicator correct).
- [x] **Dashboard/Analytics navigation felt laggy** ("slightly hanging" switching to these two). Root cause: both pages (plus Revision and AI Mentor) called the uncached `refreshAnalytics()` on every single mount, re-fetching all exam session history from IndexedDB and re-running the full analytics computation from scratch even when nothing had changed since the last visit. Switched to the existing (unused) cached `loadAnalytics()`, with explicit invalidation wired into `submitSession()` so a freshly completed exam still shows up correctly on the next visit.

## P1 — High (major UX breakage, mobile compatibility, consistency)

- [x] Calendar and To-Do quick panels are not usable/compatible on mobile. Root cause: both panels used `absolute right-0` positioned relative to their own small trigger button, which sits left-of-center in the mobile icon cluster — not near the viewport's right edge like on desktop — so a right-anchored panel overflowed far off the left edge of the screen (confirmed: `x: -166px` for a 358px-wide panel on a 390px viewport) regardless of width capping. Fixed by switching to `fixed left-4 right-4` (viewport-anchored, not button-anchored) below the `sm` breakpoint, reverting to the original button-anchored `absolute right-0` behavior at `sm:` and above. Verified both panels fully visible/readable at iPhone 13 width. *(Taskbar #4)*
- [x] Calendar's dropdowns use old browser-native `<select>` styling instead of the app's premium `CustomDropdown`. Quick-add task type dropdown in the Calendar quick panel now uses `CustomDropdown` with compact styling to match the panel's small footprint. *(Taskbar #5)*
- [x] Mobile hamburger menu dropdown takes the full width instead of being a compact anchored panel like the Calendar/To-Do quick panels. Changed from a full-width `absolute top-16 left-0 w-full` banner to a `fixed left-4 right-4 top-16 mt-2 w-auto max-w-[280px] ml-auto` anchored panel, matching the Calendar/To-Do pattern. *(Taskbar #6)*
- [x] Fullscreen icon (image viewer) renders **above** the Topbar/other overlays — z-index bug. Real root cause: any ancestor `motion.div` using `whileHover={{scale:...}}` (a `transform`) becomes a CSS containing block for descendant `position: fixed` elements, so the "fullscreen" modal was positioning itself relative to that hovering card instead of the viewport. Fixed by rendering the fullscreen/lightbox modals through a React Portal (`createPortal(..., document.body)`) in `premium-image-gallery.tsx`, `study-planner.tsx`, and `exam-submit-dialog.tsx`, escaping the broken containing block entirely. *(Mistakes Bank; Bookmarks #9, #10)*
- [x] Exam session Topbar wraps into three rows when tags are long (logo / type+marks / section+subject+topic all stacking). Rebuilt as a proper 2-row structure: Row 1 (always visible) has logo/leave, Q-counter, mobile details-toggle chevron, timer, and the action icon cluster; Row 2 (collapsible on mobile via the chevron, always visible on desktop) has type/marks/difficulty + section/subject/topic tags. Applied the identical structure to Review Mode's Topbar. Found and fixed a follow-on regression from this redesign during my own mobile smoke-test: the action icon cluster was claiming 313px of a 390px viewport and squeezing the left group down to an overflowing 37px — fixed by making both flex groups properly `shrink-0`, trimming icon padding/timer sub-line with `sm:` breakpoints, and hiding the bookmark button below `sm` (moved into the mobile question-grid sheet instead). Residual ~12px overflow handled by `overflow-x-auto` as a safety net. Verified via DOM measurement and screenshots at 390px width. *(Exam Test Screen #2, #3)*
- [x] Exam session mobile view: question info and the question-palette grid are broken/not appearing. Added a mobile bottom-sheet overlay (triggered by a grid icon in Row 1) containing the full `<QuestionPalette />`, with its own Bookmark + Close buttons in the sheet header; the desktop sidebar palette is now `hidden lg:flex` so mobile only ever gets the sheet. *(Exam Test Screen #3)*
- [x] Pause Test only pauses on-screen — there's no way to actually cancel/exit the exam from there. "Session Paused" screen now has both "Resume Exam" and a "Cancel Exam" button (confirms, clears the session, navigates home). *(Exam Test Screen #1)*
- [x] No incomplete-exam tracking: leaving a test mid-way (or via Review mode's home link) should mark it incomplete, surface it on the Dashboard with a "Resume" option, and not interfere with other sessions/history. Built a multi-session archive system: `startSession()` now archives any outgoing non-submitted session under its own ID (`SessionManager.archiveIncomplete`) instead of silently overwriting it; new `IncompleteTests` Dashboard widget lists archived incomplete tests with Resume/Discard actions (`resumeArchivedSession`, `discardIncomplete`). Exam session and Review Mode logos are now buttons that navigate home (pausing/flagging the session first). *(Review Mode #1)*
- [x] Use 12-hour AM/PM time format everywhere in the app (currently inconsistent/24h in places). Added `formatTime12h()` utility; applied to Study Planner event times, Calendar quick panel's today's-agenda time, and Activity Timeline's `toLocaleTimeString` (explicit `hour12: true`). `ExamTimer`'s "Est. End" time also fixed to 12-hour format (was `hour12: false`). *(Dashboard #8)*

## P2 — Medium (real features requested, scoped work)

**Taskbar / global**
- [ ] To-Do list: drag to reorder + prioritize tasks; same drag-reorder capability in the Study Planner. *(Taskbar #1)*
- [ ] Study Planner: optional time field per task so a browser alarm/notification can fire at that time (e.g. 3 PM). Must be fully optional — no time set, no alarm. *(Taskbar #2)*
- [ ] Target exam date should default to the real GATE 2027 date (Feb 13/14, per the official GATE 2027 site) for the countdown, not a placeholder. *(Taskbar #3)*

**Dashboard**
- [ ] Add a "days left to GATE 2027" display and a dedicated card showing scheduled tests/dates/priorities (pulling from the Calendar data). *(Dashboard #9)*

**Exam Engine — Standard GATE (Setup)**
- [x] Configuration Engine: Volume now defaults to the max available whenever subject/topic/section scope changes. *(A1)*
- [ ] Generated Blueprint: hide the raw draft ID; redesign the question-type/count breakdown to look intentional, not a plain list. *(A2)*
- [ ] Add color coding to the marks/questions summary on the Generated Blueprint. *(A3)*
- [ ] Generated Blueprint layout should be fixed-height with only its internal sections scrolling, not the whole page. *(A4)*
- [ ] Configuration Engine screen has excessive padding above/below the heading — full visual redesign pass needed (premium, "properly synchronised" per the user). *(A5)*

**Exam Engine — AI Generated**
- [ ] Reorganize where "Start Test" and the selected-questions list live on this screen — current placement is awkward. *(B3)*

**AI Mentor**
- [ ] AI Study Plan Suggestions: let the user pick a target date (not just "today") and set priority, instead of a one-click add. *(AI Mentor #1)*
- [ ] Saved Shortcuts library is polluted with plain saved notes — it should only ever contain AI-generated tricks/shortcuts; regular notes belong in a separate Saved Notes area. Add filter + search (same pattern as the AI Generated section). *(AI Mentor #2)*
- [ ] Replace "Print/PDF" entirely with a genuinely dynamic **Export** (rename to something that signals "rich compiled report," not a screen print) that pulls real data from every relevant screen — progress, mistakes, improvement areas, readiness, etc. — into an actual summarized report, not a screenshot-style print. *(AI Mentor #3)*

**Bookmarks**
- [ ] Default a new bookmark into a folder named after where it was created (e.g. bookmarked during a test → "Test" folder), instead of hardcoded default folders like "Algorithms". Remove the hardcoded default folder set; only real user-created (or auto-created-by-origin) folders should exist. *(Bookmarks #1, #3)*
- [ ] Add "move to folder" (existing or new) action on a bookmark. *(Bookmarks #4)*
- [ ] Changing a bookmark's priority should change its left-edge highlight color to something priority-specific, not stay purple. *(Bookmarks #5)*
- [ ] Add "move to Revision" action on a bookmarked question. *(Bookmarks #6)*
- [ ] Clicking the AI icon on a bookmark should deep-link into the AI Tutor, auto-trigger it, and land on the full concept-overview/shortcut/tutor navigation flow (same four-part outline as the main AI Tutor entry points). *(Bookmarks #7)*
- [ ] Bookmarks list is sorted by date somewhere but the date itself isn't displayed — show it so the sort order is legible. *(Bookmarks #11)*

**Revision**
- (queue-not-updating is P0 above)

**Results / Scoreboard**
- [ ] Left-side scoreboard card currently scrolls — should be one single non-scrolling card containing all info + action buttons (Dashboard, Retry Test, and rename "Launch Review Mode" → "Review"), with real animation/effects. *(Results #1, #2)*
- [ ] Make the correct/wrong/marks/penalty summary cards colorful (semantic color per stat), not flat. *(Results #3)*

**Review Mode**
- [x] Replace "GATE OS" text with the logo mark; clicking it should go to the dashboard from anywhere, including from inside an active exam (which must first flag that exam incomplete per the P1 incomplete-tracking item above). Done as part of the P1 incomplete-tracking fix above. *(Review Mode #1)*
- [ ] AI icon in Review Mode should behave like AI Tutor's mistake-aware response generation, not a generic explain. *(Review Mode #2)*
- [x] Review Mode's Topbar should match the exam session Topbar exactly; strip out anything non-essential that's currently there instead. Rebuilt Review Mode's Topbar with the same 2-row structure as the exam session page. *(Review Mode #3)*

**Analytics**
- [ ] Needs more metrics/insight depth and a more premium visual treatment overall — currently thin. *(Analytics #1)*

## P3 — Polish / visual

- [ ] Global: replace plain white backgrounds with a tasteful gradient treatment app-wide, consistent with the existing indigo/purple premium theme.
- [ ] App naming: current placeholder "Quanta Gatewise" — brainstorm alternatives (see Section 19.5 of the master plan for prior candidates: GATE Sherpa, MentorGATE, NeuroGATE, GATE Compass, etc.) and produce logo concepts for the user to pick from.

---

## Verification plan (requested)

Once the above is implemented, produce **two full-application coverage test suites** (desktop + mobile viewports) that exercise every screen, real dataset questions/answers, and the flows above end-to-end, flagging anything still broken. This file is the checklist those suites should be built against, with the P0 items stress-tested first.

## Notes

- Screenshots for these reports live in `D:\Personal\Adil GATE\GATE_OS\bugs\images\` (21 images, captured 2026-09-19, both mobile Chrome and desktop).
- This list supersedes the smaller "Still pending" list in the `project_ui_ux_pass_state` memory except for the markdown-table parser bug and the hardcoded 3-hour timer fallback, both carried forward above/here respectively (timer fallback: low priority, only triggers with no active draft — tracked but not re-numbered above).
