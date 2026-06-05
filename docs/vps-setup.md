# VPS セットアップ・移植ログ — English Vocab Quiz

ローカル（WSL）で開発したクイズアプリを、さくらVPS上で公開・実行できるようにした記録。
VPS契約・セキュリティ設定・アプリ移植の手順と、移植時に必要だったこと・留意点をまとめる。

※ 実IPアドレス・秘密鍵・パスワードは本ドキュメントに記載しない。

---

## 1. なぜVPSか

- English Vocab Quiz を他人に挑戦してもらうため
- LPIC学習の実践の場（SSH・ユーザー管理・ファイアウォール・パーミッション）
- ローカルVMと違い「24時間稼働・グローバルIPを持つ実サーバー」を扱う経験

---

## 2. 契約・初期設定の判断

### プラン選択
- 選択肢: 512MB / 1GB / 2GB
- 決定: **1GB（石狩リージョン）**
- 理由:
  - 512MBプランは標準OS Ubuntu 24.04 を選択できない（メモリ不足で起動しない仕様）
  - 普段のローカルVM（Ubuntu 24.04）と環境を揃えて学習をスムーズにしたい
  - クイズアプリ（シェルスクリプト）は軽量なので1GBで十分
- リージョン: 石狩

### OS
- Ubuntu 24.04（ローカルVMと同一バージョン）

---

## 3. SSH鍵認証の設定

### 方針
- パスワード認証ではなく公開鍵認証を使う（総当たり攻撃対策）
- VPS専用の鍵を新規作成（GitHub用などと用途を分離）

### 手順
```bash
# ローカル(WSL)で鍵ペアを作成
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_yourvps -C "your-vps"
# パスフレーズは設定推奨（鍵が漏れても守られる）

# 公開鍵の中身を表示してコピー
cat ~/.ssh/id_ed25519_yourvps.pub
```

- 契約画面の「公開鍵をサーバーにインストールする」に**公開鍵（.pub）**を貼り付け登録
- 留意点: 登録するのは**公開鍵（.pub）だけ**。秘密鍵は絶対に渡さない・登録しない

### 接続
```bash
ssh -i ~/.ssh/id_ed25519_yourvps <ユーザー>@<IP>
```

---

## 4. サーバー側セキュリティ設定

### 管理者ユーザー
- 一般ユーザー（sudo所属）で運用。rootで直接作業しない
- 確認コマンド:
```bash
getent passwd <ユーザー>     # ユーザーの存在・情報
getent group sudo            # sudoグループのメンバー
```

### SSH設定の強化（/etc/ssh/sshd_config）
目標の設定:
```
PasswordAuthentication no    # パスワード認証を無効化
PermitRootLogin no           # rootログイン禁止
PubkeyAuthentication yes     # 鍵認証のみ
```

留意点（重要）:
- 設定変更は**間違えると自分も締め出される**。鉄則として:
  1. 現在のSSHセッションは閉じない（保険）
  2. 設定変更・反映後、**別の新しいターミナル**で鍵ログインをテスト
  3. 入れることを確認してから安心する。ダメなら生きているセッションで戻す
- 反映前に必ず文法チェック: `sudo sshd -t`（何も出なければOK）
- 反映: `sudo systemctl restart ssh`
- 反映確認: `sudo sshd -T | grep -iE "passwordauthentication|permitrootlogin"`

### ファイアウォール（ufw）
```bash
sudo ufw allow 22/tcp            # SSHを許可（有効化の前に必ず）
sudo ufw default deny incoming   # 原則拒否
sudo ufw default allow outgoing  # 外向きは許可
sudo ufw enable                  # 有効化
sudo ufw status verbose          # 確認
```
- 留意点: `ufw enable` の前に**必ずSSH（22）を許可**する。順序を誤ると即締め出し
- 方針: 「原則拒否・必要なポートだけ許可」（ホワイトリスト方式）

---

## 5. アプリの移植（ローカル → VPS）

### 移植時の根本的な課題
ローカルは「Excel → Python変換 → CSV → シェルでクイズ」という流れ。
だが **VPSにはExcelも `/mnt/c/` もない**。よって:
- VPSでは Excel→CSV変換をしない
- Python（venv, openpyxl）も不要
- **CSVはローカルで生成し、VPSへ直接転送する**

### 役割分担（場所で処理を分ける）
| 場所 | 役割 | 使うもの |
|------|------|----------|
| ローカル(WSL) | データ生成（Excel→CSV） | Python（venv, openpyxl） |
| VPS | クイズ出題・集計 | シェルスクリプトのみ |

### 移植の経路（コードとデータを分ける）
| 対象 | 経路 | 理由 |
|------|------|------|
| コード | git（clone / pull） | バージョン管理・共有 |
| データ（CSV） | scp（直接転送） | 環境ごとに用意・公開リポジトリに載せない |
| 設定（config.sh） | 各環境で作成 | 環境固有・git管理外 |

### 移植手順
```bash
# 1. VPSでコードを取得
git clone https://github.com/okachi0123-design/English_vocab_quiz.git
cd English_vocab_quiz
git pull   # 以降は pull で最新化

# 2. 設定ファイルを作成（設計図からコピー）
cp config.sh.example config.sh
# VPSではEXCEL_PATHは使わない（ダミーのままでよい）

# 3. CSVデータをローカルから転送（ローカル側で実行）
scp -i ~/.ssh/id_ed25519_yourvps \
    ~/English_vocab_quiz/data.d/word.csv \
    ~/English_vocab_quiz/data.d/phrase.csv \
    <ユーザー>@<IP>:~/English_vocab_quiz/data.d/

# 4. VPSで実行
bash play.sh 3        # VPS用入口（クイズ→集計）
```

### 移植時に留意したこと
- **パスのハードコードを避ける**: `/tmp/ENquiz/...` などを変数化し、config.sh に集約。
  `$HOME` を使うことでユーザー名を埋め込まず、cloneした他人の環境でも動くようにした
- **CSVをgitに上げない**: `.gitignore` に `data.d/` を追加。
  単語データを公開リポジトリに載せず、scpで各環境に配布
- **本番で直接編集しない**: コードはローカルで開発 → push → VPSでpull。
  本番サーバーで直接書き換えると事故りやすく、履歴も残らない
- **環境ごとに入口を分ける**:
  - ローカル用: 変換＋鮮度チェック込みの入口
  - VPS用: `play.sh`（変換せず ask.ct.sh → percentage.sh を呼ぶだけ）
- **更新比較はVPSで使わない**: `-nt` でExcelとCSVを比較する処理は、
  Excelが存在しないVPSでは正しく動かないため、VPS用入口では経由しない

---

## 6. 残タスク（今後）

- 挑戦者用ユーザー `quiz` の作成（sudoなし／ログイン時に自動でクイズ起動／操作制限）
- 公開（`ssh quiz@<IP>` で他人に挑戦してもらう）
- （応用）fail2ban で不正ログイン試行の自動ブロック
- スクリプトの整理（重複ファイルの統合・命名統一）

---

## 7. 学んだこと

- VPSは「24時間稼働の公開サーバー」。作業終了は `shutdown` ではなく `exit`（ログアウト）
- 公開サーバーには攻撃（ログイン試行）が常時来る。「攻撃されない」のではなく
  「鍵認証のみ＋rootログイン禁止＋ufw で**突破されない**」状態にするのが対策
- `getent` はNSS経由でユーザー/グループを問い合わせる（cat /etc/passwd より実務的）
- scp で鍵指定: `scp -i <鍵> <ローカルファイル> <user>@<IP>:<リモートパス>`
- コード・データ・設定を分離し、それぞれ適した経路で運ぶ（git / scp / 各環境で作成）
