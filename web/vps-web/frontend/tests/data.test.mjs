import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:5173" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};
const { createElement: h, act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { default: App } = await import("../src/App.tsx");

const originalFetch = globalThis.fetch;
const cat = { uid: 72191, id: 95231, word: "cat", meaning: "猫" };
const dog = { ...cat, id: 61829, word: "dog", meaning: "犬" };
let root;

function mockApi(respond) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const method = options.method ?? "GET";
    const body = options.body === undefined ? undefined : JSON.parse(options.body);
    calls.push({ url, method, body, credentials: options.credentials });
    return respond(method, body);
  };
  return calls;
}

async function mount(path = "/data") {
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById("root"));
  await act(async () => root.render(h(MemoryRouter, { initialEntries: [path] }, h(App))));
}
function button(label, index = 0) {
  const matches = [...document.querySelectorAll("button")].filter(
    (item) => item.textContent.trim() === label,
  );
  assert(matches[index], "Button exists: " + label);
  return matches[index];
}
async function click(label, index = 0) {
  await act(async () => button(label, index).click());
}
async function type(input, value) {
  assert(input, "Input is present");
  await act(async () => {
    const { set } = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
    set.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}
function page() { return document.body.textContent; }
function methods(calls) { return calls.map((request) => request.method); }
async function toggleWord(index) {
  await act(async () => document.querySelectorAll('input[type="checkbox"]')[index].click());
}

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
});

test("the home management link fetches the signed-in user's empty list and offers both actions", async () => {
  const calls = mockApi(() => Response.json([]));
  await mount("/");
  const link = document.querySelector('a[href="/data"]');
  assert.equal(link.textContent.trim(), "問題管理");
  await act(async () => link.click());
  assert.match(page(), /まだデータが登録されていません/);
  const nav = document.querySelector(".data-nav");
  assert.match(nav.querySelector('a[href="/"]').textContent, /ホームへ/);
  assert.equal(nav.querySelector("h1").textContent, "問題管理");
  assert.deepEqual([...nav.querySelectorAll(".data-tools > button")].map((item) => item.textContent), ["追加", "削除"]);
  assert.doesNotMatch(page(), /一覧を再取得|再試行/);
  assert.equal(button("追加").disabled, false);
  assert.deepEqual(calls, [{ url: "/api/data", method: "GET", credentials: "include", body: undefined }]);
});

test("a failed GET is retryable and does not display an empty list", async () => {
  let offline = true;
  const calls = mockApi(() => {
    if (offline) throw new TypeError("offline");
    return Response.json([cat]);
  });
  await mount();
  assert(document.querySelector('[role="alert"]'));
  assert.doesNotMatch(page(), /まだデータが登録されていません/);
  offline = false;
  await click("再試行");
  assert.match(page(), /cat/);
  assert.doesNotMatch(page(), /72191|95231/);
  assert.deepEqual(methods(calls), ["GET", "GET"]);
});

test("HTTP 200 missing edit target keeps changes; retry posts only the ID and edited fields", async () => {
  let replaced = false;
  let fail = true;
  const calls = mockApi((method) => {
    if (method === "GET") return Response.json(replaced ? [{ ...cat, word: "kitten", meaning: "サーバーの最新値" }] : [cat]);
    if (fail) return Response.json("データに異常があります");
    replaced = true;
    return Response.json(["テーブルがアップデートされました", cat.id, "kitten"]);
  });
  await mount();
  await click("変更");
  const [word, meaning] = document.querySelectorAll("input");
  assert.equal(word.value, "cat");
  assert.equal(meaning.value, "猫");
  await type(word, "kitten");
  await type(meaning, "子猫");
  await click("キャンセル");
  await click("変更");
  await click("変更を確定");
  assert.match(page(), /データに異常があります/);
  assert.deepEqual([...document.querySelectorAll("input")].map((input) => input.value), ["kitten", "子猫"]);
  fail = false;
  await click("変更を確定");
  assert.match(page(), /サーバーの最新値/);
  assert.deepEqual(methods(calls), ["GET", "PUT", "PUT", "GET"]);
  assert.deepEqual(calls[1].body, { id: cat.id, word: "kitten", meaning: "子猫" });
  assert.deepEqual(calls[1], calls[2]);
  assert(calls.every((request) => request.credentials === "include"));
});

test("delete confirmation offers local return actions and preserves the pending list on failure", async () => {
  let fail = true;
  let finishFailedDelete;
  let deleted = false;
  let refreshFailed = false;
  const calls = mockApi((method) => {
    if (method === "GET") {
      if (deleted && !refreshFailed) {
        refreshFailed = true;
        throw new TypeError("offline");
      }
      return Response.json(deleted ? [{ ...cat, meaning: "再取得した意味" }] : [cat, dog]);
    }
    if (fail) return new Promise(resolve => { finishFailedDelete = resolve; });
    deleted = true;
    return Response.json(["以下の問題が削除されました", ["dog"]]);
  });
  await mount();
  await click("削除");
  await toggleWord(0);
  await toggleWord(1);
  await click("確認画面へ");
  assert.match(page(), /削除予定リスト/);
  const cancel = button("キャンセル");
  const actions = cancel.closest(".data-actions-confirm");
  assert.equal(actions.firstElementChild, cancel.parentElement);
  assert.equal(button("問題管理画面へ").nextElementSibling, cancel);
  assert.equal(actions.lastElementChild, button("削除"));
  assert.equal(button("✕").getAttribute("aria-label"), "catを削除予定から外す");
  await click("✕");
  await click("キャンセル");
  assert.deepEqual([...document.querySelectorAll('input[type="checkbox"]')].map((input) => input.checked), [false, true]);
  const selectionCancel = button("キャンセル");
  const [leftActions, rightActions] = selectionCancel.closest("footer").children;
  assert(leftActions.contains(selectionCancel));
  assert.equal(button("確認画面へ").parentElement, rightActions);
  assert.match(rightActions.textContent, /選択数：1件/);
  await click("キャンセル");
  assert.equal(document.querySelector(".data-nav h1").textContent, "問題管理");
  assert.deepEqual(methods(calls), ["GET"]);
  await click("削除");
  await click("確認画面へ");
  await click("問題管理画面へ");
  assert.equal(document.querySelector(".data-nav h1").textContent, "問題管理");
  assert.deepEqual(methods(calls), ["GET"]);
  await click("削除");
  await click("確認画面へ");
  await click("削除");
  assert.equal(button("問題管理画面へ").disabled, true);
  assert.equal(button("キャンセル").disabled, true);
  await act(async () => finishFailedDelete(Response.json("データが削除されませんでした")));
  assert.match(page(), /データが削除されませんでした/);
  assert.match(page(), /dog/);
  assert.match(page(), /削除予定リスト/);
  fail = false;
  await click("削除");
  await click("再試行");
  assert.match(page(), /再取得した意味/);
  assert.doesNotMatch(document.querySelector(".data-list").textContent, /dog/);
  assert.deepEqual(methods(calls), ["GET", "DELETE", "DELETE", "GET", "GET"]);
  assert.deepEqual(calls[1].body, [dog.id]);
  assert.deepEqual(calls[1], calls[2]);
});

test("when only some selected IDs still exist, DELETE reports its actual count and reloads", async () => {
  let deleted = false;
  const calls = mockApi((method) => {
    if (method === "GET") return Response.json(deleted ? [] : [cat, dog]);
    deleted = true;
    return Response.json(["以下の問題が削除されました", ["cat"]]);
  });
  await mount();
  await click("削除");
  await toggleWord(0);
  await toggleWord(1);
  await click("確認画面へ");
  await click("削除");
  assert.match(document.querySelector('[role="status"]').textContent, /1件削除.*1件は見つかりません/);
  assert.match(page(), /まだデータが登録されていません/);
  assert.deepEqual(methods(calls), ["GET", "DELETE", "GET"]);
  assert.deepEqual(calls[1].body, [cat.id, dog.id]);
});

const cartMode = "1つずつカートに入力して追加";
const bulkMode = "一括で入力して追加";
const success = (word) => ({ word, message: "単語が追加されました" });
const duplicate = (word) => ({ word, message: "同一単語が存在します" });

test("both submission screens offer a direct return above cancel without fetching or discarding drafts", async () => {
  const calls = mockApi(() => Response.json([cat]));
  await mount();
  await click("追加");
  await click(cartMode);
  assert.doesNotMatch(page(), /問題管理画面へ/);
  await type(document.querySelector("#cart-word"), "dog");
  await type(document.querySelector("#cart-meaning"), "犬");
  await click("カートに追加");
  await click("カートへ");
  assert.equal(button("問題管理画面へ").nextElementSibling, button("キャンセル"));
  assert(button("キャンセル").closest(".data-actions-confirm"));
  await click("問題管理画面へ");
  assert.equal(document.querySelector(".data-nav h1").textContent, "問題管理");
  assert.equal(document.activeElement, button("追加"));
  assert.deepEqual(methods(calls), ["GET"]);

  await click("追加");
  await click(bulkMode);
  await type(document.querySelector("#bulk-words"), "apple,リンゴ");
  assert.equal(button("問題管理画面へ").nextElementSibling, button("キャンセル"));
  assert(button("キャンセル").closest(".data-actions-confirm"));
  await click("キャンセル");
  await click(bulkMode);
  assert.equal(document.querySelector("#bulk-words").value, "apple,リンゴ");
  await click("問題管理画面へ");
  assert.equal(document.querySelector(".data-nav h1").textContent, "問題管理");
  assert.equal(document.activeElement, button("追加"));
  assert.deepEqual(methods(calls), ["GET"]);

  await click("追加");
  await click(bulkMode);
  assert.equal(document.querySelector("#bulk-words").value, "apple,リンゴ");
  await click("キャンセル");
  await click(cartMode);
  await click("カートへ");
  assert.equal(document.querySelector('[aria-label="1件目の英単語"]').value, "dog");
  assert.deepEqual(methods(calls), ["GET"]);
});

test("cart validation, changes and removal stay local; an incomplete API response keeps every draft", async () => {
  let incomplete = true;
  let added = false;
  const calls = mockApi((method) => {
    if (method === "GET") return Response.json(added ? [cat, dog] : [cat]);
    if (incomplete) return Response.json([[], []]);
    added = true;
    return Response.json([[success("dog")], []]);
  });
  await mount();
  await click("追加");
  await click(cartMode);
  async function addToCart(word, meaning) {
    await type(document.querySelector("#cart-word"), word);
    await type(document.querySelector("#cart-meaning"), meaning);
    await click("カートに追加");
  }
  await addToCart("owls", "フクロウ");
  await addToCart("owls", "重複");
  assert.match(document.querySelector('[role="alert"]').textContent, /重複/);
  await addToCart("bird", "鳥");
  await click("カートへ");
  assert.equal(document.querySelectorAll("li").length, 2);
  await type(document.querySelector('[aria-label="1件目の英単語"]'), "bird");
  await click("追加リクエスト");
  assert.match(document.querySelector('[role="alert"]').textContent, /重複/);
  await type(document.querySelector('[aria-label="1件目の英単語"]'), "dog");
  await type(document.querySelector('[aria-label="1件目の意味"]'), "犬");
  await click("取り消す", 1);
  await click("キャンセル");
  await click("カートへ");
  assert.deepEqual(methods(calls), ["GET"]);
  await click("追加リクエスト");
  assert.match(document.querySelector('[role="alert"]').textContent, /処理結果を確認できません/);
  assert.equal(document.querySelector('[aria-label="1件目の英単語"]').value, "dog");
  assert.equal(document.querySelector('[aria-label="1件目の意味"]').value, "犬");
  incomplete = false;
  await click("追加リクエスト");
  assert.match(document.querySelector('[role="status"]').textContent, /登録しました/);
  assert.match(document.querySelector(".data-list").textContent, /dog犬/);
  assert.deepEqual(methods(calls), ["GET", "POST", "POST", "GET"]);
  assert.deepEqual(calls[1].body, [{ word: "dog", meaning: "犬" }]);
  assert.deepEqual(calls[2], calls[1]);
});

test("bulk partial success keeps only rejected rows; the other cart and local drafts survive", async () => {
  const rows = [cat];
  const calls = mockApi((method, body) => {
    if (method === "GET") return Response.json(rows);
    const successes = [], failures = [];
    for (const item of body) {
      if (rows.some((row) => row.word === item.word)) failures.push(duplicate(item.word));
      else {
        rows.push({ ...item, id: rows.length + 1, uid: cat.uid });
        successes.push(success(item.word));
      }
    }
    return Response.json([successes, failures]);
  });
  await mount();
  await click("追加");
  await click(cartMode);
  await type(document.querySelector("#cart-word"), "owl");
  await type(document.querySelector("#cart-meaning"), "フクロウ");
  await click("カートに追加");
  await click("キャンセル");
  await click(bulkMode);
  const bulk = () => document.querySelector("#bulk-words");
  await type(bulk(), "dog,犬\ninvalid\n dog ,重複");
  assert.match(page(), /2行目|行\s*2/);
  assert.match(page(), /3行目|行\s*3/);
  await click("追加リクエスト");
  assert.deepEqual(methods(calls), ["GET"]);
  await type(bulk(), " dog , 犬 \n\n cat , 猫 ");
  await click("追加リクエスト");
  assert.deepEqual(calls[1].body, [{ word: "dog", meaning: "犬" }, { word: "cat", meaning: "猫" }]);
  assert.deepEqual(methods(calls), ["GET", "POST", "GET"]);
  assert.match(document.querySelector(".add-feedback").textContent, /登録成功（1件）.*dog/);
  assert.match(document.querySelector(".add-feedback").textContent, /登録失敗（1件）.*cat：同一単語が存在します/);
  assert.match(bulk().value, /cat/);
  assert.doesNotMatch(bulk().value, /dog/);
  await click("追加リクエスト");
  assert.match(bulk().value, /cat/);
  assert.match(document.querySelector(".add-feedback").textContent, /登録失敗（1件）.*cat：同一単語が存在します/);
  assert.doesNotMatch(document.querySelector(".add-feedback").textContent, /登録成功/);
  assert.deepEqual(methods(calls), ["GET", "POST", "GET", "POST"]);
  await click("問題管理画面へ");
  assert.match(document.querySelector(".data-list").textContent, /dog犬/);
  assert.deepEqual(methods(calls), ["GET", "POST", "GET", "POST"]);
  await click("追加");
  await click(cartMode);
  await click("カートへ");
  assert([...document.querySelectorAll("input")].some((input) => input.value === "owl"));
  await click("追加リクエスト");
  assert.deepEqual(calls.at(-2).body, [{ word: "owl", meaning: "フクロウ" }]);
  assert.equal(calls.at(-1).method, "GET");
  await click("追加");
  await click(bulkMode);
  assert.match(bulk().value, /cat/);
});

test("the first registration starts from an empty list and displays the word from the refreshed GET", async () => {
  const firstWord = { id: 1, uid: cat.uid, word: "apple", meaning: "リンゴ" };
  let saved = false;
  const calls = mockApi((method) => {
    if (method === "GET") return Response.json(saved ? [firstWord] : []);
    saved = true;
    return Response.json([[success("apple")], []]);
  });
  await mount();
  assert.match(page(), /まだデータが登録されていません/);
  await click("追加");
  await click(bulkMode);
  await type(document.querySelector("#bulk-words"), "apple,リンゴ");
  await click("追加リクエスト");
  assert.match(document.querySelector('[role="status"]').textContent, /登録しました/);
  assert.match(document.querySelector(".data-list").textContent, /appleリンゴ/);
  assert.deepEqual(methods(calls), ["GET", "POST", "GET"]);
  assert.deepEqual(calls[1].body, [{ word: "apple", meaning: "リンゴ" }]);
});

test("a lost registration response preserves the draft and prevents concurrent POSTs", async () => {
  let rejectRequest;
  const calls = mockApi((method) => {
    if (method === "GET") return Response.json([]);
    return new Promise((_resolve, reject) => { rejectRequest = reject; });
  });
  await mount();
  await click("追加");
  await click(bulkMode);
  const draft = "apple,リンゴ";
  await type(document.querySelector("#bulk-words"), draft);
  const sendButton = button("追加リクエスト");
  await act(async () => { sendButton.click(); sendButton.click(); });
  assert.deepEqual(methods(calls), ["GET", "POST"]);
  assert.equal(button("キャンセル").disabled, true);
  assert.equal(button("問題管理画面へ").disabled, true);
  await act(async () => rejectRequest(new TypeError("offline")));
  assert.equal(document.querySelector("#bulk-words").value, draft);
  assert(document.querySelector('[role="alert"]'));
  assert.equal(button("追加リクエスト").disabled, false);
});
