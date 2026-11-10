# FastAPI 自動テストのひな形

この追加はファイル構成・確認予定・モック／フィクスチャの準備だけです。
アプリケーションコードと既存の変更には触れず、不具合修正は行っていません。
**APIテストはすべて未実装で、理由付きでスキップされます。**

## ファイル構成

```text
backend/
├── pytest.ini
├── requirements-test.txt
└── tests/
    ├── conftest.py
    ├── test_auth.py
    ├── test_quiz_api.py
    ├── test_logout.py
    ├── test_admin_api.py
    └── README.md
```

既存の空の `backend/test.py` は変更しません。`pytest.ini` は `tests/` だけを収集します。

## 実行方法

WSL/Linuxで、テスト用の仮想環境または既存の開発用仮想環境を有効にして実行します。

```sh
cd ~/English_vocab_quiz/web/vps-web/backend
python -m pip install -r requirements-test.txt
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONDONTWRITEBYTECODE=1 python -m pytest -c pytest.ini
```

収集対象だけを確認する場合：

```sh
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 PYTHONDONTWRITEBYTECODE=1 python -m pytest -c pytest.ini --collect-only -q
```

- `-ra` によりスキップ理由も表示します。
- `scaffold` はひな形用の登録済みマーカーです。
- この段階の期待結果は **passedが0件で、収集されたAPIケースがすべてskipped** となることです。
- スキップだけでもpytestの終了コードは0になり得ます。終了コード0をアプリの動作確認成功と扱わないでください。
- 外部pytestプラグインの自動読込とキャッシュ生成を無効化しています。コード検査や試験結果を偽装する設定ではありません。
- `requirements-test.txt` は開発・テスト専用で、既存の本番依存一覧は変更しません。pytestの収集にはアプリ本体の起動は不要です。

## フィクスチャ

| 名前 | 用途 |
| --- | --- |
| `test_settings` | テスト専用のダミー環境変数、dotenv読込の無効化 |
| `block_python_network` | Pythonソケット経由の想定外通信を即時失敗させる補助ガード |
| `mock_db` | SQLAlchemy風のDBモック。通常は権限・検索結果なし |
| `mock_google` | OIDC認可開始・トークン交換用のAsyncMock |
| `approved_user` / `unapproved_user` | 許可済み／未許可のダミーユーザー |
| `quiz_headers` / `admin_headers` | テスト専用パスワードのヘッダー |
| `sample_question` / `sample_answers` | 入力データの例 |
| `app` | **未実装・明示的にスキップ**する実アプリ接続点 |
| `client` | 将来のASGI TestClient。appが未実装の間は利用不可 |

`mock_google` は応答未設定のまま呼ぶと失敗します。将来テストで戻り値を設定するときは、
先に対象AsyncMockの `side_effect = None` としてから `return_value` を設定してください。

## 実アプリをまだ読み込まない理由

現行 `main.py` はimport時に `create_all()` と `init_db()` を実行します。
`app.dependency_overrides` を後から設定するだけでは、この時点のDBアクセスを防げません。

したがって、ひな形のテストモジュールとconftestは `main.py`、`database_conf.py`、
`auth_conf.py` を読み込みません。`app` フィクスチャは `pytest.skip()` のままにしています。
GoogleやPostgreSQLのサービスを起動したり、実際の認証情報を用意したりする必要はありません。

ネットワークガードはPythonソケット向けであり、ネイティブDBドライバーを含む全通信の遮断ではありません。
`DATABASE_URL` は安全用のインメモリSQLite値ですが、この段階ではそれにも接続しません。
後続の実装では、DB・設定モジュールとGoogleクライアントの差し替えを **実アプリのimport前に**
完成させ、初期化の副作用とモジュールキャッシュを隔離してください。

## 次にテストを実装する手順

1. `app` フィクスチャにimport前の副作用隔離と、DB・Googleクライアントの差し替えを実装する。
2. `get_db` のdependency overrideを設定し、終了時にoverrideやimport状態を必ず戻す。
3. 認証テストでは `login_checker` を安易に差し替えず、ダミーセッションと `mock_db` の権限を設定する。
   未ログイン・未許可・未登録の違いが実際に検証されるようにする。
4. テストごとにリクエスト、期待するステータス／本文／Cookie属性、DB副作用のassertを実装する。
5. 実装できたテストだけ `@pending` と本文末尾の `pytest.fail("未実装: ...")` を取り除く。
   このfailはスキップを外しただけで空のテストが成功することを防ぐためのもの。
6. 実装済みになったテストの `scaffold` マーカーを整理する。未実装のケースはスキップを残す。

各関数のコメントが確認項目です。現在の問題を一律に成功扱いするassertや、
修正前提の期待値はまだ追加していません。エラーのHTTPステータス、ログアウトの失効方針、
一括更新の原子性などは、現行挙動と望ましい仕様を区別してから実装します。

## モックで確認できる範囲

- Googleクライアントをモックする試験は、アプリの成功・失敗分岐を確認するものです。
  state・nonce・PKCE・IDトークン検証そのものには、別途ローカルの模擬OIDC応答・鍵を使う試験が必要です。
- TestClientはASGIアプリ内で動作します。ブラウザーのSameSite判定を再現しないため、
  Cookie属性の確認と、実ブラウザーでのCSRF試験を区別します。
- DBモックの呼び出し確認だけではPostgreSQLの制約・トランザクション・並行実行を保証できません。
  将来それらを検証する際も、本番から分離した使い捨てDBを用意してください。
- 実Cookie、Googleトークン、実パスワード、秘密設定の内容をログ・スナップショットへ保存しません。

スキップの仕組みは [pytest公式リファレンス](https://pytest.org/en/stable/reference/reference.html#pytest-mark-skip) を参照してください。
