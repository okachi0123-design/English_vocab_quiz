import type { WordInput } from "../api/dataApi";

export function trimWordInput({ word, meaning }: WordInput): WordInput {
  return { word: word.trim(), meaning: meaning.trim() };
}

export function wordInputError({ word, meaning }: WordInput) {
  if (!word) return "英単語を入力してください。";
  if (!meaning) return "意味を入力してください。";
  if (!/^[ -~]+$/.test(word) || !/[a-z]/i.test(word)) return "英単語は半角の英字を含む表記で入力してください。";
  return "";
}
