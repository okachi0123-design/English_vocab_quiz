import type { Answer, Question, QuizResult } from "../types/quiz";
import { resolveApiBaseUrl } from "./apiConfig";

const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.DEV);
export const LOGIN_URL = `${API_BASE_URL}/login`;
const PASSWORD_HEADER = "enterd-password";
const AUTH_ERROR = "パスワードが正しくありません";
export const MIN_ATTEMPT_COUNT = 1;
export const MAX_ATTEMPT_COUNT = 99;

export class QuizApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "QuizApiError";
  }

  get isAuthenticationError(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

function quizUrl(query = ""): string {
  return `${API_BASE_URL}/quiz${query}`;
}

function authenticationMessage(data: unknown, status: number): string {
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data === "object" && data !== null) {
    const body = data as Record<string, unknown>;
    if (typeof body.detail === "string" && body.detail.trim()) return body.detail;
    if (typeof body.message === "string" && body.message.trim()) return body.message;
  }
  return status === 401 ? "ログインしてください。" : "このクイズの利用が許可されていません。";
}

async function readJson(response: Response, failureMessage: string): Promise<unknown> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (response.ok) throw new QuizApiError("予期しないレスポンスを受信しました。");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new QuizApiError(authenticationMessage(data, response.status), response.status);
    }
    const message = response.status >= 500
      ? "サーバーでエラーが発生しました。時間をおいて再度お試しください。"
      : failureMessage;
    throw new QuizApiError(`${message}（HTTP ${response.status}）`, response.status);
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

export async function logout(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "include",
      redirect: "manual",
    });
    // FastAPI returns 307. Following it would POST to the frontend landing page.
    // Browsers expose a manual redirect as an opaque redirect response.
    if (response.type === "opaqueredirect" || response.status === 307) return;
    await readJson(response, "ログアウトに失敗しました。");
    throw new QuizApiError("ログアウトに失敗しました。");
  } catch (error) {
    networkMessage(error);
  }
}

export async function fetchQuestions(attemptCount: number, password: string): Promise<Question[]> {
  try {
    if (!Number.isInteger(attemptCount) || attemptCount < MIN_ATTEMPT_COUNT || attemptCount > MAX_ATTEMPT_COUNT) {
      throw new QuizApiError(`問題数は${MIN_ATTEMPT_COUNT}〜${MAX_ATTEMPT_COUNT}の整数で入力してください。`);
    }
    const response = await fetch(quizUrl(`?attempt_count=${encodeURIComponent(attemptCount)}`), {
      credentials: "include",
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
      credentials: "include",
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
