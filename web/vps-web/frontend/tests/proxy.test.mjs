import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { createServer as createViteServer } from "vite";
import makeConfig from "../vite.config.ts";

test("real Vite proxy forwards login/logout redirects, session cookies and existing GET/POST routes", async () => {
  const requests = [];
  const backend = createHttpServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      requests.push({ url: request.url, method: request.method, headers: request.headers, body });
      if (request.url === "/api/login") {
        response.writeHead(302, {
          Location: "https://accounts.google.com/o/oauth2/v2/auth?fixture=true",
          "Set-Cookie": "session=test-session; HttpOnly; Path=/; SameSite=Lax",
        });
        response.end();
      } else if (request.url === "/api/logout" && request.method === "POST") {
        response.writeHead(307, {
          Location: "http://localhost:5173/?status=logouted",
          "Set-Cookie": "session=null; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
        });
        response.end();
      } else {
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(request.method === "POST"
          ? { results: [{ result: "〇" }], attempt: 1, score: 1, percentage: 100, message: "正解" }
          : [{ id: 1, word: "implement" }]));
      }
    });
  });
  backend.listen(0, "127.0.0.1");
  await once(backend, "listening");
  const originalBase = process.env.VITE_API_BASE_URL;
  process.env.VITE_API_BASE_URL = `http://127.0.0.1:${backend.address().port}/api`;
  let vite;
  let frontend;
  try {
    const config = makeConfig({ command: "serve", mode: "development" });
    vite = await createViteServer({
      ...config, configFile: false, logLevel: "silent",
      server: { ...config.server, middlewareMode: true },
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    frontend = createHttpServer(vite.middlewares);
    frontend.listen(0, "127.0.0.1");
    await once(frontend, "listening");
    const origin = `http://127.0.0.1:${frontend.address().port}`;
    const login = await fetch(origin + "/api/login", { redirect: "manual" });
    assert.equal(login.status, 302);
    assert.equal(login.headers.get("location"), "https://accounts.google.com/o/oauth2/v2/auth?fixture=true");
    assert(login.headers.get("set-cookie").includes("session=test-session"));
    await login.text();
    const headers = { Cookie: "session=test-session", "enterd-password": "test-password" };
    const get = await fetch(origin + "/api/quiz?attempt_count=1", { headers });
    assert.equal(get.status, 200);
    assert.deepEqual(await get.json(), [{ id: 1, word: "implement" }]);
    const answers = [{ id: 1, meaning: "実行する" }];
    const post = await fetch(origin + "/api/quiz", {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(answers),
    });
    assert.equal(post.status, 200);
    assert.equal((await post.json()).score, 1);
    const logout = await fetch(origin + "/api/logout", {
      method: "POST", headers: { Cookie: "session=test-session" }, redirect: "manual",
    });
    assert.equal(logout.status, 307);
    assert.equal(logout.headers.get("location"), "http://localhost:5173/?status=logouted");
    assert.match(logout.headers.get("set-cookie"), /session=null;.*Expires=Thu, 01 Jan 1970/);
    await logout.text();
    assert.equal(requests[3].headers.cookie, "session=test-session");
    assert.equal(requests[3].headers["enterd-password"], undefined);
    assert.equal(requests[3].body, "");
    assert.deepEqual(requests.map(({ url, method }) => [method, url]), [
      ["GET", "/api/login"], ["GET", "/api/quiz?attempt_count=1"], ["POST", "/api/quiz"], ["POST", "/api/logout"],
    ]);
    assert.equal(requests[1].headers.cookie, "session=test-session");
    assert.equal(requests[2].headers.cookie, "session=test-session");
    assert.equal(requests[1].headers["enterd-password"], "test-password");
    assert.equal(requests[2].headers["enterd-password"], "test-password");
    assert.deepEqual(JSON.parse(requests[2].body), answers);
    // FastAPI request.url_for must see its own host, keeping the registered callback on port 8000 in normal development.
    assert.equal(requests[0].headers.host, `127.0.0.1:${backend.address().port}`);
  } finally {
    if (originalBase === undefined) delete process.env.VITE_API_BASE_URL;
    else process.env.VITE_API_BASE_URL = originalBase;
    if (frontend) await new Promise((resolve, reject) => frontend.close((error) => error ? reject(error) : resolve()));
    if (vite) await vite.close();
    await new Promise((resolve, reject) => backend.close((error) => error ? reject(error) : resolve()));
  }
});
