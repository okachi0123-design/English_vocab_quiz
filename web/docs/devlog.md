# 開発ログ - Web版

## 全体方針
### 制作計画
- 現状のVPS,Localhost基盤のCLI版から,AWS基盤のGUIWeb版に変更する。
- データをCSVファイルからPostgreSQLに変更する
- VPS上でWebアプリを動く状態にし、それをAWSに移行する
- WebアプリはFastAPI，Pythonをメインで使う
- 開発順序は　Pythonコード→DB設計→DB接続→フロントエンド(AI使用)→フロントエンド接続→VPSデプロイで行う

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
ブラウザ
    |
    | HTTPS
    v
Nginx
    |--------------------|
    |                    |
    v                    v
React (dist)        FastAPI (Uvicorn)
                         |
                         v
                    PostgreSQL
```
- Nginx：静的コンテンツ配信、リバースプロキシ
- FastAPI：API処理、クイズの出題・採点
- PostgreSQL：英単語データの保存
- systemd：FastAPIなどのサービス管理・自動起動
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
## API方針
### GET /api/quiz
- 挑戦回数（attempt_count）を受け取る
- PostgreSQLからクイズ用の問題を取得する
- フロントエンドに問題データを返す

### POST /api/quiz
- フロントエンドから回答データ（answers）を受け取る
- 正解データと照合して採点する
- 正誤、得点、正答率などの結果を返す

### 認証
- APIへのアクセスに簡易パスワード認証を使用
- entered-passwordヘッダーでパスワードを送信する
- FastAPIのDepends(check_password)を使用して認証処理を実行する

### CORS
- ローカル開発時にはlocalhost:5173からのアクセスを許可
- VPS公開時は実際の公開元に合わせて許可するOriginを設定する

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

## デプロイ方針
- バックエンド：FastAPIとvenvをVPSの`/opt/webquiz`に配置する
- サービス管理：systemdを使用し、FastAPIの自動起動・再起動を設定する
- フロントエンド：Reactをビルドし、Nginxで静的ファイルを配信する
- 通信構成：Nginxをリバースプロキシとして使用し、FastAPIへリクエストを転送する
- セキュリティ：専用ユーザーによる最小権限、認証情報の保護、HTTPS通信を導入する
- 最終目標：VPS上でWebアプリを常時稼働させ、外部から安全にアクセスできる状態にする
## VPSからAWSへの移行方針

## 参考資料
### 参考資料

- YouTube：[このはな技術室｜小型PCで最強の個人用自宅サーバーを構築する]
- 参考箇所：DuckDNSによるドメイン取得・DNS設定

- YouTube：[Python FastAPI Tutorial (Part 18): Deploy to a VPS - Security, Nginx, SSL, and Custom Domain]
- 参考箇所：FastAPIのVPSデプロイ、Nginx、systemd、SSH、HTTPS化

- Webサイト：[Qyvera - Deploy React FastAPI VPS Nginx]
- 参考箇所：React・FastAPIのVPSデプロイ、`npm ci`、`npm run build`、`dist/`の配置方法

