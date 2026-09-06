import { type FormEvent, useState } from "react";
import { MAX_ATTEMPT_COUNT, MIN_ATTEMPT_COUNT } from "../api/quizApi";

type QuizSetupProps = {
  loading: boolean;
  error: string;
  onStart: (password: string, count: number) => Promise<void>;
};

export function QuizSetup({ loading, error, onStart }: QuizSetupProps) {
  const [password, setPassword] = useState("");
  const [count, setCount] = useState(String(MIN_ATTEMPT_COUNT));
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedCount = Number(count);
    if (!password) {
      setValidationError("パスワードを入力してください。");
      return;
    }
    if (!Number.isInteger(parsedCount) || parsedCount < MIN_ATTEMPT_COUNT || parsedCount > MAX_ATTEMPT_COUNT) {
      setValidationError(`問題数は${MIN_ATTEMPT_COUNT}〜${MAX_ATTEMPT_COUNT}の整数で入力してください。`);
      return;
    }
    setValidationError("");
    await onStart(password, parsedCount);
  };

  return (
    <section className="panel setup-panel" aria-labelledby="setup-title">
      <p className="eyebrow">QUIZ SETUP</p>
      <h1 id="setup-title">挑戦する準備はできましたか？</h1>
      <p className="lead">英単語の日本語の意味を入力して、語彙力をチェックしましょう。</p>

      <form onSubmit={handleSubmit} className="setup-form">
        <label>
          APIパスワード
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
        </label>
        <label>
          挑戦する問題数
          <input
            type="number"
            min={MIN_ATTEMPT_COUNT}
            max={MAX_ATTEMPT_COUNT}
            step="1"
            value={count}
            onChange={(event) => setCount(event.target.value)}
            inputMode="numeric"
            disabled={loading}
          />
        </label>
        {(validationError || error) && <p className="error" role="alert">{validationError || error}</p>}
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "問題を準備しています…" : "クイズを始める"}
        </button>
      </form>
    </section>
  );
}
