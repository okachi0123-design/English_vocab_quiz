# English Vocab Quiz Frontend

FastAPIのクイズAPIに接続するReactフロントエンドです。バックエンドは変更していません。

## 起動と接続先

Node.js 20.6以降を使用してください（既存のReact Routerの要求はNode.js 20以降）。
今回の検証には既存のNode.js 26.12.1を使用しました。

```bash
cd web/vps-web/frontend
cp .env.example .env
npm ci
npm run dev
```

開発時はReactを **http://localhost:5173**、FastAPIを **http://localhost:8000** で起動します。
両方とも同じホスト名の `localhost` を使用し、`127.0.0.1` と混在させないでください。
Cookieはポートを区別しませんが、ホスト名が違うと共有されません。

`.env` の公開設定 `VITE_API_BASE_URL=http://localhost:8000/api` をViteの転送先として使います。
ブラウザからのログイン・クイズ通信は `/api` に送り、開発時だけViteがFastAPIへ転送します。
これにより、既存バックエンドのCookie付きCORSが無効でも開発できます。
`VITE_API_BASE_URL` が未設定または `/api` の場合も、開発時の転送先は `http://localhost:8000/api` です。
既存の `vite.config.js` との競合を避けるため、npmスクリプトでは `vite.config.ts` を明示しています。

本番では `.env.production` に `VITE_API_BASE_URL=/api` を設定してビルドしてください。
未設定時の既定値も `/api` ですが、開発用の `.env` がある場合は本番用設定で上書きが必要です。
本番配信サーバーでは同じオリジンの `/api/*` をFastAPIに転送し、
`/quiz` などのReactルートは `index.html` にフォールバックさせてください。
Viteの開発用プロキシは本番ビルドには含まれません。
同じオリジンのHTTPS配信を前提とします。別オリジンのAPIを明示する場合は、
既存バックエンドのCookie/CORS設定の確認が必要です。必要なバックエンド変更は今回行っていません。

```bash
npm run build
npm test
npm audit
```

## 画面とエラー処理

- `/`: メニューは上から「挑戦する」「前回結果」「問題追加」「Googleでログイン・ログアウト」の4段です。
  最下段だけ2ボタンを横並びにします。「挑戦する」は従来どおり `/quiz` へ移動します。
- 「前回結果」「問題追加」は無効なボタンでComing Soonと表示し、機能・APIは追加していません。
- 「Googleでログイン」は通常の `<a href="/api/login">` によるブラウザ遷移です。
  fetchやReact RouterのLinkでGoogleログインを開始しません。
- 「ログアウト」は既存の `POST /api/logout` をCookie付きで呼び出します。送信中はボタンを無効にします。
  既存APIの307を自動追跡するとトップへもPOSTしてしまうため、`redirect: "manual"` で受け、
  リダイレクト応答を確認してから `/?status=logouted` へReact Routerで移動します。
  `status=logouted` の場合だけ「ログアウトしました」を表示し、失敗時はエラーを表示して再試行できます。
  このクエリは表示専用で、認証状態やアクセス許可には使用しません。
- `/api/auth` から `/?auth_result=...` へリダイレクトされた場合、トップで以下の固定メッセージを表示します。
  `allowed` は成功表示、ほかの4種類はエラー表示です。
  パラメータなし・空・未定義の値は表示を追加せず、通常のトップページを表示します。
  既存のクイズAPIからの認証エラーがある場合は、そのメッセージを優先します。
- `auth_result` はメッセージ表示専用です。認証・認可の判定、セッションの作成、
  クイズへのアクセス許可には使用しません。既存の `login_checker` によるアクセス制御を維持しています。
- GET/POST `/api/quiz` はどちらも `credentials: "include"` と既存の `enterd-password` ヘッダーを送ります。
- HTTP 401・403ではFastAPIの `detail` を取得し、React Routerのstateで `/` に引き継いで表示します。
  JSONでないエラーやメッセージがない場合にも、HTTPステータスに応じた案内を表示します。
  認証エラー時はクイズ情報を消去し、履歴は `replace` します。
- HTTP 500などのサーバーエラーと通信障害はクイズ画面内で区別して表示し、再試行できます。
  サーバー内部のエラー詳細は表示しません。
- 従来のHTTP 200で返るパスワード不一致メッセージも維持しています。
- `/quiz` 直接アクセス時は設定画面から始まります。認証を通過したGETが成功するまで問題は表示しません。
  認証確認専用のAPIや、保存済み問題データは追加していません。
- 問題数1〜99、英単語の取得、回答送信、採点結果、再挑戦の流れは維持しています。

| auth_result | 表示メッセージ |
| --- | --- |
| allowed | ログインに成功しました。 |
| denied | アプリの利用が許可されていません。 |
| requested | ユーザー情報を送信しました。管理者の許可をお待ちください。 |
| data_failed | 正確なユーザー情報の取得に失敗しました。 |
| google_request_failed | Googleからユーザー情報を取得できませんでした。 |

## 認証情報・パスワードの置き場所

- Google Client Secret: **バックエンドの環境変数 `AUTH_CLIENT_SECRET`**。
- Google Client ID: バックエンドの `AUTH_CLIENT_ID`。
- セッション署名秘密鍵: バックエンドの `SECRET_SESSION_KEY` を利用する設計です。
  **ただし既存の `main.py` のSessionMiddlewareは固定文字列を使っており、この環境変数が適用されていません。**
  セッション偽造につながるため公開前に修正が必要です。バックエンド変更は許可待ちです。
- APIパスワード: バックエンドの `PASSWORD`。フロント側は従来どおり利用者が入力します。
  入力値はReactのメモリ内だけに置き、localStorage・sessionStorage・URL・ログには保存しません。
- 本番の秘密情報はサーバー側の環境変数・秘密情報管理で設定し、
  ローカル開発で `backend/.env` を使う場合もGitへ追加しないでください。
- `VITE_*` はビルドに埋め込まれる公開情報です。フロントの `.env` にはAPI URL以外の秘密情報を設定しないでください。
- ログイン先はAPI URLから固定の `/login` を組み立てます。URLクエリからのリダイレクト先指定は受け付けません。
  不正スキーム、プロトコル相対URL、認証情報付きURL、クエリ・フラグメント付き設定を拒否します。
  HTTPはローカル開発に限定し、絶対URLを使う本番設定にはHTTPSを要求します。
- エラーメッセージはReactのテキストとして表示し、HTMLとして挿入しません。

## 検証状況（2026-11-03）

実施済み:

- `npm run build`: TypeScriptチェックと本番ビルド成功。
- `npm test`: 63件成功（既存48件＋今回追加15件）。追加の本番依存パッケージはなく、jsdomは開発時のテスト用です。
- APIテスト: GET/POSTのURL・問題数・JSON・パスワードヘッダー・Cookie設定、
  401/403とAPIメッセージ、非JSONの認証エラー、500、通信障害、既存のパスワード不一致、
  不正レスポンス、問題数の検証を確認。
- React/jsdomテスト: メニュー、無効なComing Soon、直接アクセス時の問題非表示、
  GET/POSTそれぞれの401/403からトップへの遷移とメッセージ表示、
  500・通信障害・パスワード不一致時の画面維持、問題取得→回答→採点→再挑戦を確認。
  エラーメッセージがHTMLとして挿入されないことも確認。
- 今回の追加テスト: 5種類のリダイレクト先での文言・成功/エラー表示、
  パラメータなし・空・未知の値・不正な入力での通常表示、画面遷移後の表示解除、
  既存のAPI認証エラーの優先表示を確認。
  `?auth_result=allowed` を手入力しても認証状態は作られず、クイズAPIの401でトップへ戻ることを確認。
- ソースと本番成果物に秘密情報の設定名・秘密鍵形式が混入していないこと、
  本番JavaScriptに開発用URLが含まれないこと、公開環境変数がAPI URLだけであることを静的確認。
- 実際のViteプロキシ＋模擬APIによる結合テスト:
  `/api/login` の302・Location・Set-Cookie転送、
  GET/POSTのパス・Cookie・既存ヘッダー・JSON、
  FastAPI側のホストが維持されることを確認。
- `npm audit`: 既知の脆弱性の指摘0件。検出可能な範囲の結果であり、問題がない保証ではありません。
  導入済みVite 6.4.5は公式勧告
  [GHSA-8g5g-mxqh-grgj](https://github.com/vitejs/vite/security/advisories/GHSA-8g5g-mxqh-grgj)
  の修正版です。

未実施・対象外:

- ブラウザによる実画面・レイアウト確認: ブラウザ操作ツールが環境のプロセス起動エラーで使えませんでした。
  実ブラウザでデスクトップ・スマートフォン幅のメニューとエラー表示を確認してください。
- 本物のGoogle認証、実FastAPI/DBを使ったログイン開始・クイズ取得・採点、
  本番ホストでのCookie送受信は未確認です。模擬APIでの成功と区別してください。
  実環境ではGoogle認証→auth_result付きのトップへのリダイレクト→メッセージ表示→問題取得・採点を確認し、
  未ログイン/未許可/セッション切れの場合も確認してください。
- 本番サーバーのHTTPS・API転送・SPAフォールバックと、Googleに登録した
  `/api/auth` コールバックURLは実環境での確認が必要です。
- 固定のセッション署名鍵の修正・鍵のローテーションはバックエンド変更を伴うため未実施です。
- 実際の `/api/auth` からReactへのリダイレクトは未検証です。今回はリダイレクト先での表示を自動テストしています。

## 変更記録（2026-11-03: auth_result表示）

変更は次の4ファイルだけです。新しい依存パッケージやバックエンドAPIは追加していません。

- `src/pages/HomePage.tsx`: URLの `auth_result` を5種類の固定メッセージに対応付け、
  成功は `role="status"`、エラーは `role="alert"` で表示。認証・認可判定には使用しません。
- `src/index.css`: 成功メッセージ用の表示スタイルを1ルール追加。
- `tests/pages.test.mjs`: 今回の15件と、既存の通常ページテストにメッセージ非表示の確認を追加。
- `README.md`: 仕様、メッセージ一覧、実施結果と未検証項目を更新。

Node.js 26.12.1で `npm test`（63件成功）と `npm run build`（成功）を実施しました。
実Google認証・実FastAPIでのリダイレクト・実ブラウザの表示確認は未実施です。
開発環境のブラウザで `http://localhost:5173/?auth_result=allowed` など5種類のURLと、
クエリなしの `http://localhost:5173/` を開いて表示を確認できます。
実際の認証フローはGoogleログインを行い、各結果に応じてトップへ戻ることを確認してください。
認証なしで `?auth_result=allowed` を開いても、クイズAPIが拒否することも確認してください。

## 変更ファイル

- `src/pages/HomePage.tsx`: 説明文、メニュー、Googleログイン、認証エラー表示。
- `src/pages/QuizPage.tsx`: 401/403時の状態消去・トップ遷移と、その他エラーの画面内表示。
- `src/api/quizApi.ts`: ログインURL、Cookie送信、HTTPステータス保持、APIエラーメッセージ解析。
- `src/api/apiConfig.ts`: API URLの検証と開発/本番の接続先解決。
- `src/index.css`: メニュー、Coming Soon、認証エラー、キーボードフォーカスの表示。
- `vite.config.ts`: 開発専用のAPIプロキシ。
- `tsconfig.node.json`: 共用設定ファイルの型チェックと対象JavaScriptバージョン。
- `package.json`, `package-lock.json`: Vite設定の明示、テストコマンド、対応Node.js、
  テスト用jsdomとその依存関係。
- `tests/register.mjs`, `tests/tsx-loader.mjs`: Node上で実際のTypeScript/TSXを読むテスト用処理。
- `tests/api.test.mjs`, `tests/pages.test.mjs`, `tests/proxy.test.mjs`: 上記の自動テスト。
- `.env.example`, `README.md`: 公開設定の説明、運用・検証手順と未完了項目。

バックエンドにあった未コミット変更は作業開始前からのもので、今回の作業では触れていません。


## 変更記録（2026-11-04: ログアウト・トップ画面）

既存の `backend/main.py`、フロントのAPI接続設定、画面、CSS、テストを確認してから変更しました。
バックエンドの `POST /api/logout` は既に存在するため追加・変更していません。
このAPIの依存は `login_checker` で、パスワードヘッダーやJSON本文は不要です。
成功時はセッションを消去し、307と `Location: http://localhost:5173/?status=logouted` を返します。

今回の変更は次の7ファイルのみです。依存パッケージは追加していません。
作業開始前からある未コミット変更は維持しています。

| ファイル | 変更内容と理由 |
| --- | --- |
| `src/pages/HomePage.tsx` | ログアウトボタン、送信中の連打防止、失敗時のエラー、成功後のクエリ付き遷移を追加。`status=logouted` を受けたとき「ログアウトしました」を既存の成功表示で表示。ログイン・ログアウトを最下段にまとめる。 |
| `src/api/quizApi.ts` | 既存のAPI接続先設定で `/logout` にPOST。`credentials: "include"` でCookieを送り、307を手動処理。ブラウザの `opaqueredirect` にも対応し、既存の認証・HTTP・通信エラー処理を再利用。 |
| `src/index.css` | メニューを全画面幅で1列4段へ変更し、最下段だけ2列にする。不要になったモバイル専用の1列指定を削除。 |
| `tests/api.test.mjs` | POST・Cookie・307・ブラウザの手動リダイレクト応答、401/403/500/想定外の200、通信失敗の7件を追加。 |
| `tests/pages.test.mjs` | メニューの4段・順序と最下段のボタンを確認。成功、送信中、失敗と再試行、クエリ表示・解除、認証維持の11件を追加。変更前から失敗していた `denied` の期待値1行を現在の画面文言に合わせ、画面文言自体は維持。 |
| `tests/proxy.test.mjs` | 実Viteプロキシの既存テストにログアウトPOST、307、Location、Cookie失効の転送確認を追加。変更前から発生していた5173番ポート競合を避けるため、middlewareモードとOS割り当ての空きポートで起動。 |
| `README.md` | 操作仕様、既存API確認、今回の変更箇所、実施したテストと検証範囲を記録。既存 `denied` 文言の説明も現状に合わせる。 |

実施結果:

- Node.js 26.12.1で `npm test`: **81件成功**（既存63件＋追加18件）。
  既存の問題数チェック、問題取得、回答送信、採点、再挑戦、ログイン結果表示、認証エラー、
  HTTPエラー、通信障害、APIプロキシを含みます。
- `npm run build`: TypeScriptチェックと本番ビルド成功。
- Microsoft Edgeのヘッドレスブラウザで1280px・375px・320px幅を検証。
  4段、最下段2ボタンの横並び、横方向のはみ出しがないことを座標と画像で確認。
- ブラウザ＋模擬APIで問題取得→回答→採点→再挑戦、既存のGoogleログインリンク、
  ログアウト401時のエラー→再試行→307成功→クエリ付きトップと正確なメッセージ表示を確認。
  HttpOnlyのセッションCookieが失効すること、トップへPOSTが再送されないこと、
  JavaScript実行エラーがないことも確認。
- 稼働中の実APIのOpenAPIで `POST /api/logout`、既存のログイン・クイズAPIを確認。
  認証Cookieなしの実 `POST /api/logout` が401と「ログインしてください」を返すことを確認。
- `backend/main.py` から既存の `logout` 関数だけを読み込んだ隔離FastAPIで、
  認証依存をテスト用に差し替えて307・正確なLocation・セッションCookieの失効・
  ログアウト後の再POSTの401を確認。実DBやGoogle認証情報は使用していません。
- バックエンド配下の非除外ファイル全件のSHA-256を作業前後で照合し、一致を確認。

実Google認証を伴う、ログイン済みの実FastAPI・実DBでの通し操作は未実施です。
「前回結果」「問題追加」は既存どおりComing Soonの無効ボタンです。
