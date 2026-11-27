# 開発ログ - Web版

## 全体方針
### 制作計画
- 毎日の進捗は`daily-devlog`に記述
- 現状のVPS,Localhost基盤のCLI版から,VPS基盤にデプロイと公開、いずれはAWS基盤のGUIWeb版に変更予定
- データをCSVファイルからPostgreSQLに変更する
- VPS上でWebアプリを動く状態にし、それをAWSに移行する
- WebアプリはFastAPI，Pythonをメインで使う
- 開発順序は　Pythonコード→DB設計→DB接続→フロントエンド(AI使用)→フロントエンド接続→VPSデプロイで行う
---
- OIDCを導入し、ユーザーごとのオリジナルクイズに変更
- 学習用でAWS基盤にするか、CloudFlareで本番運用するか考え中
- 翻訳APIかバトル画面を追加したい

### アプリ構成
- Reactのトップ画面 / からクイズ画面 /quiz に移動する

- GET /api/quizで挑戦回数（attempt_count）を受け取り、DBから問題を取得する

- POST /api/quizで回答データを受け取り、採点結果を返す

- 採点結果では正誤、得点、正答率、メッセージを表示する

- 同時接続数の制限やリクエスト数の制限を検討し、簡単な認証パスワードをAPIへのアクセス時に送らせる
## 目的
- AWS移行学習
- Webアプリ開発学習
- データベース設計学習
## Web版の構成
```
ブラウザ <--------------------------------------| 画面切り替え（google認証）
    |                                          |  
    | HTTPS                                    |
    v                                          |
Nginx                                          |
    |--------------------|                     |
    |                    |                     | 
    v                    v                     v
React (dist)        FastAPI (Uvicorn) <--> Google OIDC
                         ^
                         |
                         v 
                    PostgreSQL            
```
- Nginx：静的コンテンツ配信、リバースプロキシ
- FastAPI：API処理、クイズの出題・採点、セッション状態のチェック、オリジンのチェックOIDCのリダイレクト処理
- PostgreSQL：英単語データの保存、ユーザー情報の保存(sub,uid,is_allowed)
- systemd：FastAPIなどのサービス管理・自動起動
- Google OIDC：OIDC認証
## 使用技術

| 分類 | 使用技術 |
|---|---|
| バックエンド | Python 3.12、FastAPI、Uvicorn |
| フロントエンド | React 18、TypeScript、Vite 6 |
| データベース | PostgreSQL |
| ORM | SQLAlchemy |
| Webサーバー | Nginx（導入予定） |
| サービス管理 | systemd（設定作業中） |
| OS | Ubuntu 24.04（VPS）、WSL Ubuntu（ローカル） |
| 仮想環境 | Python venv |
| バージョン管理 | Git、GitHub |
| クラウド | AWS（移行予定） |

## データベース方針
- CSVファイルによる英単語管理からPostgreSQLに変更する
- SQLAlchemyを利用してPythonからDBを操作する
- DB接続情報は.envで管理する
```
テーブル名：eng_vocabulary_words
カラム      内容
id         単語を識別するID
word       英単語
meaning    日本語訳

```
- IDトークンの個人識別子`sub`と`uid`、ユーザーごとの許可をまとめたユーザー認証用のテーブルを追加
- `uid`は主キーで自動採番
- `is_allowed`はデフォルトで`false`
```
テーブル名：webquiz_users
カラム        内容
sub          IDトークンの個人識別子
uid    　    ユーザー識別時に利用する用のid
is_allowed   T/Fのブール値
```
## API方針
### GET ("/api/quiz")
- 挑戦回数（attempt_count）を受け取る
- PostgreSQLからクイズ用の問題を取得する
- フロントエンドに問題データを返す

### POST ("/api/quiz")
- フロントエンドから回答データ（answers）を受け取る
- 正解データと照合して採点する
- 正誤、得点、正答率などの結果を返す

### PUT("/api/data")
- フロントエンドの問題管理画面に単語と意味に加えてidも保持させる
- 変更ボタンを各単語に配置して変更予定の単語、意味を入力させて対応するidを合わせて送信させる
- idとuidでテーブルを検索、見つかればその単語を取得、見つからなければエラー
- テーブルを置き換えて成功メッセージ、失敗時は失敗のメッセージ

### POST("/api/data")
- ユーザーから追加用単語を(new_questions)受け取る
- １つづつ被りの単語が無いか確認
- なければＤＢに追加、あればその分だけエラーメッセージ
- idは自動採番
- 追加した単語と失敗した単語を表示して終了

### DELETE("/api/data")
- フロントエンドの削除画面の単語と意味に加えてidも保持させる
- ユーザーが削除したい単語を選べばそのidがリストで送られる
- uid,id一覧でフィルターをかけて削除する単語の一覧を取得、なければ失敗のメッセージとともに終了
- 削除して、削除完了した単語を一覧でメッセージとともに表示

### ユーザー分離
- クイズ関連のAPIにセッションから`uid`を取得し、問題保存用テーブル`eng_vocabulary_words`を`uid`でフィルターさせるように設定し、問題をユーザーごとに分離させる

### 認証
- APIへのアクセスに簡易パスワード認証を使用　（削除）
- `entered-password`ヘッダーでパスワードを送信する （削除） 
- FastAPIの`Depends(check_password){を使用して認証処理を実行する　（削除）
- Google OIDC認証で`sub`を取得し、認証用テーブル`webquiz_users`でそれと同じ行の`uid`と利用の可否を取得する
- 利用許可がTrueなら`uid`をセッションに保存する
- クイズ関連のAPIを利用するときに、`login_checker`による`uid`の有無、可否のチェックを行うように依存関係(Depends)を設定

### CORS
- ローカル開発時にはlocalhost:5173からのアクセスを許可
- VPS公開時は実際の公開元に合わせて許可するOriginを設定する
- `allow_origins=[FRONTEND_URL]`と環境変数に変更
- `.env`の環境変数を変更すればドメインが切り替わるように設計
- メソッドを `GET,POST,PUT,DELETE,OPTIONS`に限定

## 開発環境
### ローカル環境
- Windows + WSL Ubuntu
- Python仮想環境（venv）を使用
- PostgreSQLを使用
- フロントエンドはViteの開発サーバーを使用
- Git/GitHubでソースコードを管理
### VPS環境
- Ubuntu 24.04 LTS
- Python 3.12
- PostgreSQL
- FastAPI + Uvicorn
- SSHによるリモート操作

## VPSデプロイ方針
### バックエンド
- FastAPIとvenvをVPSの`/opt/webquiz`に配置する
### サービス管理
- systemdを使用し、FastAPIの自動起動・再起動を設定する
### フロントエンド
- Reactをビルドし、Nginxで静的ファイルを配信する
- ReactのビルドをCI/CD時にGitHub Actions上で実行させる
- CD用YAMLファイルで`Node.js`のバージョンを26になるように指定
### 通信
- Nginxをリバースプロキシとして使用し、FastAPIへリクエストを転送する
- `Let's Encrypt`を利用してHTTPS通信
- `CertBot`でSSL/TLS証明書の自動更新
### セキュリティ
- 専用ユーザーによる最小権限、認証情報の保護、HTTPS通信を導入する
- OIDC認証の`PKCE,state,Nonce`で認可、認証コードを保護
- `https_only``max_age``samesite``origin,refererのチェック`によるセッションの保護、セッションハイジャック、CSRF攻撃の防止
### CI/CD
- GitHub ActionsのCI/CDを利用してPush時に自動でテスト、デプロイさせる
- `workflow_run`でCIとCDのワークフローを連携させて、テスト成功時のみCDを実行させる
- GitHub Secretsでホスト、ユーザー、SSH秘密鍵、VPSホスト公開鍵を管理
- `requirements.txt`のインストールをデプロイ専用ユーザー`deploy`で行うように設定
- 最後にサービスを再起動させる

## VPSからAWSへの移行方針

## 参考資料

- YouTube：[このはな技術室｜小型PCで最強の個人用自宅サーバーを構築する]
- 参考箇所：DuckDNSによるドメイン取得・DNS設定

- YouTube：[Python FastAPI Tutorial (Part 18): Deploy to a VPS - Security, Nginx, SSL, and Custom Domain]
- 参考箇所：FastAPIのVPSデプロイ、Nginx、systemd、SSH、HTTPS化

- Webサイト：[Qyvera - Deploy React FastAPI VPS Nginx]
- 参考箇所：React・FastAPIのVPSデプロイ、`npm ci`、`npm run build`、`dist/`の配置方法

