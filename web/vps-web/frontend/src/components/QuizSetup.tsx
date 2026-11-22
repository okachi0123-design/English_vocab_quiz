import { type FormEvent, type ReactNode, useState } from "react";
import { MAX_ATTEMPT_COUNT, MIN_ATTEMPT_COUNT } from "../api/quizApi";

type QuizSetupProps = {
  loading: boolean;
  error: ReactNode;
  onStart: (count: number) => Promise<void>;
};

export function QuizSetup({ loading, error, onStart }: QuizSetupProps) {
  const [count, setCount] = useState(String(MIN_ATTEMPT_COUNT));
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedCount = Number(count);
    if (!Number.isInteger(parsedCount) || parsedCount < MIN_ATTEMPT_COUNT || parsedCount > MAX_ATTEMPT_COUNT) {
      setValidationError(`問題数は${MIN_ATTEMPT_COUNT}〜${MAX_ATTEMPT_COUNT}の整数で入力してください。`);
      return;
    }
    setValidationError("");
    await onStart(parsedCount);
  };

  return (
    <section className="panel setup-panel" aria-labelledby="setup-title">
      <h1 id="setup-title">挑戦数を入力してクイズに挑戦しましょう！</h1>

      <form onSubmit={handleSubmit} className="setup-form">
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
