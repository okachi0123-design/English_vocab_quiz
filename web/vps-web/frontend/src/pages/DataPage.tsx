import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { deleteWords, fetchWords, replaceWord, type SavedWord, type WordInput } from "../api/dataApi";
import { AddQuestions, type AddStep } from "../components/AddQuestions";
import { trimWordInput, wordInputError } from "../types/wordInput";

type Screen = "list" | AddStep | "edit" | "select" | "confirm";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "通信に失敗しました。";
}

export function DataPage() {
  const [screen, setScreen] = useState<Screen>("list");
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<Record<number, WordInput>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const mutationPending = useRef(false);
  const listRequest = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const previousScreen = useRef<Screen>("list");
  const addButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = previousScreen.current;
    if (screen === "list" && (previous === "choose" || previous === "cart-review" || previous === "bulk")) {
      addButton.current?.focus();
    }
    previousScreen.current = screen;
  }, [screen]);

  const refresh = useCallback(async () => {
    if (!mounted.current) return;
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setLoading(true);
    setLoadError("");
    try {
      const latest = await fetchWords(controller.signal);
      if (controller.signal.aborted) return;
      setWords(latest);
      const ids = new Set(latest.map(({ id }) => id));
      setSelected(previous => previous.filter(id => ids.has(id)));
      setDrafts(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => ids.has(Number(id)))));
    } catch (cause) {
      if (!controller.signal.aborted) setLoadError(messageOf(cause));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      listRequest.current?.abort();
    };
  }, [refresh]);

  function go(next: Screen) {
    setScreen(next);
    setError("");
    setNotice("");
  }

  async function returnToList(message: string) {
    if (!mounted.current) return;
    go("list");
    setNotice(message);
    await refresh();
  }

  const selectedIds = new Set(selected);
  const selectedWords = words.filter(({ id }) => selectedIds.has(id));
  const draft = editId === null ? undefined : drafts[editId];
  const selecting = screen === "select";
  const confirming = screen === "confirm";
  const showingList = screen === "list" || screen === "choose";
  const browsing = showingList || selecting;
  const addStep = screen === "list" || screen === "edit" || selecting || confirming ? null : screen;

  function startEdit(row: SavedWord) {
    setEditId(row.id);
    setDrafts(previous => ({ ...previous, [row.id]: previous[row.id] ?? { word: row.word, meaning: row.meaning } }));
    go("edit");
  }

  function setField(field: keyof WordInput, value: string) {
    if (editId === null || !draft) return;
    setDrafts(previous => ({ ...previous, [editId]: { ...previous[editId], [field]: value } }));
    setError("");
  }

  function toggle(id: number) {
    setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  }

  async function save() {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setSaving(true);
    setError("");
    try {
      if (screen === "edit" && editId !== null && draft) {
        const { word, meaning } = trimWordInput(draft);
        const reason = wordInputError({ word, meaning });
        if (reason) throw new Error(reason);
        await replaceWord({ id: editId, word, meaning });
        if (!mounted.current) return;
        setDrafts(previous => {
          const next = { ...previous };
          delete next[editId];
          return next;
        });
        await returnToList(`「${word}」を変更しました。`);
      } else if (confirming && selectedWords.length) {
        const removed = await deleteWords(selectedWords.map(({ id }) => id));
        if (!mounted.current) return;
        const missing = selectedWords.length - removed.length;
        setSelected([]);
        await returnToList(`${removed.length}件削除しました（${removed.join("、")}）。` +
          (missing ? `選択したうち${missing}件は見つかりませんでした。` : ""));
      }
    } catch (cause) {
      if (mounted.current) setError(messageOf(cause));
    } finally {
      mutationPending.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <main className="page data-page">
      {browsing && <nav className="top-nav data-nav">
        <Link className="back-link" to="/"><span aria-hidden="true">⌂</span> ホームへ</Link>
        {showingList && <h1>問題管理</h1>}
        {showingList && <div className="data-tools">
          <button ref={addButton} className="data-button data-add" disabled={saving} onClick={() => go("choose")}>追加</button>
          <button className="data-button data-remove" disabled={saving || loading || !!loadError} onClick={() => go("select")}>削除</button>
        </div>}
      </nav>}
      <section className="panel data-panel">
        {loadError && <div className="data-load-error">
          <p className="error" role="alert">一覧の取得に失敗しました。{loadError}</p>
          <button className="data-button" onClick={() => void refresh()}>再試行</button>
        </div>}
        {(browsing || confirming) && <>
          <div className="data-body">
            {!showingList && <header className="data-header">
              <h1>{confirming ? "削除予定リスト" : "削除する単語を選択"}</h1>
            </header>}
            {notice && <p className="data-success" role="status">{notice}</p>}
            {error && <p className="error" role="alert">{error}</p>}
            {loading && <p role="status">一覧を読み込んでいます…</p>}
            {!loading && !loadError && <>
              <p className="data-count">{confirming ? `削除予定：${selectedWords.length}件` : `登録単語：${words.length}件`}</p>
              {(!confirming && !words.length)
                ? <p className="data-empty">まだデータが登録されていません</p>
                : confirming && !selectedWords.length
                  ? <p className="data-empty">削除予定の単語はありません。</p>
                  : <ul className="data-list">
                    {(confirming ? selectedWords : words).map(row => (
                      <li key={row.id} className="data-row">
                        {selecting && <input type="checkbox" aria-label={`${row.word}を削除予定に追加`}
                          checked={selectedIds.has(row.id)} onChange={() => toggle(row.id)} />}
                        <div className="data-word"><strong lang="en">{row.word}</strong><span>{row.meaning}</span></div>
                        {showingList && <button className="data-button" onClick={() => startEdit(row)}>変更</button>}
                        {confirming && <button className="data-button data-cancel-remove" disabled={saving}
                          aria-label={`${row.word}を削除予定から外す`} onClick={() => toggle(row.id)}>✕</button>}
                      </li>
                    ))}
                  </ul>}
            </>}
          </div>
          {selecting && <footer className="data-actions">
            <button type="button" className="data-button data-cancel-remove" onClick={() => go("list")}>キャンセル</button>
            <div className="data-actions-end">
              <span>選択数：{selected.length}件</span>
              <button className="data-button data-remove" disabled={!selectedWords.length}
                onClick={() => go("confirm")}>確認画面へ</button>
            </div>
          </footer>}
          {confirming && <footer className="data-actions data-actions-confirm">
            <div className="data-exit-actions">
              <button type="button" className="data-button" disabled={saving} onClick={() => go("list")}>問題管理画面へ</button>
              <button className="data-button data-cancel-remove" disabled={saving} onClick={() => go("select")}>キャンセル</button>
            </div>
            <button className="data-button data-remove" disabled={saving || !selectedWords.length}
              onClick={() => void save()}>{saving ? "削除中…" : "削除"}</button>
          </footer>}
        </>}
        {screen === "edit" && draft && <>
          <div className="data-body">
            <header className="data-header"><h1>単語の変更</h1></header>
            <form id="edit-word" className="data-pair" onSubmit={event => { event.preventDefault(); void save(); }}>
              <label>英単語<input value={draft.word} disabled={saving} onChange={event => setField("word", event.target.value)} /></label>
              <label>意味<input value={draft.meaning} disabled={saving} onChange={event => setField("meaning", event.target.value)} /></label>
            </form>
            {error && <p className="error" role="alert">{error}</p>}
          </div>
          <footer className="data-actions">
            <button className="data-button" disabled={saving} onClick={() => go("list")}>キャンセル</button>
            <button className="data-button data-add" form="edit-word" disabled={saving}>{saving ? "変更中…" : "変更を確定"}</button>
          </footer>
        </>}
        <AddQuestions step={addStep} onStepChange={next => go(next ?? "list")} onRegistered={async (message, complete) => {
          if (complete) await returnToList(message);
          else await refresh();
        }} />
      </section>
    </main>
  );
}
