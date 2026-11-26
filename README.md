# English_vocab_quiz
- **オリジナルの英単語を登録してクイズに挑戦できるアプリ**

## 概要
- ローカルのCLI版、VPSのCLI版、Web版の３つを制作
- **CLI版（ローカル）**：ローカルのExcelファイルからCSVを作成し、そこからクイズを出す
- **CLI版（VPS）**：事前に管理者が登録したCSVファイルをVPSに転送、挑戦者は挑戦者用ユーザーにSSH接続（公開鍵）して挑戦できる
 - 各linuxユーザーにidをあてることクイズ終了後に前回結果を表示する
- **Web版（VPS）**：各ユーザーが好きな単語を送信して登録することができる、FastAPI,PostgreSQL,Reactを使用したWebアプリ
- ユーザーはGoogleOIDCでログイン後、管理者の許可を得ることで、単語登録、クイズへの挑戦ができる

## 動機
- CLI版（ローカル）：分からない英単語の意味をClaudeに聞くと、回答と同時にClaude coworkの設定でExcelファイルへ自動追加され、そこから問題を出題できるという、単語登録の手間がない、自分用のクイズを作りたかったから
- CLI版（VPS）：友達に挑戦させてサーバー管理を学んだり、遠方でもできるようにしたかったから
- Web版（VPS）：学習のために個人開発がしたかったから。　最終的には翻訳APIを載せて、翻訳をしつつクイズに登録するアプリにして、利用したいから

## 主な機能

### CLI版(ローカル)
- WindowsのExcelファイル読みとり、CSV化
- CSVファイルからの出題
- 挑戦数をもとにクイズ出題
- 採点、%表示、成績に応じたメッセージ


### CLI版(VPS)
- CSVファイルからの出題
- 挑戦数をもとにクイズ出題
- 採点、%表示、成績に応じたメッセージ
- SSH接続（公開鍵）による外部からの挑戦
- ユーザーごとの前回結果表示
### Web版
- Google OIDC
- OIDCとuidの紐づけによる各ユーザーの分離
- 管理者によるユーザーの利用許可
- ユーザーオリジナルの英単語の登録・編集・削除機能
- 挑戦数をもとにクイズ出題
- 採点、%表示、成績に応じたメッセージ

## 技術スタック
### CLI版
| カテゴリ | 技術 |
|:--|:--|
| 出題 | Bash |
| 問題取得 | Python |
| 外部挑戦 | OpenSSH (公開鍵認証 / ForceCommand) |
### Web版
| カテゴリ | 技術 |
|:--|:--|
| フロントエンド | React (実装に Codex を使用) |
| バックエンド | Python / FastAPI |
| データベース | PostgreSQL |
| 認証 | Google OIDC (Authlib) |
| Webサーバー | Nginx |
| サービス管理 | systemd |
| インフラ | さくらVPS / Ubuntu |
| 通信の暗号化 | Let's Encrypt / Certbot |
| ドメイン | DuckDNS |
| ファイアウォール | UFW |
| CI/CD | GitHub Actions |
| テスト | Pytest |

## アーキテクチャ

### CLI版(ローカル)
```
[Client] → [Python] → [Bash]
```

### CLI版(VPS)
```
[Client] → [OpenSSH] → [Bash]
```

### Web版
```
[Client] → [React] → [Nginx] → [FastAPI] ⇆ [PostgreSQL]
                                  ↓↑
                             [Google OIDC]
```

## 環境
### CLI版
- Ubuntu 24.04 LTS
- OpenSSH
- Python 3.12

### Web版
#### サーバー
- Ubuntu 24.04 LTS
- Python 3.12
- PostgreSQL 16
- Nginx 1.24
- Certbot (Let's Encrypt)

#### フロントエンド
- Node.js 26 (LTS)
- フロントエンドはCD時にGitHub Actions側でビルド

#### OIDC
- Google CloudのOAuthクライアントID


