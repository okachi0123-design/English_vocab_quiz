import type { Answer, Question, QuizResult } from "../types/quiz";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const PASSWORD_HEADER = "enterd-password";
const AUTH_ERROR = "パスワードが正しくありません";
export const MIN_ATTEMPT_COUNT = 1;
export const MAX_ATTEMPT_COUNT = 99;

export class QuizApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuizApiError";
  }
}

function quizUrl(query = ""): string {
  if (!API_BASE_URL) {
    throw new QuizApiError("APIの接続先が設定されていません。.envを確認してください。");
  }
  return `${API_BASE_URL}/quiz${query}`;
}

async function readJson(response: Response, failureMessage: string): Promise<unknown> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new QuizApiError(response.ok ? "予期しないレスポンスを受信しました。" : failureMessage);
  }

  if (!response.ok) {
    throw new QuizApiError(response.status === 401 || response.status === 403 ? AUTH_ERROR : failureMessage);
  }
  if (data === AUTH_ERROR) {
    throw new QuizApiError(AUTH_ERROR);
  }
  return data;
}

function isQuestion(value: unknown): value is Question {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return Number.isInteger(item.id) && typeof item.word === "string";
}

function isQuizResult(value: unknown): value is QuizResult {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  if (!Array.isArray(item.results) || !item.results.every((entry) => {
    if (typeof entry !== "object" || entry === null) return false;
    const result = entry as Record<string, unknown>;
    return (result.result === "〇" || result.result === "✕") &&
      (result.answer === undefined || typeof result.answer === "string");
  })) return false;

  return typeof item.attempt === "number" && typeof item.score === "number" &&
    typeof item.percentage === "number" && typeof item.message === "string";
}

function networkMessage(error: unknown): never {
  if (error instanceof QuizApiError) throw error;
  throw new QuizApiError("バックエンドに接続できませんでした。時間をおいて再度お試しください。");
}

export async function fetchQuestions(attemptCount: number, password: string): Promise<Question[]> {
  try {
    if (!Number.isInteger(attemptCount) || attemptCount < MIN_ATTEMPT_COUNT || attemptCount > MAX_ATTEMPT_COUNT) {
      throw new QuizApiError(`問題数は${MIN_ATTEMPT_COUNT}〜${MAX_ATTEMPT_COUNT}の整数で入力してください。`);
    }
    const response = await fetch(quizUrl(`?attempt_count=${encodeURIComponent(attemptCount)}`), {
      headers: { [PASSWORD_HEADER]: password },
    });
    const data = await readJson(response, "問題の取得に失敗しました。");
    if (!Array.isArray(data) || !data.every(isQuestion)) {
      throw new QuizApiError("予期しないレスポンスを受信しました。");
    }
    return data;
  } catch (error) {
    networkMessage(error);
  }
}

export async function submitAnswers(answers: Answer[], password: string): Promise<QuizResult> {
  try {
    const response = await fetch(quizUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [PASSWORD_HEADER]: password,
      },
      body: JSON.stringify(answers),
    });
    const data = await readJson(response, "採点に失敗しました。");
    if (!isQuizResult(data) || data.results.length !== answers.length) {
      throw new QuizApiError("予期しないレスポンスを受信しました。");
    }
    return data;
  } catch (error) {
    networkMessage(error);
  }
}
