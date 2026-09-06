export type Question = {
  id: number;
  word: string;
};

export type Answer = {
  id: number;
  meaning: string;
};

export type QuestionResult = {
  result: "〇" | "✕";
  answer?: string;
};

export type QuizResult = {
  results: QuestionResult[];
  attempt: number;
  score: number;
  percentage: number;
  message: string;
};

export type QuizPhase = "setup" | "answering" | "result";
