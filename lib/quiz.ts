import "server-only";

export interface ScorableQuestion {
  id: string;
  type: string; // MCQ_SINGLE | MCQ_MULTI | TRUE_FALSE | SHORT_ANSWER | DESCRIPTIVE
  correctAnswer: unknown; // ids[] for MCQ, boolean/string for others
  marks: number;
}

export type AnswerMap = Record<string, unknown>; // questionId -> answer

function normalizeArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).sort();
  if (v === null || v === undefined) return [];
  return [String(v)];
}

/**
 * Auto-grades a set of answers against questions.
 * Descriptive/short-answer questions are not auto-scored (need manual review)
 * unless an exact-match correctAnswer string is provided.
 */
export function scoreQuiz(
  questions: ScorableQuestion[],
  answers: AnswerMap,
  opts: { negativeMarkPerQuiz?: number } = {}
): { score: number; maxScore: number; autoGraded: boolean } {
  let score = 0;
  let maxScore = 0;
  let autoGraded = true;

  for (const q of questions) {
    maxScore += q.marks;
    const given = answers[q.id];

    switch (q.type) {
      case "MCQ_SINGLE":
      case "TRUE_FALSE": {
        const correct = normalizeArray(q.correctAnswer);
        const picked = normalizeArray(given);
        if (picked.length && correct.length && picked[0] === correct[0]) {
          score += q.marks;
        } else if (picked.length && opts.negativeMarkPerQuiz) {
          score -= opts.negativeMarkPerQuiz;
        }
        break;
      }
      case "MCQ_MULTI": {
        const correct = normalizeArray(q.correctAnswer);
        const picked = normalizeArray(given);
        const exact =
          correct.length === picked.length &&
          correct.every((c, i) => c === picked[i]);
        if (exact) score += q.marks;
        else if (picked.length && opts.negativeMarkPerQuiz) score -= opts.negativeMarkPerQuiz;
        break;
      }
      case "SHORT_ANSWER": {
        const correct = q.correctAnswer;
        if (typeof correct === "string" && typeof given === "string") {
          if (correct.trim().toLowerCase() === given.trim().toLowerCase()) {
            score += q.marks;
          }
        } else {
          autoGraded = false; // needs manual review
        }
        break;
      }
      default:
        autoGraded = false; // DESCRIPTIVE etc.
    }
  }

  return { score: Math.max(0, score), maxScore, autoGraded };
}
