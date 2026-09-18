import { TestConfig } from "@/types/exam.types";

/** Human-readable label for a TestConfig, used anywhere a past/current test needs to be
 * described to the user (Recent Mock Exams, Focus Center drill-down, etc). */
export function describeTestConfig(config: TestConfig): string {
  const aiSuffix = config.isAiGenerated ? " (AI Generated)" : "";
  switch (config.examType) {
    case "YEAR_PAPER":
      return `Year Paper — ${config.yearShift || "Unknown Paper"}${aiSuffix}`;
    case "SECTION_TEST":
      return `Section Test — ${config.section || "Unknown Section"}${aiSuffix}`;
    case "SUBJECT_TEST":
      return `Subject Test — ${config.subject || "Unknown Subject"}${aiSuffix}`;
    case "TOPIC_TEST":
      return `Topic Test — ${config.topics?.[0] || "Unknown Topic"}${aiSuffix}`;
    case "CUSTOM_TEST":
    case "GRAND_MOCK":
    default: {
      const topicCount = config.topics?.length || 0;
      if (topicCount > 0) return `Custom Test — ${topicCount} topic${topicCount === 1 ? "" : "s"}${aiSuffix}`;
      if (config.subject) return `Custom Test — ${config.subject}${aiSuffix}`;
      return `Custom Test${aiSuffix}`;
    }
  }
}
