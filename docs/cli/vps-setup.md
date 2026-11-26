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

---

## 8. 挑戦者ユーザー challenger の作成と「クイズしかできない檻」

### 方針
- 挑戦者には challenger ユーザーでログインさせ、クイズ以外は何もできない状態にする
- パスワードは使わず鍵認証のみ（漏洩リスクなし）
- 設定作業は管理者(murabito)の sudo で行い、challenger には切り替えない
- 「檻」は ForceCommand で作る（シェルは /bin/bash のまま、false/nologin にしない）

### challenger ユーザー
```bash
# 作成（sudoなし、シェルは /bin/bash）
# パスワードはロック（usermod -L）、鍵認証のみで入る
```

### 鍵の配布方式（設計B：挑戦者が各自で鍵を作る）
- 挑戦者に依頼: `ssh-keygen -t ed25519 -f ~/.ssh/quiz_key` で鍵を作り、
  `cat ~/.ssh/quiz_key.pub` の中身（公開鍵）だけ送ってもらう
- 管理者は受け取った公開鍵を authorized_keys に1行ずつ追記:
```bash
# .ssh ディレクトリと authorized_keys を用意（所有者 challenger、700/600）
sudo mkdir -p /home/challenger/.ssh
sudo cp ~/.ssh/id_ed25519_yourvps.pub /home/challenger/.ssh/authorized_keys  # 自分のテスト鍵
sudo chown -R challenger:challenger /home/challenger/.ssh
sudo chmod 700 /home/challenger/.ssh
sudo chmod 600 /home/challenger/.ssh/authorized_keys

# 挑戦者の公開鍵を追記（echo + tee -a。cat ではない、クォート必須）
echo "ssh-ed25519 AAAA...（完全な1行）... user@host" \
    | sudo tee -a /home/challenger/.ssh/authorized_keys

# 確認（各行が独立した1行になっているか）
sudo cat /home/challenger/.ssh/authorized_keys
```
- 留意点:
  - 公開鍵は必ず1行。コピペで改行が混入すると認証失敗（折り返しに注意）
  - スペースは「種類の後」「鍵本体の後（コメント前）」の2箇所だけ
  - 自分の公開鍵は登録したまま残してOK（公開鍵は何個でも安全。秘密鍵だけは配らない）
  - 管理者(murabito)の鍵を挑戦者に流用させない（その鍵で sudo 管理者に入れてしまう）

### アプリの配置（/opt/ENquiz/）
- challenger の支配ツリー外（root所有）に置き、改ざん・削除・すり替えを防ぐ
```bash
sudo mkdir /opt/ENquiz
# 必要なものだけ選んでコピー（旧版・Python・.bak は檻に不要）
sudo cp ~/English_vocab_quiz/VPS_quiz.sh    /opt/ENquiz/
sudo cp ~/English_vocab_quiz/ask.ct.sh      /opt/ENquiz/
sudo cp ~/English_vocab_quiz/percentage.sh  /opt/ENquiz/
sudo cp ~/English_vocab_quiz/config.sh      /opt/ENquiz/
sudo cp -r ~/English_vocab_quiz/data.d      /opt/ENquiz/

# 入口だけ実行権（直接実行されるため）。他は読めれば bash 経由で動く
sudo chmod 755 /opt/ENquiz/VPS_quiz.sh
ls -la /opt/ENquiz
```
- 権限の最終形:
  - /opt/ENquiz : drwxr-xr-x root（入れる・書けない）
  - VPS_quiz.sh : 755（実行可・書けない）
  - 子スクリプト・config.sh : 644 / data.d 内CSV : 644（読める・書けない）
  - 全て root 所有 → challenger は改ざん・削除・すり替え不可

### なぜ /opt か
- /opt は「aptの外で自分で足したアプリ」の標準的な置き場（optional）。root所有ツリー
- ファイルの削除可否は親ディレクトリのwで決まる → challenger のホームに置くと、
  ディレクトリごと消して自作スクリプトにすり替えられる（檻が破れる）。
  /opt なら challenger はどの階層にも書き込めない

### ForceCommand の設定（/etc/ssh/sshd_config 末尾）
```
Match User challenger
    ForceCommand /opt/ENquiz/VPS_quiz.sh
    AllowTcpForwarding no
    X11Forwarding no
    PermitTunnel no
```
- Match ブロックは必ずファイル末尾（以降の設定を全部飲み込むため）
- 反映前に文法チェック: `sudo sshd -t`
- 反映: `sudo systemctl reload ssh`（reload なら既存接続は切れない＝締め出し防止）
- 鉄則: 現用の murabito セッションは閉じない（ミスしても直せる命綱）

### 檻のテスト
```bash
# 普通にログイン → クイズが起動し、終わると切断（シェルに降りない）
ssh -i ~/.ssh/id_ed25519_yourvps challenger@<IP>

# 任意コマンドを要求しても ForceCommand が無視してクイズが起動する（檻が効いている証拠）
ssh -i ~/.ssh/id_ed25519_yourvps challenger@<IP> "bash"
ssh -i ~/.ssh/id_ed25519_yourvps challenger@<IP> "cat /etc/passwd"
```

---

## 9. VPS用入口スクリプト（VPS_quiz.sh）の移植時の修正

ローカルでは動くスクリプトが ForceCommand 環境では動かなかった。修正したのは2ファイルのみ。

### 修正1: パスを「置き場所基準」に
- 原因: ForceCommand は /home/challenger を起点に起動するため、
  config.sh の `$HOME` や入口の相対パス呼び出しがズレる
- VPS_quiz.sh 先頭: `cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1`
- config.sh.example: `SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`、
  `DATA_DIR="$SCRIPT_DIR/data.d"`
- 入口で一度 cd すれば子スクリプトはカレントを引き継ぐので、ask.ct.sh / percentage.sh は無修正

### 修正2: 問題数を対話入力に
- 原因: ForceCommand は引数なしで起動するため $1 が空 → shuf / percentage がエラー
- 対応: `read -p "何問挑戦する？ " HOWMANY` で受け取り、範囲チェック後に子へ渡す
- 入力検証: `[ "$HOWMANY" -gt 0 ] 2>/dev/null && [ "$HOWMANY" -lt 999 ] 2>/dev/null`、
  while true で有効な入力まで聞き直す

### 修正3: 一時ファイル掃除（同時接続のTMP衝突は名前方式で解決予定）
- 掃除: `trap '[ -n "$TMP_DIR" ] && rm -rf "$TMP_DIR"' EXIT`
- TMP衝突対策: $$ で分けようとしたが、$$ はスクリプトごとに変わり親子で TMP_DIR が
  ズレて失敗。`export QUIZ_SESSION="$$"` で直す案もあったが、TMP区別のためだけに
  導入するのは過剰と判断。どうせ作るスコア機能の「名前登録」で TMP も区別する方針に統合。
  現状は TMP衝突は未対応のまま保留（少人数想定なので同名の同時接続はまず起きない）

### 反映フロー（重要）
```
ローカルで修正 → git push
VPS: git pull → cp config.sh.example config.sh
VPS: sudo cp ~/English_vocab_quiz/VPS_quiz.sh /opt/ENquiz/   # /opt への再コピー必須
VPS: ls -la で権限確認、必要なら sudo chmod 755
VPS: murabito で /opt/ENquiz/VPS_quiz.sh をテスト → challenger で最終テスト
```
- 留意: git pull で更新されるのは ~/English_vocab_quiz。檻が見る /opt/ENquiz は別物。
  再コピーと chmod 確認を忘れると更新が反映されない

---

## 10. 残タスク（更新）

- [x] 挑戦者用ユーザー challenger の作成（sudoなし／ForceCommandでクイズ自動起動／操作制限）
- [x] 鍵認証で挑戦者を受け入れ（設計B：各自が鍵を作り公開鍵だけ登録）
- [x] 公開（友達が `ssh -i quiz_key challenger@<IP>` でクイズに挑戦できる状態）
- [ ] スコア保存機能（名前で登録・認証 → name_score に追記 → tail -5 で前回表示）
      置き場所: 本体は /opt（書けない）、スコアは challenger のホーム（書ける）
      最初の一歩:
      ```bash
      sudo mkdir -p /home/challenger/scores
      sudo chown challenger:challenger /home/challenger/scores
      sudo -u challenger touch /home/challenger/scores/tanaka_score  # 登録=空ファイル
      ```
- [ ] 檻の最終確認（ssh "bash" / "cat" が弾かれるか、Ctrl+C でシェルに落ちないか）
- [ ]（応用）fail2ban で不正ログイン試行の自動ブロック
- [ ]（応用）CSVの秘匿（カンニング対策の強化、sudo限定実行など）
- [ ] スクリプトの整理（重複ファイルの統合・命名統一）

---

## 11. 学んだこと（続き）

- ForceCommand はログインシェル変更より強い檻。`ssh user@IP "bash"` でのシェル奪取、
  SFTP、ポートフォワーディングも塞げる。シェルは /bin/bash のままでよい
- ファイルを守る本質は「相手の所有ツリーの外に置く」こと。
  権限を絞っても、親ディレクトリが相手所有なら入れ物ごと消せる（削除可否は親dirのwで決まる）
- 実行権(x)が要るのは「直接実行される入口」だけ。`bash file` は r で動く（権限の最小化）
- ForceCommand は引数を渡せない → 対話入力(read)で受け取る
- $$ はプロセスごとに変わる（親子でズレる）。複数スクリプトで共通の一時ディレクトリを
  使うには親で export して環境変数として子に引き継ぐ必要がある。
  ただし今回は対症療法せず、スコア機能の「名前登録」にTMP区別を統合する方針にした
- trap '...' EXIT で、Ctrl+C 中断時も含めて確実に後始末できる
- 公開鍵は1行・スペース2箇所が厳守。コピペの改行混入が認証失敗の典型原因
- リポジトリの更新と /opt の実体は別。反映は cp + chmod 確認までが1セット
- ssh-keygen は OS 共通。`-f` で鍵名を分け、既存鍵の上書き事故を防ぐ
