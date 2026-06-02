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

## 学んだコマンド・概念

### Shell
- `shuf -n N file` : ランダムにN行抽出
- `cut -d',' -f1` : 区切り文字指定でフィールド抽出
- `while IFS=',' read -r a b` : 1行をカンマで分割して変数a,bに格納
- `read -p "msg" var` : プロンプト付き入力
- `</dev/tty` : 現在の端末（キーボード）を指定
- `if [ "$a" = "$b" ]` : 文字列比較（スペース必須、変数は $ で囲む）
- `-e` / `-nt` : ファイル存在 / 更新時刻比較
- `||` / `&&` : OR / AND（条件接続のモダンな書き方）
- `mkdir -p` : 親ディレクトリも作る、既存でもエラーにしない
- `source` vs `bash` : 同じシェルで実行 vs 子プロセスで実行
- `bash -x script` : 実行を1行ずつトレース表示（デバッグの定番）
- `${#変数}` : 変数の文字数を取得（パラメータ展開の一種、UTF-8環境では文字数）
- `cat -A` : タブを ^I、全角スペースを M-cM-^@M-^@、CR を ^M と可視化。
  不可視文字バグの診断に必須
### Git
- `git pull` を作業前に習慣化
- `git config --global pull.rebase false` : マージ方式での統合

### 設計の概念
- 設定の外部化（config.py / config.sh）と .gitignore での保護
- 一時データは /tmp/ 配下、サブフォルダで名前空間分離
- 言語ごとに変数のスコープは独立
- grepなど重い処理は必要になった時だけ行うようにする
- 無入力を最初に弾くことで処理を軽くする
