import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LOGIN_URL, logout, QuizApiError } from "../api/quizApi";

const AUTH_RESULT_MESSAGES = new Map([
  ["allowed", "ログインに成功しました。"],
  ["denied", "アプリの利用が許可されていません。"],
  ["requested", "ユーザー情報を送信しました。管理者の許可をお待ちください。"],
  ["data_failed", "正確なユーザー情報の取得に失敗しました。"],
  ["google_request_failed", "Googleからユーザー情報を取得できませんでした。"],
]);

export function HomePage() {
  const { state, search } = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const authError = typeof state?.authError === "string" ? state.authError : "";
  const params = new URLSearchParams(search);
  const authResult = params.get("auth_result");
  const loggedOut = params.get("status") === "logouted";
  const authMessage = logoutError || authError || (loggedOut ? "ログアウトしました" : AUTH_RESULT_MESSAGES.get(authResult ?? ""));
  const isAuthSuccess = !logoutError && !authError && (loggedOut || authResult === "allowed");

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      navigate("/?status=logouted", { replace: true });
    } catch (error) {
      setLogoutError(error instanceof QuizApiError ? error.message : "ログアウトに失敗しました。");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <main className="page home-page">
      <section className="panel hero-panel">
        <p className="eyebrow">ENGLISH VOCAB QUIZ</p>
        <h1>あなたの英単語力を<br />試してみよう。</h1>
        <p className="lead">オリジナル英単語クイズです。挑戦するにはGoogleログインと管理者による利用許可が必要です。</p>
        {authMessage && (
          <p className={isAuthSuccess ? "auth-success" : "error home-error"} role={isAuthSuccess ? "status" : "alert"}>
            {authMessage}
          </p>
        )}
        <nav aria-labelledby="menu-title">
          <h2 id="menu-title" className="menu-title">メニュー</h2>
          <div className="home-menu">
            <Link className="primary-button button-link" to="/quiz">挑戦する</Link>
            <button className="secondary-button" type="button" disabled>前回結果 <span className="coming-soon">Coming Soon</span></button>
            <button className="secondary-button" type="button" disabled>問題追加 <span className="coming-soon">Coming Soon</span></button>
            <div className="home-auth-actions">
              <a className="secondary-button button-link" href={LOGIN_URL}>Googleでログイン</a>
              <button className="secondary-button" type="button" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? "ログアウト中…" : "ログアウト"}
              </button>
            </div>
          </div>
        </nav>
      </section>
    </main>
  );
}
