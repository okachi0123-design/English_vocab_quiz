import { useEffect, useRef, useState, type FormEvent } from "react";
import { addQuestions, type WordInput } from "../api/dataApi";
import { trimWordInput, wordInputError } from "../types/wordInput";

export type AddStep = "choose" | "cart-input" | "cart-review" | "bulk";
type CartItem = WordInput & { key: number };
type AddResult = Awaited<ReturnType<typeof addQuestions>>;

interface Props {
  step: AddStep | null;
  onStepChange: (step: AddStep | null) => void;
  onRegistered: (message: string, complete: boolean) => Promise<void>;
}

function checkEntry(entry: WordInput, seen: Set<string>) {
  const error = wordInputError(entry);
  if (error) return error;
  if (seen.has(entry.word)) return `「${entry.word}」が同じ入力内で重複しています。`;
  seen.add(entry.word);
  return "";
}

function parseBulk(text: string) {
  const entries: WordInput[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  text.split(/\r\n?|\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const fields = line.split(",");
    if (fields.length !== 2) {
      errors.push(`${index + 1}行目：英単語と意味を半角カンマ（,）1つで区切ってください。`);
      return;
    }
    const entry = trimWordInput({ word: fields[0], meaning: fields[1] });
    const error = checkEntry(entry, seen);
    if (error) errors.push(`${index + 1}行目：${error}`);
    else entries.push(entry);
  });
  return { entries, errors };
}

function MethodChooser({ choose, cancel }: { choose: (step: AddStep) => void; cancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (typeof element.showModal === "function") element.showModal();
    else element.open = true;
    title.current?.focus();
    element.scrollTop = 0;
    return () => { if (typeof element.close === "function") element.close(); };
  }, []);

  return (
    <dialog ref={dialog} className="add-method-dialog" aria-labelledby="add-method-title" aria-describedby="add-method-note"
      onCancel={(event) => { event.preventDefault(); cancel(); }}>
      <h2 ref={title} id="add-method-title" tabIndex={-1}>追加方法を選択</h2>
      <p id="add-method-note">追加単語と登録単語の重複は自動で検知します</p>
      <div className="add-method-options">
        <div className="add-method-option">
          <p id="add-method-cart-description">１つずつ英単語、意味を入力してカートに追加後　カート内で送信できます</p>
          <div className="add-method-preview" role="img" aria-label="カートに入力する画面例。英単語に cat、意味に猫を入力">
            <strong>カートに入力</strong>
            <div className="add-method-preview-fields">
              <div>英単語<span className="add-method-preview-input" lang="en">cat</span></div>
              <div>意味<span className="add-method-preview-input">猫</span></div>
            </div>
            <span className="add-method-preview-action">カートに追加</span>
          </div>
          <button className="data-button data-add" aria-describedby="add-method-cart-description"
            onClick={() => choose("cart-input")}>1つずつカートに入力して追加</button>
        </div>
        <div className="add-method-option">
          <p id="add-method-bulk-description">英単語と意味をカンマ区切りで入力し、それぞれを改行で分けることで一度でたくさんの単語を送信できます</p>
          <div className="add-method-preview" role="img" aria-label="一括入力の画面例。cat,猫 と dog,犬 を1行ずつ入力">
            <strong>一括で入力して追加</strong>
            <div className="add-method-preview-input"><span lang="en">cat</span>,猫<br /><span lang="en">dog</span>,犬</div>
            <span className="add-method-preview-action">追加リクエスト</span>
          </div>
          <button className="data-button data-add" aria-describedby="add-method-bulk-description"
            onClick={() => choose("bulk")}>一括で入力して追加</button>
        </div>
      </div>
      <button className="data-button data-cancel-add" onClick={cancel}>キャンセル</button>
    </dialog>
  );
}

function AddFeedback({ result }: { result: AddResult }) {
  return (
    <div className="add-feedback" role="alert">
      {result.added.length > 0 && <p>登録成功（{result.added.length}件）　{result.added.map(({ word }) => word).join("、")}</p>}
      <p>登録失敗（{result.failed.length}件）</p>
      <ul>{result.failed.map(({ word, message }) => <li key={word}>{word}：{message}</li>)}</ul>
    </div>
  );
}

export function AddQuestions({ step, onStepChange, onRegistered }: Props) {
  const [draft, setDraft] = useState<WordInput>({ word: "", meaning: "" });
  const [cart, setCart] = useState<CartItem[]>([]);
  const nextKey = useRef(0);
  const [bulkText, setBulkText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<AddResult | null>(null);
  const [cartStatus, setCartStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const wordField = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step && step !== "choose") heading.current?.focus();
  }, [step]);

  if (!step) return null;
  function clearFeedback() {
    setErrors([]);
    setResult(null);
    setCartStatus("");
  }
  function go(next: AddStep | null) {
    clearFeedback();
    onStepChange(next);
  }
  if (step === "choose") return <MethodChooser choose={go} cancel={() => go(null)} />;

  const bulk = step === "bulk" ? parseBulk(bulkText) : { entries: [], errors: [] };

  function saveToCart(event: FormEvent) {
    event.preventDefault();
    clearFeedback();
    const entry = trimWordInput(draft);
    const error = checkEntry(entry, new Set(cart.map(({ word }) => word.trim())));
    if (error) {
      setErrors([error]);
      return;
    }
    const item = { ...entry, key: nextKey.current++ };
    setCart((items) => [...items, item]);
    setDraft({ word: "", meaning: "" });
    setCartStatus(`「${entry.word}」をカートに追加しました。`);
    wordField.current?.focus();
  }

  function editCart(key: number, field: keyof WordInput, value: string) {
    clearFeedback();
    setCart((items) => items.map((item) => item.key === key ? { ...item, [field]: value } : item));
  }

  async function submit() {
    if (sending.current) return;
    clearFeedback();
    const isBulk = step === "bulk";
    const entries = isBulk ? bulk.entries : cart.map(trimWordInput);
    if (!isBulk) {
      const seen = new Set<string>();
      const rowErrors: string[] = [];
      entries.forEach((entry, index) => {
        const reason = checkEntry(entry, seen);
        if (reason) rowErrors.push(`${index + 1}件目：${reason}`);
      });
      if (rowErrors.length) {
        setErrors(rowErrors);
        heading.current?.focus();
        return;
      }
    }
    if (entries.length === 0 || (isBulk && bulk.errors.length)) return;
    sending.current = true;
    setBusy(true);
    try {
      const response = await addQuestions(entries);
      const added = new Set(response.added.map(({ word }) => word));
      if (!added.size) {
        setResult(response);
        heading.current?.focus();
        return;
      }
      if (isBulk) {
        setBulkText((text) => response.failed.length
          ? text.split(/\r\n?|\n/).filter((line) => !added.has(line.split(",")[0].trim())).join("\n")
          : "");
      } else {
        setCart((items) => items.filter(({ word }) => !added.has(word.trim())));
      }
      const complete = response.failed.length === 0;
      if (!complete) {
        setResult(response);
        heading.current?.focus();
      }
      await onRegistered(`${added.size}件の単語を登録しました。`, complete);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "単語の登録結果を確認できませんでした。"]);
      heading.current?.focus();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const isCartInput = step === "cart-input";
  const visibleErrors = [...errors, ...bulk.errors];
  const title = isCartInput ? "カートに入力" : step === "cart-review" ? "登録予定のカート" : "一括で入力して追加";
  return (
    <>
      <div className="data-body">
        <header className="data-header"><h1 ref={heading} tabIndex={-1}>{title}</h1></header>
        {visibleErrors.length > 0 && <ul id="add-errors" className="error add-errors" role="alert">
          {visibleErrors.map((message) => <li key={message}>{message}</li>)}
        </ul>}
        {result && <AddFeedback result={result} />}
        {isCartInput && (
          <form className="add-entry-card" onSubmit={saveToCart}>
            <div className="data-pair">
              <label htmlFor="cart-word">英単語
                <input ref={wordField} id="cart-word" placeholder="例：cat" value={draft.word}
                  onChange={(event) => { clearFeedback(); setDraft({ ...draft, word: event.target.value }); }} />
              </label>
              <label htmlFor="cart-meaning">意味
                <input id="cart-meaning" placeholder="例：猫" value={draft.meaning}
                  onChange={(event) => { clearFeedback(); setDraft({ ...draft, meaning: event.target.value }); }} />
              </label>
            </div>
            <button className="data-button data-add" type="submit">カートに追加</button>
            {cartStatus && <p className="add-cart-status" role="status">{cartStatus}</p>}
          </form>
        )}
        {step === "cart-review" && <>
          <p>登録予定：{cart.length}件</p>
          {cart.length === 0 ? <p>カートに単語が入っていません。</p> : <ul className="data-list">
            {cart.map((item, index) => (
              <li key={item.key} className="add-cart-row">
                <div className="data-pair">
                  <label>英単語<input aria-label={`${index + 1}件目の英単語`} value={item.word} disabled={busy}
                    onChange={(event) => editCart(item.key, "word", event.target.value)} /></label>
                  <label>意味<input aria-label={`${index + 1}件目の意味`} value={item.meaning} disabled={busy}
                    onChange={(event) => editCart(item.key, "meaning", event.target.value)} /></label>
                </div>
                <button className="data-button data-cancel-add" disabled={busy} aria-label={`${index + 1}件目を取り消す`}
                  onClick={() => { clearFeedback(); setCart((items) => items.filter(({ key }) => key !== item.key)); }}>取り消す</button>
              </li>
            ))}
          </ul>}
        </>}
        {step === "bulk" && <>
          <label className="add-bulk-label" htmlFor="bulk-words">半角英単語と意味を半角カンマ（,）で区切り、1単語ずつ改行して入力してください。</label>
          <textarea id="bulk-words" rows={6} placeholder={"cat,猫\ndog,犬"} value={bulkText} disabled={busy}
            aria-invalid={bulk.errors.length > 0} aria-describedby={bulk.errors.length ? "add-errors" : undefined}
            onChange={(event) => { clearFeedback(); setBulkText(event.target.value); }} />
          <h2 className="add-preview-title">登録予定（{bulk.entries.length}件）</h2>
          <ul className="data-list">{bulk.entries.map(({ word, meaning }) => (
            <li className="add-preview-row" key={word}><strong>{word}</strong><span>{meaning}</span></li>
          ))}</ul>
        </>}
      </div>
      <footer className={isCartInput ? "data-actions" : "data-actions data-actions-confirm"}>
        <div className="data-exit-actions">
          {!isCartInput && <button type="button" className="data-button" disabled={busy}
            onClick={() => go(null)}>問題管理画面へ</button>}
          <button type="button" className="data-button data-cancel-add" disabled={busy}
            onClick={() => go(step === "cart-review" ? "cart-input" : "choose")}>キャンセル</button>
        </div>
        {isCartInput ? (
          <div className="add-cart-actions"><span>カート：{cart.length}件</span>
            <button type="button" className="data-button data-add" onClick={() => go("cart-review")}>カートへ</button>
          </div>
        ) : (
          <button type="button" className="data-button data-add"
            disabled={busy || (step === "bulk" ? !bulk.entries.length || bulk.errors.length > 0 : !cart.length)}
            onClick={submit}>{busy ? "送信中…" : "追加リクエスト"}</button>
        )}
      </footer>
    </>
  );
}
