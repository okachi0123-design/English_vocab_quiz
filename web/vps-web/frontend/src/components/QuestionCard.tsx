import type { Question, QuestionResult } from "../types/quiz";

type QuestionCardProps = {
  question: Question;
  index: number;
  value: string;
  disabled: boolean;
  result?: QuestionResult;
  onChange: (value: string) => void;
  onEnter: () => void;
};

export function QuestionCard({ question, index, value, disabled, result, onChange, onEnter }: QuestionCardProps) {
  return (
    <li className={`question-row ${result ? (result.result === "〇" ? "correct" : "incorrect") : ""}`}>
      <div className="word-block">
        <span className="question-number">{String(index + 1).padStart(2, "0")}</span>
        <label htmlFor={`answer-${index}`} className="word">{question.word}</label>
      </div>
      <div className="answer-block">
        <input
          id={`answer-${index}`}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onEnter();
            }
          }}
          placeholder="日本語の意味"
          autoComplete="off"
          disabled={disabled}
        />
        {result && (
          <div className="feedback" aria-live="polite">
            <span className="result-mark">{result.result}</span>
            {result.result === "✕" && result.answer && <span>正解：{result.answer}</span>}
          </div>
        )}
      </div>
    </li>
  );
}
