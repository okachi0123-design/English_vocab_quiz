import type { QuizResult } from "../types/quiz";

type ResultSummaryProps = {
  result: QuizResult;
  onRetry: () => void;
};

export function ResultSummary({ result, onRetry }: ResultSummaryProps) {
  return (
    <section className="result-summary" aria-labelledby="result-title">
      <div>
        <p className="eyebrow">YOUR RESULT</p>
        <h2 id="result-title">{result.message}</h2>
        <p>{result.attempt}問中 {result.score}問正解</p>
      </div>
      <div className="score-circle" aria-label={`正解率 ${result.percentage}パーセント`}>
        <strong>{result.percentage}</strong><span>%</span>
      </div>
      <button type="button" className="secondary-button" onClick={onRetry}>もう一度挑戦</button>
    </section>
  );
}
