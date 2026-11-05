// VITE_* values are public build settings. Never put credentials here.
export function validateApiBaseUrl(value: string, development: boolean): string {
  const base = value.replace(/\/+$/, "");
  const relative = base.startsWith("/") && !base.startsWith("//");
  if (!base || /[\\\s?#]/.test(base) || (!relative && !/^https?:\/\//.test(base))) {
    throw new Error("VITE_API_BASE_URLには/apiまたは安全なHTTP(S)のAPI URLを指定してください。");
  }
  const url = new URL(base, "https://frontend.invalid");
  const localDevelopment = development && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== "https:" && !localDevelopment)) {
    throw new Error("API URLには認証情報・クエリ・フラグメントを含めず、HTTPSを使用してください（ローカル開発を除く）。");
  }
  return base;
}

export function resolveApiBaseUrl(configured: string | undefined, development: boolean): string {
  const base = validateApiBaseUrl(configured ?? "/api", development);
  // The Vite proxy sends development requests to FastAPI without credentialed CORS.
  return development ? "/api" : base;
}
