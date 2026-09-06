import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchQuestions, QuizApiError, submitAnswers } from "../api/quizApi";
import { QuestionCard } from "../components/QuestionCard";
import { QuizSetup } from "../components/QuizSetup";
import { ResultSummary } from "../components/ResultSummary";
import type { Question, QuizPhase, QuizResult } from "../types/quiz";

export function QuizPage() {
  const [phase, setPhase] = useState<QuizPhase>("setup");
  const [password, setPassword] = useState("");
  const [requestedCount, setRequestedCount] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);

  const answeredCount = useMemo(
    () => questions.filter((question) => (answers[question.id] ?? "").trim() !== "").length,
    [answers, questions],
  );

  const startQuiz = async (enteredPassword: string, count: number) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const fetchedQuestions = await fetchQuestions(count, enteredPassword);
      if (fetchedQuestions.length === 0) {
        setError("出題できる問題がありませんでした。");
        return;
      }
      setPassword(enteredPassword);
      setRequestedCount(count);
      setQuestions(fetchedQuestions);
      setAnswers(Object.fromEntries(fetchedQuestions.map((question) => [question.id, ""])));
      setResult(null);
      setPhase("answering");
    } catch (caught) {
      setError(caught instanceof QuizApiError ? caught.message : "問題の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const gradeQuiz = async () => {
    if (loading || questions.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const quizResult = await submitAnswers(
        questions.map((question) => ({ id: question.id, meaning: answers[question.id] ?? "" })),
        password,
      );
      setResult(quizResult);
      setPhase("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof QuizApiError ? caught.message : "採点に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const focusNext = (index: number) => {
    if (index < questions.length - 1) {
      document.getElementById(`answer-${index + 1}`)?.focus();
    } else {
      document.getElementById("submit-answers")?.focus();
    }
  };

  const retry = () => {
    setPhase("setup");
    setPassword("");
    setRequestedCount(0);
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="page quiz-page">
      <nav className="top-nav" aria-label="ページナビゲーション">
        <Link to="/" className="brand">EVQ</Link>
        <Link to="/" className="back-link">トップへ戻る</Link>
      </nav>

      {phase === "setup" ? (
        <QuizSetup loading={loading} error={error} onStart={startQuiz} />
      ) : (
        <section className="quiz-content">
          {phase === "result" && result ? <ResultSummary result={result} onRetry={retry} /> : (
            <header className="quiz-header">
              <div>
                <p className="eyebrow">WORDS FOR TODAY</p>
                <h1>英単語の意味を入力</h1>
                <p>空欄は不正解として採点されます。</p>
              </div>
              <div className="progress-count"><strong>{answeredCount}</strong> / {questions.length}</div>
            </header>
          )}

          {requestedCount > questions.length && (
            <p className="notice" role="status">登録されている問題数に合わせて、{questions.length}問を出題しています。</p>
          )}

          <ol className="question-list">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                value={answers[question.id] ?? ""}
                disabled={phase === "result" || loading}
                result={result?.results[index]}
                onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                onEnter={() => focusNext(index)}
              />
            ))}
          </ol>

          {phase === "answering" && (
            <div className="submit-area">
              {error && <p className="error" role="alert">{error}</p>}
              <button id="submit-answers" className="primary-button" type="button" onClick={gradeQuiz} disabled={loading}>
                {loading ? "採点しています…" : "回答を送信して採点"}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
