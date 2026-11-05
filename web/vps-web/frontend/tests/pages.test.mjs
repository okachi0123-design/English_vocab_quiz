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
const { MemoryRouter, useLocation } = await import("react-router-dom");
const { default: App } = await import("../src/App.tsx");
const originalFetch = globalThis.fetch;
let root;
const questions = [{ id: 1, word: "implement" }, { id: 2, word: "review" }];
const result = {
  results: [{ result: "〇" }, { result: "✕", answer: "検討する" }],
  attempt: 2, score: 1, percentage: 50, message: "もう少しです",
};

function Location() {
  const { pathname, search } = useLocation();
  return h("output", { id: "test-path", "data-search": search }, pathname);
}
async function mount(path = "/quiz") {
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById("root"));
  await act(async () => {
    root.render(h(MemoryRouter, { initialEntries: [path] }, h(App), h(Location)));
  });
}
function currentPath() { return document.getElementById("test-path").textContent; }
function text() { return document.body.textContent; }
async function fill(selector, value) {
  const input = document.querySelector(selector);
  assert(input, "Input exists: " + selector);
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}
async function start(count = "2", password = "test-password") {
  await fill('input[type="password"]', password);
  await fill('input[type="number"]', count);
  await act(async () => {
    document.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  });
}
async function grade() {
  await act(async () => document.getElementById("submit-answers").click());
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
});

test("home shows the requested menu and normal login anchor, Coming Soon is disabled", async () => {
  await mount("/");
  assert(text().includes("オリジナル英単語クイズです。挑戦するにはGoogleログインと管理者による利用許可が必要です。"));
  assert.equal(document.querySelector('[role="status"], [role="alert"]'), null);
  const login = document.querySelector('a[href="/api/login"]');
  assert.equal(login.textContent, "Googleでログイン");
  assert.equal(login.getAttribute("target"), null);
  const rows = [...document.querySelector(".home-menu").children];
  assert.equal(rows.length, 4);
  assert.equal(rows[0].textContent, "挑戦する");
  assert(rows[1].textContent.startsWith("前回結果"));
  assert(rows[2].textContent.startsWith("問題追加"));
  assert(rows[3].classList.contains("home-auth-actions"));
  assert.equal(rows[3].children[0], login);
  assert.equal(rows[3].children[1].textContent, "ログアウト");
  const disabled = [...document.querySelectorAll("button:disabled")];
  assert.equal(disabled.length, 2);
  assert(disabled[0].textContent.includes("前回結果"));
  assert(disabled[1].textContent.includes("問題追加"));
  assert(disabled.every((button) => button.textContent.includes("Coming Soon")));
  await act(async () => document.querySelector('a[href="/quiz"]').click());
  assert.equal(currentPath(), "/quiz");
  assert(document.querySelector('input[type="password"]'));
});

test("direct /quiz access starts empty and waits for a successful API response", async () => {
  let requests = 0;
  globalThis.fetch = async () => { requests++; return Response.json({ detail: "ログインしてください" }, { status: 401 }); };
  await mount();
  assert.equal(requests, 0);
  assert.equal(document.querySelector(".question-list"), null);
  await start();
  assert.equal(requests, 1);
  assert.equal(currentPath(), "/");
  assert(text().includes("ログインしてください"));
  assert.equal(document.querySelector(".question-list"), null);
});

for (const method of ["GET", "POST"]) {
  for (const status of [401, 403]) {
    test(method + " " + status + " navigates home with the exact API message and clears quiz data", async () => {
      const message = status === 401 ? "ユーザー情報が登録されていません" : "認証が許可されていません";
      globalThis.fetch = async (_url, options) => {
        if (method === "POST" && options.method !== "POST") return Response.json(questions);
        return Response.json({ detail: message }, { status });
      };
      await mount();
      await start();
      if (method === "POST") {
        assert.equal(document.querySelectorAll(".question-row").length, 2);
        await grade();
      }
      assert.equal(currentPath(), "/");
      assert.equal(document.querySelector('[role="alert"]').textContent, message);
      assert.equal(document.querySelector(".question-list"), null);
      assert(!text().includes("implement"));
      await act(async () => document.querySelector('a[href="/quiz"]').click());
      assert.equal(currentPath(), "/quiz");
      assert.equal(document.querySelector(".question-list"), null);
      assert.equal(document.querySelector('input[type="password"]').value, "");
    });
  }
}

test("API messages are rendered as text, without injecting HTML", async () => {
  const message = '<img src=x onerror="alert(1)">';
  globalThis.fetch = async () => Response.json({ detail: message }, { status: 403 });
  await mount();
  await start();
  assert.equal(currentPath(), "/");
  assert.equal(document.querySelector('[role="alert"]').textContent, message);
  assert.equal(document.querySelector("img"), null);
});

for (const method of ["GET", "POST"]) {
  for (const failure of ["500", "network", "password"]) {
    test(method + " " + failure + " stays on quiz with a specific error and allows retry", async () => {
      globalThis.fetch = async (_url, options) => {
        if (method === "POST" && options.method !== "POST") return Response.json(questions);
        if (failure === "network") throw new TypeError("Failed to fetch");
        if (failure === "password") return Response.json("パスワードが正しくありません");
        return new Response("Internal Server Error", { status: 500 });
      };
      await mount();
      await start();
      if (method === "POST") await grade();
      assert.equal(currentPath(), "/quiz");
      const expected = { "500": "HTTP 500", network: "接続できません", password: "パスワードが正しくありません" }[failure];
      assert(document.querySelector('[role="alert"]').textContent.includes(expected));
      if (method === "POST") {
        assert.equal(document.querySelectorAll(".question-row").length, 2);
        assert.equal(document.getElementById("submit-answers").disabled, false);
      } else {
        assert.equal(document.querySelector(".question-list"), null);
        assert.equal(document.querySelector('button[type="submit"]').disabled, false);
      }
    });
  }
}

test("question count, answers, grading results and retry preserve the existing flow", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    return Response.json(options.method === "POST" ? result : questions);
  };
  await mount();
  await start("3");
  assert.equal(calls[0].url, "/api/quiz?attempt_count=3");
  assert.equal(calls[0].headers["enterd-password"], "test-password");
  assert.equal(calls[0].credentials, "include");
  assert(text().includes("2問を出題"));
  await fill("#answer-0", "実行する");
  await fill("#answer-1", "間違い");
  await grade();
  assert.equal(calls[1].credentials, "include");
  assert.deepEqual(JSON.parse(calls[1].body), [{ id: 1, meaning: "実行する" }, { id: 2, meaning: "間違い" }]);
  assert.equal(calls[1].headers["enterd-password"], "test-password");
  assert(text().includes("2問中 1問正解"));
  assert(text().includes("正解：検討する"));
  assert.equal(document.querySelectorAll(".question-row.correct").length, 1);
  assert.equal(document.querySelectorAll(".question-row.incorrect").length, 1);
  await act(async () => document.querySelector(".result-summary button").click());
  assert.equal(currentPath(), "/quiz");
  assert.equal(document.querySelector(".question-list"), null);
  assert.equal(document.querySelector('input[type="password"]').value, "");
  assert.equal(window.localStorage.length, 0);
  assert.equal(window.sessionStorage.length, 0);
});

test("invalid form count preserves validation and sends no request", async () => {
  globalThis.fetch = async () => assert.fail("Invalid form must not request questions");
  await mount();
  await start("100");
  assert(text().includes("問題数は1〜99の整数"));
  assert.equal(document.querySelector(".question-list"), null);
});


const authResultCases = [
  ["allowed", "ログインに成功しました。"],
  ["denied", "アプリの利用が許可されていません。"],
  ["requested", "ユーザー情報を送信しました。管理者の許可をお待ちください。"],
  ["data_failed", "正確なユーザー情報の取得に失敗しました。"],
  ["google_request_failed", "Googleからユーザー情報を取得できませんでした。"],
];

for (const [authResult, message] of authResultCases) {
  test("redirect landing auth_result=" + authResult + " shows the exact message", async () => {
    globalThis.fetch = async () => assert.fail("Displaying a callback result must not request quiz data");
    await mount("/?auth_result=" + authResult);
    assert.equal(currentPath(), "/");
    const role = authResult === "allowed" ? "status" : "alert";
    const notice = document.querySelector('[role="' + role + '"]');
    assert.equal(notice.textContent, message);
    assert.equal(notice.classList.contains("error"), authResult !== "allowed");
    assert(document.querySelector('a[href="/api/login"]'));
    assert.equal(document.querySelectorAll("button:disabled").length, 2);
    assert.equal(document.querySelector(".question-list"), null);
  });
}

for (const query of [
  "auth_result=",
  "auth_result=unknown",
  "auth_result=__proto__",
  "auth_result=constructor",
  "auth_result=toString",
  "auth_result=" + encodeURIComponent('<img src=x onerror="alert(1)">'),
  "other=allowed",
]) {
  test("unrecognized callback query keeps the normal home page: " + query, async () => {
    await mount("/?" + query);
    assert.equal(currentPath(), "/");
    assert.equal(document.querySelector('[role="status"], [role="alert"]'), null);
    assert(document.querySelector('a[href="/quiz"]'));
    assert.equal(document.querySelector("img"), null);
  });
}

test("callback message disappears after navigating away and returning without the query", async () => {
  await mount("/?auth_result=allowed");
  assert.equal(document.querySelector('[role="status"]').textContent, "ログインに成功しました。");
  await act(async () => document.querySelector('a[href="/quiz"]').click());
  assert.equal(currentPath(), "/quiz");
  await act(async () => document.querySelector(".back-link").click());
  assert.equal(currentPath(), "/");
  assert.equal(document.querySelector('[role="status"], [role="alert"]'), null);
});

test("existing quiz authentication errors take priority over a callback success query", async () => {
  await mount({ pathname: "/", search: "?auth_result=allowed", state: { authError: "ログインしてください" } });
  assert.equal(document.querySelector('[role="alert"]').textContent, "ログインしてください");
  assert.equal(document.querySelector('[role="status"]'), null);
});

test("allowed query only displays a message and does not bypass API authentication", async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return Response.json({ detail: "ログインしてください" }, { status: 401 });
  };
  await mount("/?auth_result=allowed");
  assert.equal(requests, 0);
  assert.equal(window.localStorage.length, 0);
  assert.equal(window.sessionStorage.length, 0);
  await act(async () => document.querySelector('a[href="/quiz"]').click());
  await start();
  assert.equal(requests, 1);
  assert.equal(currentPath(), "/");
  assert.equal(document.querySelector('[role="alert"]').textContent, "ログインしてください");
  assert.equal(document.querySelector('[role="status"]'), null);
  assert.equal(document.querySelector(".question-list"), null);
});


test("logout click posts once then replaces the URL query and clears earlier authentication errors", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    return { type: "opaqueredirect", status: 0 };
  };
  await mount({ pathname: "/", state: { authError: "ログインしてください" } });
  await act(async () => document.querySelector(".home-auth-actions button").click());
  assert.deepEqual(calls, [{ url: "/api/logout", method: "POST", credentials: "include", redirect: "manual" }]);
  assert.equal(document.getElementById("test-path").dataset.search, "?status=logouted");
  assert.equal(document.querySelector('[role="status"]').textContent, "ログアウトしました");
  assert.equal(document.querySelector('[role="alert"]'), null);
});

test("logout disables repeated clicks and waits for the API before reporting success", async () => {
  let finish;
  let requests = 0;
  globalThis.fetch = () => {
    requests++;
    return new Promise((resolve) => { finish = resolve; });
  };
  await mount("/");
  await act(async () => document.querySelector(".home-auth-actions button").click());
  const button = document.querySelector(".home-auth-actions button");
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, "ログアウト中…");
  assert.equal(document.querySelector('[role="status"]'), null);
  await act(async () => button.click());
  assert.equal(requests, 1);
  await act(async () => finish({ type: "opaqueredirect", status: 0 }));
  assert.equal(button.disabled, false);
  assert.equal(document.querySelector('[role="status"]').textContent, "ログアウトしました");
});

for (const failure of [401, 403, 500, "network"]) {
  test("logout failure " + failure + " shows an error without a success query and allows retry", async () => {
    globalThis.fetch = async () => {
      if (failure === "network") throw new TypeError("Failed to fetch");
      return Response.json({ detail: "ログアウトの認証エラー" }, { status: failure });
    };
    await mount("/");
    await act(async () => document.querySelector(".home-auth-actions button").click());
    const expected = failure === "network" ? "接続できません" : failure === 500 ? "HTTP 500" : "ログアウトの認証エラー";
    assert(document.querySelector('[role="alert"]').textContent.includes(expected));
    assert.equal(document.getElementById("test-path").dataset.search, "");
    assert.equal(document.querySelector('[role="status"]'), null);
    assert.equal(document.querySelector(".home-auth-actions button").disabled, false);
    globalThis.fetch = async () => ({ type: "opaqueredirect", status: 0 });
    await act(async () => document.querySelector(".home-auth-actions button").click());
    assert.equal(document.querySelector('[role="alert"]'), null);
    assert.equal(document.querySelector('[role="status"]').textContent, "ログアウトしました");
  });
}

test("the backend logout query displays the exact message ahead of an older login result", async () => {
  globalThis.fetch = async () => assert.fail("A logout landing query must not request the API");
  await mount("/?status=logouted&auth_result=allowed");
  assert.equal(document.querySelector('[role="status"]').textContent, "ログアウトしました");
  assert.equal(document.querySelector('[role="alert"]'), null);
});

for (const status of ["", "unknown"]) {
  test("unrecognized logout status does not display a success message: " + status, async () => {
    await mount("/?status=" + status);
    assert.equal(document.querySelector('[role="status"], [role="alert"]'), null);
  });
}

test("logout message disappears after navigating away and returning without its query", async () => {
  await mount("/?status=logouted");
  assert.equal(document.querySelector('[role="status"]').textContent, "ログアウトしました");
  await act(async () => document.querySelector('a[href="/quiz"]').click());
  await act(async () => document.querySelector(".back-link").click());
  assert.equal(document.querySelector('[role="status"], [role="alert"]'), null);
});

test("logout query does not bypass quiz authentication", async () => {
  globalThis.fetch = async () => Response.json({ detail: "ログインしてください" }, { status: 401 });
  await mount("/?status=logouted");
  await act(async () => document.querySelector('a[href="/quiz"]').click());
  await start();
  assert.equal(currentPath(), "/");
  assert.equal(document.querySelector('[role="alert"]').textContent, "ログインしてください");
  assert.equal(document.querySelector('[role="status"]'), null);
  assert.equal(document.querySelector(".question-list"), null);
});
