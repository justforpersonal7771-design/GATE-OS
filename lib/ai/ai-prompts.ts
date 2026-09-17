import { AIContext } from "@/types/ai.types";

export class PromptBuilder {
  /**
   * Helper to format the learner's stats and history into a clear context prompt prefix.
   */
  private static formatLearnerProfile(context: AIContext): string {
    const stats = context.studentStats;
    const statsStr = `
- Mastery Score: ${stats.masteryScore}%
- Readiness Score: ${stats.readinessScore}%
- Confidence Score: ${stats.confidenceScore}%
- Consistency: ${stats.consistencyScore}%
- Weakest Subject: ${stats.weakestSubject}
- Strongest Subject: ${stats.strongestSubject}
- Weak Topics: ${context.weakTopics.join(", ") || "None"}
- Strong Topics: ${context.strongTopics.join(", ") || "None"}
- Streak: ${stats.studyMomentum} days active
`;

    // Extract recent/repeated mistakes patterns
    const mistakeFrequencies = context.recentMistakes.reduce((acc, m) => {
      acc[m.topic] = (acc[m.topic] || 0) + (m.occurrences || 1);
      return acc;
    }, {} as Record<string, number>);

    const repeatedMistakesStr = Object.entries(mistakeFrequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic, errs]) => `- Topic "${topic}": ${errs} repeated errors`)
      .join("\n");

    return `
### Learner Profile & Diagnostic Context
${statsStr}

### Repeated Mistakes Patterns
${repeatedMistakesStr || "No repeated mistakes registered yet."}
`;
  }

  /**
   * Generates the explanation prompt for the active question.
   */
  public static buildExplainPrompt(
    context: AIContext,
    mode = "Detailed",
    personality = "Mentor"
  ): { systemInstruction: string; prompt: string } {
    const profile = this.formatLearnerProfile(context);
    const q = context.currentQuestion;
    
    if (!q) {
      throw new Error("No active question context provided for explanation generation.");
    }

    const questionDetails = `
### Question Details
- Subject: ${q.subject}
- Topic: ${q.topic}
- Section: ${q.section}
- Marks: ${q.marks}
- Difficulty: ${q.difficulty}
- Question Type: ${q.question_type}
- Text content: ${JSON.stringify(q.contentAst)}
- Options: ${JSON.stringify(q.options || [])}
- Correct NAT answer range: ${JSON.stringify(q.nat_answer_range || "None")}
- Years: ${q.year || "None"}
`;

    let modeGuidance = "";
    if (mode === "Simple" || mode === "Beginner") {
      modeGuidance = "Explain all terms from absolute first-principles. Avoid advanced leaps. Simplify algebraic steps and keep language extremely clear (explain like I'm five).";
    } else if (mode === "Detailed" || mode === "Advanced") {
      modeGuidance = "Provide a thorough explanation. Include extensive background context, auxiliary mathematical concept breakdowns, and proof derivations.";
    } else if (mode === "Exam Oriented") {
      modeGuidance = "Focus on quick test-solving tips, option elimination strategies, common pitfalls, and time management hacks.";
    } else if (mode === "Mathematical") {
      modeGuidance = "Use rigorous formal notations, LaTeX display equations, and strict proofs. Skip trivial arithmetic.";
    } else if (mode === "Visual") {
      modeGuidance = "Format details using clear ASCII art diagrams, structured HTML tables, or block charts to visualize structural transitions.";
    } else if (mode === "Algorithmic" || mode === "Pseudo Code") {
      modeGuidance = "Include clear pseudo-code blocks, trace variables step-by-step, and state time/space complexity bounds explicitly.";
    } else {
      modeGuidance = "Provide standard step-by-step derivation leading to the correct option, highlighting the core concept.";
    }

    let personalityGuidance = "";
    if (personality === "Teacher") {
      personalityGuidance = "Adopt a patient, encouraging, highly structured tone. Welcome the student and guide them step-by-step.";
    } else if (personality === "Examiner") {
      personalityGuidance = "Be rigorous, strict, and precise. Warn the student about tricky distractors, potential trap answers, and common faults.";
    } else if (personality === "Interviewer") {
      personalityGuidance = "Adopt a professional, probing tone. Ask the student to justify their decisions and explain how this fits into system designs or technical interviews.";
    } else if (personality === "Motivator") {
      personalityGuidance = "Use high-energy, positive reinforcement. Emphasize growth, boost their confidence, and encourage them to tackle harder tasks.";
    } else if (personality === "Fast Solver") {
      personalityGuidance = "Focus strictly on speed. Teach 30-second elimination tricks, mental math shortcuts, and pattern shortcuts.";
    } else if (personality === "Concept Builder") {
      personalityGuidance = "Connect the question back to prerequisite concepts (e.g. Set Theory for Graphs) to build a solid baseline.";
    } else if (personality === "Revision Coach") {
      personalityGuidance = "Focus on active recall, spaced repetition traps, and core memory tools (visualizations/mnemonics).";
    } else {
      personalityGuidance = "Act as an empathetic personal mentor. Link their mistake to their overall learning timeline progress.";
    }

    const systemInstruction = `
You are the advanced GATE OS Personal Tutor AI. 
Analyze the learner's profile, diagnostic weaknesses, and recent mistakes to deliver a highly personalized, targeted conceptual explanation.

Tone Guidance: ${personalityGuidance}
Explanation Format Guidance: ${modeGuidance}

CRITICAL INSTRUCTIONS:
1. Do not start with generic statements. Reference the student's learning history:
   - Example: "You have struggled with ${q.topic} during your last attempts. The common pattern in your mistakes is state transition faults. Before we solve this..."
2. Output a structured JSON response matching this schema:
   {
     "concept": "Name of the core concept and the learner-specific alert context",
     "steps": [
       "Logical Step 1 (e.g. Formulate Equation): Explain details of the formulation containing inline formulas \\\\( ... \\\\) or block equations \\[ ... \\]. Group mathematical steps logically in a paragraph instead of splitting them.",
       "Logical Step 2 (e.g. Solve Equation): Perform derivation and intermediate algebra here."
     ],
     "formulas": ["Key formulas written in LaTeX format (e.g. \\\\( E = mc^2 \\\\))"],
     "shortcut": "Optional shortcut trick, rule of thumb, or time-saving diagnostic advice",
     "personalizedContextNotes": "Learner-specific conceptual reminder based on their weak topics"
   }
3. All formulas must be enclosed inside double-escaped LaTeX inline delimiters like \\\\( ... \\\\) or block delimiters \\[ ... \\].
4. Output ONLY valid parseable JSON. No markdown wrappers.
5. Do not break down simple algebraic lines or single equations into separate step items. Group explanations into 3 to 5 clear logical blocks.
`;

    const prompt = `
${profile}

${questionDetails}

Please explain this question, referencing the learner's weaknesses, and return the structured JSON object.
`;

    return { systemInstruction, prompt };
  }

  /**
   * Generates Hint prompts.
   */
  public static buildHintPrompt(context: AIContext): { systemInstruction: string; prompt: string } {
    const profile = this.formatLearnerProfile(context);
    const q = context.currentQuestion;

    if (!q) {
      throw new Error("No active question context provided for hint generation.");
    }

    const systemInstruction = `
You are the advanced GATE OS personal tutor AI. Provide 3 progressive hints for the question without revealing the final correct option or direct value.
Output a JSON response matching:
{
  "hintLevel1": "Subtle clue pointing to the relevant topic formulas or standard theorem",
  "hintLevel2": "Intermediate direction helper (e.g., how to set up the equations)",
  "hintLevel3": "Profound breakdown of the conceptual core or dynamic state variables"
}
`;

    const prompt = `
${profile}

Question: ${JSON.stringify(q.contentAst)}

Generate progressive hints in the requested JSON structure.
`;

    return { systemInstruction, prompt };
  }

  /**
   * Generates Shortcut Prompt templates.
   */
  public static buildShortcutPrompt(context: AIContext): { systemInstruction: string; prompt: string } {
    const profile = this.formatLearnerProfile(context);
    const q = context.currentQuestion;

    if (!q) {
      throw new Error("No active question context provided for shortcut generation.");
    }

    const systemInstruction = `
You are the advanced GATE OS personalization engine. Provide a time-saving shortcut trick or math verification rule of thumb for this question.
Output JSON:
{
  "concept": "Shortcut Concept Name",
  "steps": ["Step 1 of shortcut implementation", "Step 2 of shortcut implementation"],
  "formulas": ["Trick formulas in LaTeX format"],
  "shortcut": "The time-saving formula or bypass method",
  "personalizedContextNotes": "Notes reminding the user to avoid their typical mistake patterns during speed runs"
}
`;

    const prompt = `
${profile}

Question Details:
Subject: ${q.subject}
Topic: ${q.topic}
Content: ${JSON.stringify(q.contentAst)}

Provide the time-saving shortcut trick in JSON format.
`;

    return { systemInstruction, prompt };
  }

  /**
   * Generates custom practice questions.
   */
  public static buildPracticePrompt(
    context: AIContext,
    count = 2,
    samples?: any[],
    currentQuestion?: any
  ): { systemInstruction: string; prompt: string } {
    const profile = this.formatLearnerProfile(context);
    
    let samplesText = "";
    if (samples && samples.length > 0) {
      samplesText = `\n\nCRITICAL: Model your generated questions exactly on the following reference GATE questions of the same topic (matching their style, depth, layout, and scientific rigor):\n` +
        samples.map((s, idx) => `--- Reference Question ${idx + 1} ---\nQuestion Text: ${s.questionTextRaw || s.question_text}\nOptions: ${JSON.stringify((s.options || []).map((o: any) => ({ option_id: o.option_id, content: o.optionTextRaw || o.text })))}`).join("\n\n");
    }

    let currentQuestionContext = "";
    if (currentQuestion) {
      currentQuestionContext = `\n\nCRITICAL CONTEXT: The student is currently studying this specific question in detail:\n` +
        `Question Text: ${currentQuestion.questionTextRaw || currentQuestion.question_text}\n` +
        `Subject: ${currentQuestion.subject}\n` +
        `Topic: ${currentQuestion.topic}\n` +
        `Difficulty: ${currentQuestion.difficulty}\n`;
    }

    const systemInstruction = `
You are the advanced GATE OS Question Generator. 
Create ${count} custom practice questions of the SAME category/topic as the current question.
The generated questions must:
1. Focus strictly on the category/topic: "${currentQuestion?.topic || context.weakTopics[0] || 'Algorithms'}".
2. Be associated to the context and level of the current question, but represent DIFFERENT types (e.g. MCQ, MSQ, NAT).
3. Be application-based, challenging, and involve terminology or mixing concepts from related computer science subjects (e.g. combining Theory of Computation with Algorithms, Data Structures, or Discrete Mathematics) to make the student subject-oriented.
4. Maintain the technical rigor, mathematical depth, and LaTeX formatting (using inline LaTeX \\\\( ... \\\\) where appropriate) typical of GATE CSE questions.

Output JSON matching:
{
  "questions": [
    {
      "questionText": "Question text using inline LaTeX \\\\( ... \\\\) where appropriate",
      "options": [
        { "option_id": "A", "content": "Option text" },
        { "option_id": "B", "content": "Option text" },
        { "option_id": "C", "content": "Option text" },
        { "option_id": "D", "content": "Option text" }
      ],
      "questionType": "MCQ",
      "correctOptionIds": ["B"],
      "natAnswerRange": null,
      "explanation": "Detailed step by step proof/explanation",
      "difficulty": "Medium"
    }
  ]
}
CRITICAL: "correctOptionIds" is REQUIRED for every MCQ (exactly one id) and MSQ (one or more ids) question —
it must match the option(s) actually justified as correct in "explanation". Never omit it and never default
to a fixed option; determine it fresh for each question. For NAT type, leave options and correctOptionIds as
null and provide "natAnswerRange": { "min": 10.5, "max": 10.5 }.
`;

    const prompt = `
${profile}
${currentQuestionContext}

Generate ${count} practice questions specifically on the category/topic: "${currentQuestion?.topic || context.weakTopics[0] || 'Algorithms'}".
Make them interdisciplinary, application-based, and associated with the context of the current question.
${samplesText}
`;

    return { systemInstruction, prompt };
  }

  /**
   * Generates Revision plans.
   */
  public static buildRevisionPrompt(context: AIContext, subject: string): { systemInstruction: string; prompt: string } {
    const profile = this.formatLearnerProfile(context);

    const systemInstruction = `
You are the advanced GATE OS study planner engine. 
Generate a custom revision plan for the subject "${subject}" based on the learner's consistency, mistakes, and confidence levels.
Output JSON matching:
{
  "subject": "${subject}",
  "priorityTopics": [
    {
      "topic": "Topic Name",
      "urgencyReason": "Reason detailing why this topic is weak (e.g. 5 pending mistakes)",
      "suggestedDurationMin": 45
    }
  ],
  "studyMethodTips": ["Specific revision guidelines tailored to the student's streak and style"]
}
`;

    const prompt = `
${profile}

Generate a revision plan in JSON structure for the subject: ${subject}.
`;

    return { systemInstruction, prompt };
  }

  /**
   * Generates the follow-up prompt supporting conversational memory loops.
   */
  public static buildFollowUpPrompt(
    context: AIContext,
    history: { role: "user" | "model"; text: string }[],
    nextMessage: string
  ): { systemInstruction: string; prompt: string } {
    const profile = this.formatLearnerProfile(context);
    const q = context.currentQuestion;

    const systemInstruction = `
You are the advanced GATE OS Personal Tutor AI.
Answer the student's follow-up questions about the active question. Keep conversation memory in context.
Output JSON matching this schema:
{
  "concept": "Core concept related to follow-up answer",
  "steps": ["Answer paragraph 1", "Answer paragraph 2 if needed"],
  "formulas": ["Relevant mathematical formulas in LaTeX format"],
  "shortcut": "Any relevant shortcut rule or code block if requested",
  "personalizedContextNotes": "Helpful conceptual callout based on student profile"
}
`;

    const prompt = `
${profile}

Question: ${q ? JSON.stringify(q.contentAst) : "General Context"}

Conversation history:
${history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join("\n")}

Student follow-up: ${nextMessage}

Please answer the follow-up, keeping in mind the learner profile and conversation history, and return the structured JSON object.
`;

    return { systemInstruction, prompt };
  }
}
