# 開発ログ - English Vocab Quiz

LPIC学習と並行したPython + Shellクイズアプリ開発の記録。設計判断・実装の進捗・エラーと解決法・学んだことをまとめる。

## 設計方針

- Python: ExcelをCSVに変換する部品（wordqz.py, phraseqz.py）
- Shell: CSVを読んでクイズを出題する指揮役（English_vocab_quiz.sh, ask.sh）
- Unix哲学「小さな部品を組み合わせる」を実践
- 設定は config.py（Python用）と config.sh（Shell用）に分離し .gitignore で除外

## 制作過程・設計判断

### 言語・環境の選択
- 選択肢: Python / HTML・JS / Bash、環境は VirtualBox / WSL
- 決定: Python + WSL
- 理由: キャリア的にも次に来る言語。WSLはExcelが /mnt/c/ から直接読めて楽

### どこで動かすか
- 選択肢: ターミナル(CLI) / デスクトップ(GUI) / Web
- 決定: ターミナル版
- 理由: Python基礎が全部学べる、LPICと相性が良い。まず動くものを作り見た目は後回し

### クイズの出題形式
- 選択肢の変遷:
  1. 記述式（意味を入力）
  2. スペル並べ替え
  3. スペルを1文字ずつ4択で組み立て
- 決定: 2モード（意味入力モード + スペル4択組み立てモード）
- 理由: 意味入力＝思い出す力、スペル組み立て＝書く力、両方を鍛えられる
- 現状: 意味入力モードを実装完了

### 正誤判定の方式1
- 選択肢:
  1. 完全一致（[ "$answer" = "$meaning" ]）
  2. 部分一致（grep "$answer"）
- 検討:
  - 1: 厳密だが、意味が長く区切りも多くほぼ正解できない
  - 2: 柔軟だが、1文字や空入力でも正解扱いになる
- 決定: 暫定で部分一致（ask.grp.sh）を実装後テストしたが、別の方法を探す
- 理由: 一文字でも正解になるデメリットと無入力も正解になるエラーが起こったため

### 正誤判定の方式2
前回（方式1）の残課題:
  - 課題A: 1文字入力でも部分一致して正解になる
  - 課題B: 空入力（grep ""）で全行マッチして必ず正解になる

---

#### 課題A: 1文字入力対策
- 選択肢:
  1. 完全一致に戻す 
  2. 入力長チェック（${#answer} -lt 2 で弾く）｛デメリット：「蚊」など一文字を弾く可能性｝
- 検討:
  - 2: 短すぎ入力を弾けるが、その場で「不正解」扱いだと学習体験が悪い
       → 弾いた後に「再入力させる」と組み合わせれば解決できる
  - 2: 「蚊」のような一文字単語に対しては入力長チェックの前に"if = "で完全一致チェックを入れることで解決可能
- 決定: 2 + 再入力ループ + 完全一致チェック
- 理由: LINUC範囲内の制御構造で実装可能。柔軟さと最低限の厳密さを両立
- 実装: while true + break/continue で内側ループを構築。
        ${#answer} -lt 2 のとき continue で再入力、それ以外は判定後に break
        if [ "$answer" = "$meaning" ] を入力長チェックの前に置き、一文字単語への対策
#### 課題B: 空入力対策
- 選択肢:
  1. -z "$answer" で空判定を最上段に置き skip 扱い
  2. 課題Aの入力長チェック（-lt 2）で空も同時に弾く
- 検討:
  - 1:「skip」と明示すれば意図的なスキップとしてUI上自然
  - 2: 0文字も「2文字未満」に含まれるので、課題Aの対策で自動的にカバーされる
- 決定: 1（明示的に skip 扱い）
- 理由: 「短すぎる(うろ覚え)」と「空(スキップ意図)」は意味が違うので
        メッセージを分けた
- 実装: if [ -z "$answer" ] を分岐の最上段に置き、"skip" 表示後に break

---

- 残課題:
  - 入力長チェックの副作用で、正解の一部だけ入力した短い回答
    （例: 正解 "薬品" に対して「薬」と入力）は弾かれる
  - 「正しい回答だが短い」と「不正な入力」を区別できない

### スコア集計の実装
- 課題: クイズ終了後に正解数と正解率を表示したい
- 選択肢:
  1. ask.grp.sh の中にカウンタ変数を持たせ、終了時に表示
  2. ask.grp.sh の出力を tee でファイルに記録し、別スクリプトで集計
  3. ask.grp.sh が結果マーカーをファイルに直接書き込み、別スクリプトで集計
- 検討:
  - 1: 1スクリプト完結で簡潔だが、ask.grp.sh の責務が増える
  - 2: 「出題と判定」「集計」を分離できるが、tee と対話入力の相性問題が発生（後述）
  - 3: 責務分離 + パイプ干渉なしで安全
- 決定: 暫定で 2（proto.ENquiz.sh + percentage.sh の構成）
- 理由:
  - Python=部品、Shell=指揮 の方針の延長で、Shell 同士も役割分担したい
  - bc を使った小数計算の練習を兼ねる
- 残課題: tee と対話入力の干渉問題が判明 → 3 の方式への移行を検討中

### 結果マーカーの選択
- 課題: grep -c で正解数をカウントしたいが、「正解」が「不正解」の部分文字列
        となり、両方カウントされてしまう（全問正解扱いの誤判定）
- 選択肢:
  1. grep -c "^正解$" のように行全体一致で対処
  2. マーカー自体を別文字（○/✕）に変える
- 検討:
  - 1: ask.grp.sh は変更不要だが、表示そのものは「正解」「不正解」のまま
       → 将来 grep ではなく他のツールで集計するときも同じ問題が再発する
  - 2: 表示も変わるが、文字列としての独立性が確保される
- 決定: 2（○/✕）
- 理由:
  - 集計ロジックがシンプルになる（grep -c "○" だけで済む）

### 再入力ループの実装方針
- 課題: 不正な入力（1文字以下など）の際、次の問題に進まず同じ問題で再入力させたい
- 検討した案:
  1. 同じif構文を繰り返す → DRY違反、コードが膨らむ
  2. 外側ループ（while IFS read）で continue → 「次の単語」に進んでしまう
  3. 内側に while true ループを作り、continue/break で制御
- 決定: 3（while true + break/continue による二重ループ構造）
- 理由:
  - 「単語を順に出す」外側ループと「1問の入力を試行する」内側ループで
    責務を分けると、continue/break の作用範囲が明確になる
  - LPIC 102 範囲内の制御構造（while/break/continue）だけで実装できる

### アーキテクチャ（構成）
- 選択肢: 全部Python / 全部Shellscript / Python部品+Shellscript指揮
- 決定: Python（Excel→CSV変換）+ Shellscript（クイズ本体）
- 理由: Shellスクリプトを自分で書くことがLPIC学習に直結。Pythonは苦手なのでAIに任せ、Shellは自分で書く

### データの扱い
- 決定1: Excel直読みではなくCSV経由 → シェルがIFSで分割しやすい
- 決定2: Excelパスを config.py / config.sh に分離し .gitignore で除外
- 決定3: CSV出力先を /tmp/ENquiz/ に変更 → 一時データの標準的な置き場所、サブフォルダで他アプリと分離
- 理由: Excelは人間用（編集）、CSVは機械用（処理）と役割分担

### CSV鮮度チェックの導入
- 選択肢: 毎回再生成 / なければ作る / 更新検知
- 決定: 更新検知（CSVより新しいExcelがあれば再生成）
- 仕組み: `-nt` 演算子で Excel と CSV の更新時刻を比較
- 利点: 速度と鮮度の両立、Excelに加筆したら自動反映

### 学習スタイル: 同じ機能を2バージョン作る
- wr_simplequiz.sh: 表示のみ（while readの練習）
- ask.sh: 答え合わせ機能付き（本番版）
- 段階的に機能を足すことで、各部品を理解しながら進められた

### 設定の言語間共有問題
- Pythonの config.py の変数はシェルからは見えない
- 検討した案: シェルに直書き / .env環境変数 / Pythonから読む / config.sh で並列管理
- 決定: config.sh を Python の config.py と並列に作る
- 理由: Python側との対称性、シェルだけで完結、シンプル

### VPS版の導入経緯
- きっかけ: クイズを他人に挑戦してもらいたい
- 方針: さくらVPS上にアプリを置き、SSHログインして遊んでもらう
- 副次的な目的: LPIC学習（SSH・ユーザー管理・ufw・パーミッション）の実践
- ローカル(WSL)版との根本的な違い:
  - ローカル: Excel → Python変換 → CSV → クイズ
  - VPS: Excelがない → 変換しない → CSVは転送済み → クイズのみ
  - → 同じアプリでも「動かす環境」で必要な処理が違う

### ローカル版とVPS版の構成の違い
| 項目 | ローカル(WSL) | VPS |
|------|--------------|-----|
| Excel変換 | する（put.data.test.sh） | しない |
| Python/venv | 必要（openpyxl） | 不要 |
| CSV | Excelから生成 | scpで転送済み |
| 鮮度チェック | する（-ntでExcel比較） | しない（Excelがない） |
| 入口スクリプト | complete.ENquiz.sh（変換込み） | play.sh（クイズのみ） |
| 共通部品 | ask.ct.sh / percentage.sh | ask.ct.sh / percentage.sh |

- 判断: 入口（エントリポイント）を環境別に2つ用意し、出題・集計は共通部品として再利用
- 理由: Unix哲学「小さな部品を組み合わせる」。部品（ask.ct.sh, percentage.sh）は共通、
        組み合わせる入口だけ環境ごとに変える

### コード・データ・設定の分離
- 課題: ローカルとVPSで「同じアプリ」を動かしたい。でも環境固有の値（パス等）は違う
- 決定: 3つを分離し、それぞれ適した経路で扱う
  - コード → git（共通、バージョン管理）
  - データ(CSV) → scp（環境ごとに転送、リポジトリには載せない）
  - 設定(config.sh) → 各環境で作成（git管理外）
- 理由:
  - 「clone + 設定だけ用意すれば、誰のどの環境でも動く」を実現したい
  - 単語データを公開リポジトリに載せたくない
- 教訓: 環境差は「コードを書き換える」のではなく「設定で吸収する」のが正しい

### 設定ファイルの設計（config.sh と設計図）
- 課題: パスが複数スクリプトにベタ書きで散らばっていた（/tmp/ENquiz/... など）
- 決定:
  1. パスを変数化し、config.sh に集約（DATA_DIR, TMP_DIR, SHUF_FILE, COUNT_FILE）
  2. $HOME を使い、ユーザー名をハードコードしない（移植性）
  3. config.sh.example（設計図）をリポジトリに含め、実物 config.sh は .gitignore で除外
- 変数化の理由（4つ）:
  - 重複を減らす（DRY）— 同じパスが複数箇所に出るのを1箇所に
  - 可読性 — 変数名で「何のパスか」が分かる
  - 将来の変更 — パスを変えたいとき1箇所で済む
  - 移植性 — $HOME を使えば、cloneした他人の環境でも動く
- 設計図(config.sh.example)の役割:
  - 「どんな変数を設定すべきか」を示すテンプレート
  - cloneした人は `cp config.sh.example config.sh` して自分の環境に合わせる
  - 環境ごとに必要な設定だけ使う（例: VPSでは EXCEL_PATH 不要、DATA_DIR が本質）

### 開発フローの方針（本番で直接編集しない）
- 決定: コードはローカルで開発 → git push → VPSで git pull
- 理由:
  - 本番サーバーで直接書き換えると、ミスでサービスが止まる
  - 変更履歴がGitHubに残らない
- 例外: 設定(config.sh)は環境固有なので各環境で直接作成（git管理外）

### スコア集計とtee問題の回避
- 当初: クイズ出力を tee でファイルに記録し、別スクリプトで集計しようとした
- 問題: tee へのパイプで対話入力（read）のプロンプトが壊れる
- 決定: tee をやめ、ask.ct.sh が判定ごとに結果（1/0）を COUNT_FILE に直接書き込む
- 集計（percentage.sh）は COUNT_FILE を読んで正解数・正解率を計算
- 正解率に応じたメッセージを表示

### 挑戦者をどう受け入れるか（鍵の配布方式）
- 課題: 他人にVPSのクイズを遊んでもらいたい。鍵をどう渡すか
- 選択肢:
  1. 管理者が1つの鍵ペアを作り、秘密鍵を全員に配る
  2. 挑戦者が各自で鍵ペアを作り、公開鍵だけ送ってもらう（設計B）
- 検討:
  - 1: 楽だが、全員が同じ秘密鍵 → 1人漏らせば全員作り直し、誰のアクセスか追えない
  - 2: 秘密鍵が各自の手元から一度も出ない。1人外したい→その行を消すだけ
- 決定: 2（設計B）
- 理由: セキュリティの原則「秘密鍵は作った本人の手元から動かさない」。
        authorized_keys に tee -a で公開鍵を1行ずつ追記して挑戦者を増やせる
- 補足: 自分のテスト鍵は challenger に登録したまま残してOK
        （公開鍵は何個登録しても安全。配ってはいけないのは秘密鍵だけ）

### 「クイズしかできない檻」をどう作るか
- 課題: challenger をログインさせるが、クイズ以外（シェル・ファイル閲覧）はさせたくない
- 選択肢:
  1. ログインシェルを VPS_quiz.sh に変える（usermod -s）
  2. ForceCommand でクイズを強制実行（シェルは /bin/bash のまま）
- 検討:
  - 1: 一見檻に見えるが穴だらけ。`ssh challenger@IP "bash"` でシェルを直接奪える、
       SFTP/ポートフォワーディングも通る
  - 2: SSHのどの経路でも強制的に VPS_quiz.sh に差し替わる。穴を塞げる
- 決定: 2（ForceCommand）
- 理由: ログインシェル方式は「対話ログインだけ」を想定した入口の話で、
        SSHが持つ他の経路（コマンド直接実行・SFTP・トンネル）をカバーしない。
        ForceCommand は経路を問わず蓋をする
- 実装: /etc/ssh/sshd_config の末尾に
  ```
  Match User challenger
      ForceCommand /opt/ENquiz/VPS_quiz.sh
      AllowTcpForwarding no
      X11Forwarding no
      PermitTunnel no
  ```
- 留意: Match ブロックは「以降の行を全部そのブロックに飲み込む」ので必ずファイル末尾に置く

### アプリ本体をどこに置くか（改ざん・削除の防止）
- 課題: challenger がクイズ本体やCSVを書き換え・すり替えできてしまうと檻が破れる
- 選択肢:
  1. challenger のホーム（/home/challenger/）
  2. /opt/ENquiz/（root所有ツリー）
- 検討:
  - 1: ホームは challenger 所有 → ディレクトリごと rm して自作スクリプトに置き換え可能。
       ファイルの権限を絞っても、親ディレクトリが本人所有なら入れ物ごと消せる。
       さらに所有者は自分の領域の権限を chmod で付け直せる → 主導権を相手に握られる
  - 2: /opt も / も root 所有 → challenger はどの階層にも書き込めない＝すり替え不可
- 決定: 2（/opt/ENquiz/）
- 理由: 「ファイルの削除・リネーム可否は、そのファイルではなく親ディレクトリのwで決まる」。
        本体を守るには、置き場所そのものを相手の所有ツリーの外に出す必要がある
- 補足: /opt は「aptの外で自分で足したアプリ」の標準的な置き場（optional）。
        /usr/local でも可だが、一式まとめて置く今回は /opt が素直。
        /usr/bin 等は apt 管理領域なので手置き厳禁

### 権限設計（実行はできる・書き換えはできない）
- 決定:
  - ディレクトリ /opt/ENquiz : drwxr-xr-x（challengerは入れる・書けない）
  - 入口 VPS_quiz.sh : 755（実行可・書けない）
  - 子スクリプト・config.sh : 644（読める・書けない）
  - data.d/ : drwxr-xr-x、CSV は 644（challengerは読めるが書けない）
  - 全て root 所有
- 判断: 実行権(x)が必要なのは「直接実行される入口」だけ。
        子スクリプトは `bash ask.ct.sh` の形で呼ばれる＝bashが読むだけなので r で足りる
- カンニング対策について:
  - CSV は 644 で challenger が読める状態だが、ForceCommand により手動 cat の経路が塞がれる
    （`ssh challenger@IP "cat word.csv"` も無視されてクイズが起動する）ため実用上は防げる
  - 厳密なCSV秘匿（root専有＋特権実行）は応用課題として保留。
    シェルスクリプトの setuid は Linux で無効なので、やるなら sudo の限定許可で代替

### ForceCommand 環境でのパス解決（最大のハマりどころ）
- 課題: ローカルでは動くのに、challenger の ForceCommand 経由だと動かない
- 原因: ForceCommand は challenger のホーム（/home/challenger）を起点に起動する
  - config.sh の `DATA_DIR="$HOME/..."` → challenger実行時は /home/challenger を指す
  - 入口の `bash ask.ct.sh`（相対パス）→ カレントがズレてファイルを見つけられない
- 決定: 「実行者」でも「実行場所」でもなく「スクリプトの置き場所」を基準にする
  - config.sh 先頭: `SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`、
    `DATA_DIR="$SCRIPT_DIR/data.d"`
  - VPS_quiz.sh 先頭: `cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1`
- 理由: 入口で一度 cd すれば子スクリプトはカレントを引き継ぐので、ask.ct.sh /
        percentage.sh は無修正のまま相対パスで動く（修正は入口とconfigの2ファイルだけ）
- 教訓: 「ファイルの置き場所」と「起動時の居場所(カレント)」は別物。
        スクリプトは「どこにあるか」ではなく「どこから実行されたか」で相対パスを解決する

### 問題数の受け取り方（引数 → 対話入力へ）
- 課題: ForceCommand は引数なしで起動するため $1 が空になり、shuf / percentage がエラー
  （`ssh challenger@IP "VPS_quiz.sh 5"` のように引数を渡す経路は ForceCommand が無視する）
- 選択肢:
  1. ForceCommand に固定で問題数を書く（/opt/ENquiz/VPS_quiz.sh 5）
  2. スクリプト内で read で対話的に聞く
- 決定: 2（read で対話入力）
- 理由: 引数経路が塞がれていても対話入力なら檻の中で完結する。挑戦者が毎回選べてUIとして自然
- 実装: `read -p "何問挑戦する？ " HOWMANY` で受け取り、子スクリプトに引数で渡す
- 入力検証: `[ "$HOWMANY" -gt 0 ] 2>/dev/null && [ "$HOWMANY" -lt 999 ] 2>/dev/null` で
  範囲チェック。`2>/dev/null` で文字列入力時の「integer expression expected」エラーを伏せ、
  else（再入力）に流す。while true ループで有効な入力まで聞き直す

### 同時接続時の一時ファイル衝突
- 課題: 複数人が同時にログインすると、一時ファイル（COUNT_FILE 等）を奪い合う
- 選択肢:
  1. TMP_DIR="/tmp/ENquiz_$USER"
  2. TMP_DIR="/tmp/ENquiz_$$"（プロセスID）
  3. 親で export QUIZ_SESSION="$$" し、config で ${QUIZ_SESSION:-$USER}
  4. スコア機能で導入するユーザー名で区別する
- 検討:
  - 1: 挑戦者は全員 challenger なので $USER が同じ → 分離できず衝突
  - 2: $$ はスクリプト（プロセス）ごとに変わるので、VPS_quiz.sh / ask.ct.sh /
       percentage.sh で値がバラバラに → 書く場所と読む場所がズレてバグった（試して失敗）
  - 3: 親で $$ を確定して export すれば親子で共通化でき、接続ごとに分離もできる。
       が、TMP区別のためだけに恒久導入するのは過剰
  - 4: どうせスコア機能で名前を read で登録・認証する。その名前を TMP 区別にも使えば
       1つの仕組みで両方を解決できる
- 決定: 4（名前ベースに統合）。$$ の暫定対応（3）は採用せず保留
- 理由:
  - 個人の成績問題と同時に解決できる方法を思いついたから
  - 少人数想定なので、同じ名前で同時に2接続する状況はまず起きない → 名前で十分
  - 機能を増やさず、スコア機能の名前管理に TMP 区別を吸収できる（重複を避ける）
- 現状: TMP衝突は未対応のまま。スコア機能（名前登録）の実装時にまとめて解決する

### 一時ファイルの掃除（trap）
- 課題: クイズ終了時に一時ディレクトリを片付けたい。Ctrl+C 中断でも残したくない
- 決定: `trap '[ -n "$TMP_DIR" ] && rm -rf "$TMP_DIR"' EXIT` を冒頭に置く
- 理由: trap ... EXIT は「正常終了でもCtrl+Cでもエラーでも、終了時に必ず実行」を保証。
        末尾に rm を書く方式だと break/正常終了時しか掃除されない
- 安全策: `[ -n "$TMP_DIR" ] &&` を挟む。万一 TMP_DIR が空だと `rm -rf ""` が
        予期せぬ場所を消す事故になるため、空でないことを確認してから消す
- 補足: /tmp は再起動で消え、systemd-tmpfiles が定期削除もするので「無限に溜まる」事態は
        起きないが、終了時掃除を入れると行儀がよい
- 限界: kill -9 やクラッシュは trap でも捕まえられない（/tmp の仕組みが最終的に片付ける）

### スコア保存機能の設計（実装は次回）
- 課題: 挑戦者ごとに成績を保存し、前回結果を表示したい
- 方針（決定済み）:
  - 名前を read で入力 → 登録ファイル（name_score）の有無で認証
    → なりすまし・表記ゆれ・不正文字を排除（自由入力は表記ゆれ等で管理が崩れるため）
  - name_score に `>>` で成績を追記、`tail -5` で前回までの結果を表示
  - TMP区別にも名前を使う（少人数想定のため $$ までは不要と判断）
- 置き場所の設計:
  - 本体は /opt（書けない＝改ざん防止）、スコアは challenger のホーム（書ける＝追記のため）
    → 役割が逆（本体は「書かれたくない」、スコアは「書きたい」）
  - challenger がスコアを改ざんする心配は ForceCommand が守る
    （シェルに降りられないので手で書き換える経路がない）
  - パスは $HOME ではなくベタ書き（/home/challenger/scores）推奨。$HOME は実行者で変わるため
- 名前入力時の注意: 登録ファイルの存在チェックに加え、念のため英数字チェック
  `[[ "$NAME" =~ ^[a-zA-Z0-9_]+$ ]]`（`../` 等によるパストラバーサル対策）
- 実装の段階:
  1. 1人でスコア追記 + tail 表示を動かす（置き場所・権限を確定）
  2. 登録チェック（_score ファイルの有無で認証）
  3. TMP を名前で区別

## 実装の進捗

### Python部品（完成）
- wordqz.py: 単語ログを /tmp/ENquiz/word.csv に出力
- phraseqz.py: フレーズログを /tmp/ENquiz/phrase.csv に出力
- put.data.test.sh: 上記2つを呼び出してCSVを一括生成、venv有効化込み

### Shellメインスクリプト（完成）
- English_vocab_quiz.sh: エントリポイント
  - config.sh を source して EXCEL_PATH を取得
  - CSVが無い、または古ければ put.data.test.sh で再生成
  - 最新なら ask.sh をそのまま実行
- ask.sh: クイズ本体
  - 引数で出題数を受け取る（bash ask.sh 5 で5問）
  - shuf でランダム抽出、while IFS=',' read で1行ずつ単語と意味を取得
  - read -p で意味を入力させ、if [ ] で正解判定
  - 不正解時は正解を表示
- test.grp.ENquiz.sh: エントリポイント
  - English_vocab_quiz.shのask.shをask.grp.sh で代替
-  ask.grp.sh: クイズ本体（部分一致版）
  - 基本構造は ask.sh と同じ（shuf でランダム抽出、while IFS read で出題）
  - 判定を完全一致から grep による部分一致に変更
  - 入力バリデーション: 空入力（-z）と1文字以下（${#answer} -lt 2）を弾く
  - 再入力ループ: while true + break/continue で構築
    - 短すぎ入力 → continue で同じ単語の再入力
    - skip / 正解 / 不正解 → break で内側ループを抜けて次の単語へ
   　- proto.ENquiz.sh: スコア集計付きのエントリポイント
  - test.grp.ENquiz.sh を呼び出してクイズを実行
  - 続けて percentage.sh で正解率を計算・表示
- percentage.sh: 正解率の計算
  - /tmp/ENquiz/answer.tmp から ○ の行数をカウント
  - bc で小数1桁の正解率を計算（scale=1）
  - 出力例: 1/5問正解（20.0%）
- ask.grp.sh: 結果マーカーを ○/✕ に変更
  - 「正解」「不正解」のままでは grep -c "正解" が両方にマッチしてしまうため
## Troubleshooting

### Pythonまわり

#### venv（externally-managed-environment エラー）
- 問題: pip install で PEP668 エラー
- 原因: Ubuntu 24系はシステムPythonを保護している
- 解決: python3 -m venv .venv で仮想環境を作る

#### OneDriveのExcelファイルが見つからない
- 問題: FileNotFoundError で config.py のパスが無効
- 原因: OneDriveの同期状態やフォルダ構造の変化でパスが変わる
- 解決: find /mnt/c/Users/<user> -iname "*TOEIC*" で現在地を探し、config を更新
- 教訓: クラウド同期パスは動的。設定を外部化しておくと修正が一箇所で済む

#### Pythonコード内にリダイレクト > を書いてSyntaxError
- 問題: print(...) > file.csv と書いてエラー
- 原因: > はシェルのコマンド。Pythonコード内では使えない
- 解決: 実行時に python wordqz.py > csv.d/word.csv とする

### Git/GitHub

#### push が email privacy で拒否
- 問題: push declined due to email privacy restrictions
- 原因: commitのメールがGitHubで非公開設定
- 解決: noreplyアドレスを git config に設定 → git commit --amend

#### push が rejected（fetch first）
- 問題: GitHub Webで作ったファイルがWSLになく、pushが拒否された
- 原因: リモートにローカルが持っていないcommitがある
- 解決: git config --global pull.rebase false → git pull → git push
- 教訓: 作業開始前に git pull する習慣をつける

### Shellスクリプト


#### head -i は存在しない
- 問題: head -i shuf.txt がエラー
- 原因: head の行数指定は -n。-i は存在しない
- 解決: そもそも1行ずつ処理は while read が定番

#### cut で他フィールドが消える
- 問題: shuf | cut -f1 > a.txt の後、cut -f2 で意味が取れない
- 原因: パイプは使い捨て、元データが残らない
- 解決: 一度ファイルに保存してから複数回 cut、または while IFS read で一度に取り出す

#### if [ ] のスペース忘れ
- 問題: if ["$answer" = "meaning"] が動かない
- 原因1: [ はコマンドなので前後にスペース必須
- 原因2: 比較に変数を使うには $ を付ける（"meaning"は文字列、"$meaning"が変数）
- 解決: if [ "$answer" = "$meaning" ]

#### while read のループ内で read が CSV を食う
- 問題: ユーザー入力の前にCSVの次行が answer に入る
- 原因: done < shuf.txt でループ全体がファイル入力中、ループ内の read も同じソースから読む
- 解決: read -p "..." answer </dev/tty でキーボードから読むよう明示
- 教訓: bash -x でデバッグすると変数の中身が見えて原因特定が速い

#### /tmp 配下にCSV出力したらディレクトリ無しでエラー
- 問題: No such file or directory: '/tmp/ENquiz/word.csv'
- 原因: /tmp/ENquiz ディレクトリが存在しない、> は親ディレクトリを自動作成しない
- 解決: mkdir -p /tmp/ENquiz で先に確保
- 教訓: ファイル書き込み前にディレクトリの存在を確保。-p で再帰作成＆既存OK

#### シェル変数代入のスペース問題
- 問題のコード:
```bash
  EXCEL_PATH = "/path/..."
```
- 実行結果: `EXCEL_PATH: command not found`
- 原因: シェルは `=` の前後にスペースがあると「コマンド実行」と解釈
- 解決:
```bash
  EXCEL_PATH="/path/..."
```
- 教訓: Pythonと違い、シェルでは `=` の前後にスペースを入れない

#### シェルとPythonの変数共有
- 問題のコード:
```bash
  if /tmp/ENquiz/word.csv -nt EXCEL_PATH
```
- 原因: EXCEL_PATH は config.py の変数。シェルからは見えない（言語が違う）
- 解決: config.sh を別途作り、シェル側で source config.sh
- 教訓: 言語ごとに変数のスコープは別世界。共有したいなら環境変数か並列定義

#### vim のスワップファイル警告
- 問題: 編集再開時に「.config.sh.swp が既に存在」警告
- 原因: 前回のvim異常終了でスワップファイルが残った
- 解決: A(Abort)で抜けて、rm .config.sh.swp で削除してから再編集

#### continue が想定した場所に戻らない
- 問題のコード: while IFS=',' read のループ内で短すぎ入力時に continue
- 問題: 「同じ問題で再入力」を期待したが、「次の単語へスキップ」になった
- 原因: continue は「最も内側のループの先頭」に戻る。
        ここでの最内ループは while IFS=',' read だったため、
        次の単語の読み込みに進んでしまった
- 解決: 内側に while true ループを作り、その中で continue/break を使い分け

#### シェルスクリプトの不可視文字: 全角スペース混入
- 問題: `syntax error near unexpected token 'else'` だが、見た目のコードは正しい
- 原因: インデントに全角スペース（U+3000）が混入していた。
        IMEオンのまま空白キーを押した結果。
        bash は全角スペースを空白として扱わずコマンド名の一部として解釈するため、
        `　　　　then` という謎コマンドを実行しようとして失敗
- 解決:
  1. `cat -A ask.grp.sh` で不可視文字を可視化（全角スペースは `M-cM-^@M-^@` と表示）
  2. vim で `:%s/　/    /g` 一括置換、または sed -i で外から修正
 
#### SSH設定を変えても効かない（デフォルト値の罠）

- 問題: sshd_config で PasswordAuthentication がコメントアウトされているのに、
sshd -T では passwordauthentication yes だった
- 原因: 設定ファイルに明示がない項目は、SSHのデフォルト値（yes）が使われる
- 解決: コメントを外し、明示的に PasswordAuthentication no と書く

#### config.sh の変数が空になる（source忘れ）

- 問題: コマンドラインで cat $DATA_DIR/word.csv → /word.csv になりエラー
- 原因: $DATA_DIR は config.sh で定義。手動コマンドでは source していないので空
- 解決: 先に source config.sh するか、フルパスで書く

### Troubleshooting VPS檻まわり

#### ForceCommand 経由で引数が空になり shuf がエラー
- 問題: challenger ログイン時 `shuf: invalid line count: '/opt/ENquiz/data.d/word.csv'`、
        percentage.sh で `syntax error: operand expected`
- 原因: ForceCommand は VPS_quiz.sh を引数なしで起動する → $1 が空 →
        shuf がCSVパスを行数と誤解、bc に渡る式が壊れる
- 解決: read で問題数を対話入力し、$HOWMANY を子スクリプトに渡す
- 教訓: ForceCommand 環境では SSHコマンドの引数を渡せない。対話入力で受け取る

#### /opt への再コピー忘れでリポジトリ更新が檻に反映されない
- 問題: ローカルで直して push/pull したのに、challenger で古い挙動のまま
- 原因: git pull で更新されるのは ~/English_vocab_quiz。檻が見るのは /opt/ENquiz（別物）
- 解決: pull 後に必ず `sudo cp ~/English_vocab_quiz/VPS_quiz.sh /opt/ENquiz/`、
        `ls -la` で権限確認、cp で 644 に戻っていたら `sudo chmod 755`
- 教訓: 「リポジトリ」と「/opt の実体」は別。反映は cp + chmod 確認まで含めて1セット

#### $$ 化で count.txt が見つからない（親子でTMP_DIRがズレた）
- 問題: `grep: /tmp/ENquiz_66283/count.txt: No such file or directory`、正解率0%
- 原因: config.sh の `TMP_DIR="/tmp/ENquiz_$$"` を各スクリプトが source するたび、
        そのスクリプト自身のPID($$)で計算 → ask.ct.sh が書く場所と
        percentage.sh が読む場所がズレた
- 検討: 親で `export QUIZ_SESSION="$$"` して子に配れば直る。だが TMP 区別のためだけに
        導入するのは過剰 → どうせ作るスコア機能の名前登録で TMP も区別する方針に切り替え
- 解決: 暫定の export 対応は入れず、名前ベースのTMP区別（スコア機能と統合）で解決予定。
        現状は TMP衝突は未対応のまま保留
- 教訓: $$ はプロセスごとに変わる。複数スクリプトで共通の値を使うには、
        親で確定して export で引き継ぐ必要がある。
        ただし対症療法より、これから作る機能（名前管理）に吸収できないかを先に考える

#### 公開鍵のコピペで改行・スペースが混入し認証失敗
- 問題: 友達の公開鍵を authorized_keys に追記したが何度やっても認証が通らない
- 原因（複数回）:
  1. メッセージアプリが長い1行を折り返し、コピー時に改行が混入 → 複数行に割れた
  2. 鍵本体とコメントの間のスペースが消えてくっついた（`leb4Koshigure@`）
  3. `cat` で書こうとした（cat はファイル名と解釈する）/ `ssh-ed25519` が抜けた
- 解決: `echo "公開鍵の完全な1行" | sudo tee -a /home/challenger/.ssh/authorized_keys`、
        `sudo cat` で1行になっているか目視確認。割れていたら nano で改行を削除して繋げる
- 教訓: 公開鍵は必ず1行。スペースは「種類の後」「鍵本体の後（コメント前）」の2箇所だけ。
        コメント（user@host）は認証に使われないが、鍵本体が切れると認証は失敗する。
        書き込みは cat ではなく echo（文字列を出力）+ クォート（スペース対策）

#### sudo + リダイレクトでファイルに書けない（再確認）
- 問題: `sudo echo "..." > /home/challenger/.ssh/authorized_keys` が Permission denied
- 原因: sudo が効くのは echo だけ。リダイレクト > を処理するのは呼び出し側シェル
        （非昇格のmurabito権限）なので、root所有ディレクトリに書けない
- 解決: `echo "..." | sudo tee -a file`。tee 自体を sudo で昇格させると書き込みも root 権限
- 教訓: > はシェルの機能、tee は外部コマンド。sudo はコマンドにしか効かない


## 学んだコマンド・概念

### Shell
- `shuf -n N file` : ランダムにN行抽出
- `while IFS=',' read -r a b` : 1行をカンマで分割して変数a,bに格納
- `read -p "msg" var` : プロンプト付き入力
- `</dev/tty` : 現在の端末（キーボード）を指定
- `if [ "$a" = "$b" ]` : 文字列比較（スペース必須、変数は $ で囲む）
- `mkdir -p` : 親ディレクトリも作る、既存でもエラーにしない
- `source` vs `bash` : 同じシェルで実行 vs 子プロセスで実行
- `bash -x script` : 実行を1行ずつトレース表示（デバッグの定番）
- `${#変数}` : 変数の文字数を取得（パラメータ展開の一種、UTF-8環境では文字数）
- `cat -A` : タブを ^I、全角スペースを M-cM-^@M-^@、CR を ^M と可視化。
  不可視文字バグの診断に必須
  - `$(( var * 100 / total ))` : 算術展開。整数のみ扱える
- `echo "scale=1; $x / $y" | bc` : bc で小数計算（scale で小数桁数を指定）
- `$変数` だけで値が取り出せる。`` `echo "$変数"` `` のような二重取得は不要
### Git
- `git pull` を作業前に習慣化
- `git config --global pull.rebase false` : マージ方式での統合

### 設計の概念
- 設定の外部化（config.py / config.sh）と .gitignore での保護
- 一時データは /tmp/ 配下、サブフォルダで名前空間分離
- 言語ごとに変数のスコープは独立
- grepなど重い処理は必要になった時だけ行うようにする
- 無入力を最初に弾くことで処理を軽くする
- カウント対象の文字列は他の文字列の部分にならないものを選ぶ
- スクリプトを分けるとき、パイプ（tee 等）と対話入力の相性問題に注意
- コード・データ・設定の分離（git / scp / 各環境で作成）
- ハードコードを避ける: $HOME を使い、ユーザー名を埋め込まない（移植性）
- 設計図ファイル(.example): 設定の雛形をリポジトリに含め、実物は環境ごとに作る
- 入口（エントリポイント）を用途別に分け、共通部品を再利用する
- ファイルの削除・リネーム可否は「そのファイル」ではなく「親ディレクトリのw」で決まる。
  さらに上の階層まで含めて、相手の所有ツリーの外に置かないと本当には守れない
- 所有者は自分の所有物の権限を chmod で変更できる
  → 相手の所有領域にファイルを置くと、最終的な制御権を相手に握られる
- 「入口（実行される側）に実行権、中身は読めれば動く」で権限を最小化できる
- 脅威を分けて対策する: 改ざん・削除 → 置き場所(/opt)、読み取り(カンニング) → ForceCommand
- 環境ごとに変わる値は config、全環境共通の改善（パスの正しい書き方等）は .example に入れる
  → 1箇所直せば全環境に効く。VPS実物は cp config.sh.example config.sh で作り直す

### VPS・インフラ関連
- VPSは「24時間稼働の公開サーバー」。作業終了は shutdown ではなく exit（ログアウト）
- 公開サーバーには攻撃が常時来る。鍵認証のみ＋rootログイン禁止＋ufw で「突破されない」状態を作る
- `getent passwd <user>` / `getent group sudo` : NSS経由でユーザー/グループを問い合わせ
- `sshd -t` : SSH設定の文法チェック（再起動前の必須確認）
- `sshd -T` : 現在有効なSSH設定を全表示（デフォルト値も含む）
- `ufw allow 22/tcp` → `ufw enable` : SSHを許可してからファイアウォール有効化（順序厳守）
- `scp -i <鍵> <ローカル> <user>@<IP>:<リモート>` : 鍵指定でファイル転送
- ForceCommand : Match ブロックで特定ユーザーのSSH接続時に強制実行するコマンドを指定。
  ログインシェル変更より強く、`ssh user@IP "任意コマンド"` も差し替える
- Match ブロックは sshd_config の末尾に置く（以降の設定を全部そのブロックに飲み込むため）
- `sudo systemctl reload ssh` : 設定を読み直すが既存接続は切らない
  （restart より締め出しリスクが低い）。反映前に必ず `sudo sshd -t` で文法チェック
- AllowTcpForwarding no / X11Forwarding no / PermitTunnel no : トンネル・転送を禁止して
  踏み台化を防ぐ（ForceCommand と併用して檻を固める）
- authorized_keys は複数行可。各行が独立した「許可された公開鍵」。
  末尾コメント（user@host）で誰の鍵か識別でき、不要になったらその行を消すだけ
- ssh-keygen は OS 共通（Mac/Linux/WSL/Windows）。
  `-f ~/.ssh/名前` で出力先を指定し、既存鍵の上書き事故を防ぐ
- setuid はシェルスクリプトには効かない（Linuxの仕様）。特権実行が必要なら sudo の限定許可で代替
