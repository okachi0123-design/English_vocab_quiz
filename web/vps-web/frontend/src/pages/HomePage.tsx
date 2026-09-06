import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="page home-page">
      <section className="panel hero-panel">
        <p className="eyebrow">ENGLISH VOCAB QUIZ</p>
        <h1>あなたの英単語力を<br />試してみよう。</h1>
        <p className="lead">表示された英単語の意味を日本語で答える、シンプルな語彙クイズです。</p>
        <Link className="primary-button button-link" to="/quiz">挑戦する</Link>
      </section>
    </main>
  );
}
