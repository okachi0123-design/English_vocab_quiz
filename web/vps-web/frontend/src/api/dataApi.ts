import { resolveApiBaseUrl } from "./apiConfig";

export interface WordInput {
  word: string;
  meaning: string;
}

export interface SavedWord extends WordInput {
  id: number;
}

interface WordResult {
  word: string;
  message: string;
}

const dataUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.DEV) + "/data";
const unknownResult = "処理結果を確認できません。再送信する前に、問題管理で一覧を再取得してください。";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSavedWord(value: unknown): value is SavedWord {
  return isRecord(value) && Number.isSafeInteger(value.id) &&
    typeof value.word === "string" && typeof value.meaning === "string";
}

function isWordResult(value: unknown): value is WordResult {
  return isRecord(value) && typeof value.word === "string" && typeof value.message === "string";
}

async function request(method: "GET" | "POST" | "PUT" | "DELETE", body?: unknown, signal?: AbortSignal): Promise<unknown> {
  const isMutation = method !== "GET";
  const fallback = isMutation ? unknownResult : "単語一覧を取得できませんでした。";
  let response: Response;
  try {
    response = await fetch(dataUrl, {
      method,
      credentials: "include",
      signal,
      ...(isMutation
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : { cache: "no-store" }),
    });
  } catch {
    throw new Error("バックエンドに接続できませんでした。" + (isMutation ? unknownResult : ""));
  }
  const data: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    if (response.status < 500 && isRecord(data) && typeof data.detail === "string") {
      throw new Error(data.detail);
    }
    if (response.status === 422) throw new Error("入力形式に誤りがあります（HTTP 422）。");
    throw new Error(`通信に失敗しました（HTTP ${response.status}）。${fallback}`);
  }
  if (data === undefined) throw new Error(fallback);
  return data;
}

export async function fetchWords(signal?: AbortSignal): Promise<SavedWord[]> {
  const data = await request("GET", undefined, signal);
  if (!Array.isArray(data) || !data.every(isSavedWord)) throw new Error("単語一覧の形式を確認できませんでした。");
  return data.map(({ id, word, meaning }) => ({ id, word, meaning }));
}

export async function addQuestions(input: WordInput[]): Promise<{ added: WordResult[]; failed: WordResult[] }> {
  const data = await request("POST", input.map(({ word, meaning }) => ({ word, meaning })));
  if (!Array.isArray(data) || data.length !== 2) throw new Error(unknownResult);
  const [added, failed] = data;
  if (!Array.isArray(added) || !added.every(isWordResult) ||
    !Array.isArray(failed) || !failed.every(isWordResult)) throw new Error(unknownResult);

  // The API identifies each outcome by word. Only clear drafts when every submitted word is accounted for once.
  const pending = new Set(input.map(({ word }) => word));
  for (const { word } of [...added, ...failed]) {
    if (!pending.delete(word)) throw new Error(unknownResult);
  }
  if (pending.size) throw new Error(unknownResult);
  return { added, failed };
}

export async function replaceWord({ id, word, meaning }: SavedWord): Promise<void> {
  const data = await request("PUT", { id, word, meaning });
  if (data === "データに異常があります") throw new Error("変更対象が見つかりません（データに異常があります）。");
  if (!Array.isArray(data) || data.length !== 3 || data[0] !== "テーブルがアップデートされました" ||
      data[1] !== id || data[2] !== word) throw new Error(unknownResult);
}

export async function deleteWords(ids: number[]): Promise<string[]> {
  const data = await request("DELETE", ids);
  if (data === "データが削除されませんでした") throw new Error("削除対象が見つかりません（データが削除されませんでした）。");
  if (!Array.isArray(data) || data.length !== 2 || data[0] !== "以下の問題が削除されました" ||
      !Array.isArray(data[1]) || !data[1].length || data[1].length > ids.length ||
      !data[1].every((word: unknown) => typeof word === "string")) throw new Error(unknownResult);
  return data[1];
}
