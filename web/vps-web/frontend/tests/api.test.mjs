import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { fetchQuestions, submitAnswers, logout, QuizApiError, LOGIN_URL } from "../src/api/quizApi.ts";
import { resolveApiBaseUrl, validateApiBaseUrl } from "../src/api/apiConfig.ts";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const questions = [{ id: 1, word: "implement" }];
const answers = [{ id: 1, meaning: "実行する" }];
const result = { results: [{ result: "〇" }], attempt: 1, score: 1, percentage: 100, message: "正解です" };
const operations = [
  ["GET", () => fetchQuestions(2, "test-password")],
  ["POST", () => submitAnswers(answers, "test-password")],
];

test("logout posts with cookies and stops the backend 307 redirect", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/logout");
    assert.deepEqual(options, { method: "POST", credentials: "include", redirect: "manual" });
    return new Response(null, { status: 307, headers: { Location: "http://localhost:5173/?status=logouted" } });
  };
  assert.equal(await logout(), undefined);
});

test("logout accepts the opaque redirect exposed by browsers", async () => {
  globalThis.fetch = async () => ({ type: "opaqueredirect", status: 0 });
  assert.equal(await logout(), undefined);
});

for (const status of [401, 403, 500, 200]) {
  test("logout does not report success for HTTP " + status, async () => {
    globalThis.fetch = async () => Response.json({ detail: "認証エラー" }, { status });
    await assert.rejects(logout, (error) => {
      assert(error instanceof QuizApiError);
      if (status === 401 || status === 403) {
        assert.equal(error.status, status);
        assert.equal(error.message, "認証エラー");
      } else {
        assert.equal(error.isAuthenticationError, false);
      }
      return true;
    });
  });
}

test("logout network failure remains a retryable connection error", async () => {
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(logout, /接続できません/);
});

test("development and production login endpoints use a fixed API path", () => {
  assert.equal(resolveApiBaseUrl("http://localhost:8000/api", true) + "/login", "/api/login");
  assert.equal(resolveApiBaseUrl(undefined, true) + "/login", "/api/login");
  assert.equal(resolveApiBaseUrl("/api", false) + "/login", "/api/login");
  assert.equal(resolveApiBaseUrl("https://api.example.test/api/", false) + "/login", "https://api.example.test/api/login");
  assert.equal(LOGIN_URL, "/api/login");
});

for (const value of ["javascript:alert(1)", "data:text/html,x", "//evil.example/api", "/\\evil.example/api",
  "https://user:pass@example.test/api", "https://example.test/api?redirect=x", "/api#", "/api?",
  "http://example.test/api", "", "https://example.test/api\n"]) {
  test("reject unsafe API base " + JSON.stringify(value), () => {
    assert.throws(() => validateApiBaseUrl(value, false));
  });
}

test("GET preserves count, password header, cookies and question shape", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/quiz?attempt_count=2");
    assert.equal(options.credentials, "include");
    assert.equal(options.headers["enterd-password"], "test-password");
    return Response.json(questions);
  };
  assert.deepEqual(await fetchQuestions(2, "test-password"), questions);
});

test("POST preserves answers, password header, cookies and grading shape", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/quiz");
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "include");
    assert.equal(options.headers["enterd-password"], "test-password");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), answers);
    return Response.json(result);
  };
  assert.deepEqual(await submitAnswers(answers, "test-password"), result);
});

for (const [method, operation] of operations) {
  for (const status of [401, 403]) {
    test(method + " " + status + " retains FastAPI detail and authentication status", async () => {
      const message = status === 401 ? "ログインしてください" : "認証が許可されていません";
      globalThis.fetch = async () => Response.json({ detail: message }, { status });
      await assert.rejects(operation, (error) => {
        assert(error instanceof QuizApiError);
        assert.equal(error.status, status);
        assert.equal(error.message, message);
        assert.equal(error.isAuthenticationError, true);
        return true;
      });
    });
    test(method + " non-JSON " + status + " still has authentication status and a fallback", async () => {
      globalThis.fetch = async () => new Response("<html>Error</html>", { status });
      await assert.rejects(operation, (error) => error.isAuthenticationError && error.status === status && error.message.length > 0);
    });
  }

  test(method + " 500 is separate from authentication and hides internal server details", async () => {
    globalThis.fetch = async () => Response.json({ detail: "internal-secret-fixture" }, { status: 500 });
    await assert.rejects(operation, (error) => {
      assert.equal(error.isAuthenticationError, false);
      assert.equal(error.status, 500);
      assert.match(error.message, /サーバー.*HTTP 500/);
      assert(!error.message.includes("internal-secret-fixture"));
      return true;
    });
  });

  test(method + " network errors remain separate from authentication", async () => {
    globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
    await assert.rejects(operation, (error) => !error.isAuthenticationError && error.message.includes("接続できません"));
  });

  test(method + " legacy password rejection stays a password error", async () => {
    globalThis.fetch = async () => Response.json("パスワードが正しくありません");
    await assert.rejects(operation, (error) => !error.isAuthenticationError && error.message === "パスワードが正しくありません");
  });

  test(method + " invalid successful JSON is rejected", async () => {
    globalThis.fetch = async () => Response.json({ unexpected: true });
    await assert.rejects(operation, /予期しないレスポンス/);
  });
}

test("invalid question counts do not send a request", async () => {
  globalThis.fetch = async () => assert.fail("Invalid counts must not reach the API");
  for (const count of [0, 100, 1.5, NaN]) {
    await assert.rejects(() => fetchQuestions(count, "test-password"), /問題数/);
  }
});

test("grading result length must match the submitted answer count", async () => {
  globalThis.fetch = async () => Response.json({ ...result, results: [] });
  await assert.rejects(() => submitAnswers(answers, "test-password"), /予期しないレスポンス/);
});
