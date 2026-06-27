# Module 1.5 Detailed Technical Design Specification

## 1. AST System & Extensible Node Architecture

The system type definitions must separate raw data from normalized, renderable Abstract Syntax Trees (ASTs) while preserving raw copies for fallback and telemetry.

### Extensible AST Schema

```typescript
export type ASTNodeType =
  | "text"
  | "latex-inline"
  | "latex-display"
  | "image"
  | "html"
  | "table"
  | "reference"
  | "code";

export interface BaseNode {
  type: ASTNodeType;
  id?: string;
}

export interface TextNode extends BaseNode {
  type: "text";
  content: string;
}

export interface MathInlineNode extends BaseNode {
  type: "latex-inline";
  content: string;
}

export interface MathDisplayNode extends BaseNode {
  type: "latex-display";
  content: string;
}

export interface ImageNode extends BaseNode {
  type: "image";
  originalToken: string;
  resolvedUrl: string;
  altText?: string;
  hasError?: boolean;
}

// Future Extensibility
export interface HtmlNode extends BaseNode {
  type: "html";
  content: string;
}
export interface TableNode extends BaseNode {
  type: "table";
  rows: string[][];
}
export interface ReferenceNode extends BaseNode {
  type: "reference";
  targetId: string;
}
export interface CodeNode extends BaseNode {
  type: "code";
  language: string;
  content: string;
}

export type RenderNode =
  | TextNode
  | MathInlineNode
  | MathDisplayNode
  | ImageNode
  | HtmlNode
  | TableNode
  | ReferenceNode
  | CodeNode;

export interface RenderableOption {
  option_id: string;
  is_correct: boolean;
  optionTextRaw: string;
  contentAst: RenderNode[];
}

export interface RenderableQuestion {
  question_no: number;
  question_id: string;
  question_type: "MCQ" | "MSQ" | "NAT";
  marks: number;
  section: string;
  subject: string;
  topic: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  year: string;
  shift: string;
  year_shift: string;

  // Storage of both raw and processed
  questionTextRaw: string;
  contentAst: RenderNode[];

  options: RenderableOption[];
  nat_answer_range?: { min: number; max: number };

  has_image: boolean;
  requires_latex: boolean;
}
```

## 2. State-Machine Tokenizer Architecture

We abandon fragile Regex loops for a deterministic, forward-scanning Finite State Machine (FSM).

### State Diagram & Transition Rules

**States:** `READ_TEXT`, `IN_INLINE_MATH` (`$`), `IN_DISPLAY_MATH` (`$$`), `IN_IMAGE_TOKEN` (`[`).

**Transitions (Character-by-character scan):**

- Start in `READ_TEXT`.
- **`$`**: If in `READ_TEXT`, peak next. If `$`, branch to `IN_DISPLAY_MATH`. Else, `IN_INLINE_MATH`.
- **`[`**: If in `READ_TEXT`, peak ahead for `IMAGE_Q_`. If matches, branch to `IN_IMAGE_TOKEN`.
- **`]`**: If in `IN_IMAGE_TOKEN`, close token, branch to `READ_TEXT`.
- **`$` / `$$`**: If in corresponding MATH state, close token, branch to `READ_TEXT`.
- **Terminal Catch**: Unclosed states at EOF are flushed as TEXT to prevent data loss.

**Complexity Analysis & Edge Cases:**

- **Time Complexity**: `O(N)` where N is characters in the string. Single-pass.
- **Space Complexity**: `O(N)` to store string buffer and resulting tokens.
- **Malformed Tokens**: If `[IMAGE_Q_02_1` lacks a closing `]`, the state machine hits EOF and reverts the unclosed buffer to `READ_TEXT`.
- **Escaped Dollars**: Handling `\$` safely without triggering `IN_INLINE_MATH`.

## 3. Web Worker Compatible Compiler Abstraction

The AST compilation involves iterating thousands of strings. To ensure the UI thread is never blocked, the compiler is abstracted behind an interface that supports immediate synchronous processing or deferred Web Worker processing.

### Interface Design

```typescript
export interface IASTCompiler {
  compile(questions: any[]): Promise<RenderableQuestion[]>;
}

// In /lib/repository/transformers/compiler-facade.ts
export class CompilerFacade implements IASTCompiler {
  public async compile(questions: any[]): Promise<RenderableQuestion[]> {
    if (typeof Worker !== "undefined") {
      return this.compileViaWorker(questions);
    }
    return this.compileSynchronously(questions);
  }
}
```

## 4. IndexedDB AST Caching Strategy

Instead of caching raw JSON and re-parsing every launch, we only execute the FSM Tokenizer once globally. The compiled AST arrays are stored in IndexedDB.

### Storage Schema & Versioning

- **Database**: `GatePrepOS_DB` -> **Version**: `1`
- **Object Stores**:
  - `Metadata`: Stores `{ key: 'dataset_hash', version: 'v1.5' }`
  - `CompiledQuestions`: Stores `RenderableQuestion` indexed by `question_id`.

### Cold vs. Warm Start Flow

**Cold Start:**

1. Fetch `Aggregated_Output.json`.
2. Compare Hash. If changed -> Compile via Web Worker / FSM.
3. Save compiled `RenderableQuestion[]` to `CompiledQuestions` store.
4. Update `Metadata` hash.
5. Feed into `IndexBuilder`.

**Warm Start:**

1. Check `Metadata` Hash (offline).
2. Read `CompiledQuestions` via IndexedDB bulk read (`getAll`).
3. Feed instantly into `IndexBuilder`, bypassing Tokenizer entirely.

## 5. Expanded Indexing Architecture (including byMarks)

Post-processing, memory references (pointers to frozen `RenderableQuestion` objects) are indexed.

### Final IndexCollection Interface

```typescript
export interface IndexCollection {
  questionsById: Map<string, RenderableQuestion>;
  questionsByYear: Map<string, RenderableQuestion[]>;
  questionsByShift: Map<string, RenderableQuestion[]>;
  questionsByYearShift: Map<string, RenderableQuestion[]>; // e.g., "2026-FN"
  questionsBySection: Map<string, RenderableQuestion[]>; // e.g., "Aptitude"
  questionsBySubject: Map<string, RenderableQuestion[]>; // e.g., "Mathematics"
  questionsByTopic: Map<string, RenderableQuestion[]>; // e.g., "Calculus"
  questionsByDifficulty: Map<string, RenderableQuestion[]>; // Easy/Medium/Hard
  questionsByType: Map<string, RenderableQuestion[]>; // MCQ/MSQ/NAT
  questionsByMarks: Map<number, RenderableQuestion[]>; // e.g., 1 or 2
  allQuestions: RenderableQuestion[];
}
```

**Justification**: `byMarks` supports generating mock tests with specific weighting requirements. `byYearShift` allows instant paper lookups without intersection filtering. Memory cost is `~8 bytes` per pointer per index. For 1,000 items, all indexes consume `< 1MB` safely.

## 6. Question Repository Production API Contract

The singleton repository interface exposes granular retrieval and diagnostics.

```typescript
export interface IQuestionRepository {
  // Initialization
  initialize(): Promise<RepositoryDiagnostics>;

  // Retrieval APIs
  getQuestion(id: string): RenderableQuestion | undefined;
  getPaper(yearShift: string): RenderableQuestion[];
  getSubjectBank(subject: string): RenderableQuestion[];
  buildTest(config: TestConfig): RenderableQuestion[];

  // Stats APIs
  getAvailableTopics(subject?: string): string[];
  getAvailablePapers(): string[];

  // Cache & Integration Hooks
  forceCacheInvalidation(): Promise<void>;
  generateDiagnostics(): RepositoryDiagnostics;
}
```

## 7. Repository Diagnostics Subsystem

For robust telemetry and debugging, the init cycle outputs a diagnostics snapshot.

```typescript
export interface RepositoryDiagnostics {
  totalQuestions: number;
  totalSubjects: number;
  totalTopics: number;
  totalImages: number;
  totalLatexNodes: number;
  compilationDurationMs: number;
  indexingDurationMs: number;
  cacheSource: "NETWORK_JSON" | "INDEXEDDB_AST";
  versionHash: string;
  errors: string[];
}
```

## 8. Module 1.5 Implementation Sequence

### Phase 1: Core AST & FSM Tokenizer

- **Files**: `types/ast.types.ts`, `lib/repository/transformers/fsm-tokenizer.ts`
- **Goal**: Build the deterministic state machine holding strict unit tests.

### Phase 2: Compiler & Image Resolver V2

- **Files**: `image-node-builder.ts`, `compiler-facade.ts`
- **Goal**: Abstract the loop that transforms raw arrays into AST payloads. Resolve images using deterministic mapping at compile-time.

### Phase 3: IndexedDB Integration

- **Files**: `lib/repository/storage/idb-manager.ts`
- **Goal**: Wrap `idb` or raw IndexedDB to cache the AST payload.

### Phase 4: IndexBuilder V2 & Repository Cutover

- **Files**: `index-builder.ts`, `question-repository.ts`
- **Goal**: Combine the new compiler flow with `byMarks` and `byYearShift` indexing. Expose Diagnostics.

### Phase 5: Store Updates & System Validation

- **Files**: `store/use-data-store.ts`
- **Goal**: Bubble up Diagnostics to UI. Confirm cold-start vs warm-start speeds.

**Migration Risks**:

- Modifying `useDataStore` directly will break existing UI assumptions until fully replaced.
- Image resolving must strictly fallback to avoid Promise rejections crashing compilation.

**Performance Validation Checklist**:

- [ ] Cold Start Initialization < 300ms.
- [ ] Warm Start Initialization (IDB) < 50ms.
- [ ] AST Memory consumption strictly < 10MB per 1000 items.
- [ ] Diagnostics accurately report cache source and duration.
- [ ] No regular expressions utilized for LaTeX parsing during render logic.

**GO / NO-GO**:
A confident **GO** for Module 1.5. This ensures the future Exam Engine will receive pre-computed, UI-safe AST arrays rendering perfectly with zero performance degradation, enabling immediate pathing to Module 2 UI Shell creation.
