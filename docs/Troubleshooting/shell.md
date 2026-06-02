# Troubleshooting

-開発中に遭遇したエラーと解決法の記録。「問題のコード → 実行結果 → 問題点 → 解決」の形式でまとめる。
以下のエラーを Troubleshooting 形式でまとめて。フォーマットは「問題のコード（該当箇所だけ）→ 問題点 → 解決 → 学んだこと」。GitHub Webに貼れるマークダウンで、コードは```bashで囲む。簡潔に。

【問題のコード（該当箇所）】
（エラーになった部分だけ貼る）

【実行結果/エラー】
（あれば）
【書いたコード】
（ここにコードを貼る）

【実行結果/エラー】
（ここに結果を貼る）
## 正しくheadが実行できない
### 問題のコード
```bash
for i in `seq 1 $1`
do
        head -i shuf.txt
done
```

### 実行結果
head: invalid option -- 'i'
Try 'head --help' for more information. とエラー

### 問題点
- `$10` : シェルは「10番目の引数」と解釈する（`$1` + 文字 "0" ではない）
- `head -i` : `-i` オプションは存在しない（行数指定は `-n`）
- `head -n i` にしてもhead: invalid number of lines: ‘i’
- そもそもiを１～コマンドの引数までの１ずつと認識しない
- ↑解決したが、headなので2以降はそれより前の行も表示するので重複する
### 解決
- head -n $i(-$i)としなければiを代入箇所と認識しない*そもそもheadが間違い
- head -$i shufw.txt|tail -1 で一行表示

## while read のループ内で ２つ目のread が CSV を読み込む

### 問題のコード
```bash
while IFS=',' read -r word meaning
do
    read -p "意味： " answer
    if [ "$answer" = "$meaning" ]
    ...
done < shuf.txt
```

### bash -x で確認した実行結果
```
+ read -p '意味： ' answer
+ '[' memo,社内文書 = 付け加える、末尾に追加する／添付する ']'
```
`answer` にユーザー入力ではなくCSVの次の行が入っていた。

### 問題点
- `done < shuf.txt` でループ全体がファイルから読み込み中
- ループ内の `read` も同じ入力源から取ろうとする
- 結果、CSVの次の行が `answer` に入ってしまう

### 解決
```bash
read -p "意味： " answer </dev/tty
```
ループ内の `read` に `</dev/tty` を付けて、キーボードから読むよう明示。

### 学んだこと
- `</dev/tty` は「現在の端末（キーボード）」を指す
- リダイレクト中のループ内で対話入力したい時の定番テクニック
- `bash -x` で変数の展開が見えてバグ特定が一発でできる

## シェルとPythonの変数共有問題

### 問題のコード
```bash
if /tmp/ENquiz/word.csv -nt EXCEL_PATH
```

### 問題点
- `EXCEL_PATH` は config.py（Python）で定義された変数
- シェルからは見えない（言語が違うため）
- 比較対象が「EXCEL_PATH」という文字列リテラルとして扱われ、エラー

### 解決
シェル用にもパスを定義：
```bash
EXCEL_PATH="/mnt/c/Users/.../file.xlsx"
```

### 学んだこと
- Pythonの変数とシェルの変数は別世界
- 共有したいなら環境変数（export）か、別途定義する
- if文は [ ] で囲む、前後にスペース必須

## シェルスクリプトの不可視文字: 全角スペース混入
### 問題のコード
```bash
if [ -z "$answer" ]
　　　　      then echo "skip"      # ← インデントが全角スペース
```
### 実行結果
見た目のコードは正しいのに構文エラー。
### 問題点
- インデントに全角スペース（U+3000）が混入
- IMEオンのまま空白キーを押すと混入する典型パターン
- bash は全角スペースを空白として扱わず**コマンド名の一部**と解釈
- 結果、`　　　　then` という存在しないコマンドを実行しようとして
  `if` の `then` キーワードが見つからず、後続の `else` で構文エラー
### 解決
```bash
# cat -A で不可視文字を可視化
$ cat -A ask.grp.sh
M-cM-^@M-^@M-cM-^@M-^@M-cM-^@M-^@M-cM-^@M-^@      then echo "skip"
# ↑ M-cM-^@M-^@ が全角スペース（U+3000）のUTF-8バイト列

# vim で一括置換
:%s/　/    /g

# または sed で
sed -i 's/　/    /g' ask.grp.sh
```
再発防止のため `.vimrc` に全角スペース可視化設定を追加：
```vim
highlight ZenkakuSpace ctermbg=Red guibg=Red
match ZenkakuSpace /　/
```
### 学んだこと
- bash は不可視文字に厳しい（CR `\r`、NUL `\0`、全角スペースは全部構文を壊す）
- `cat -A` は不可視文字の検出に最強（タブは `^I`、CRは `^M`、全角空白は `M-cM-^@M-^@`）
- 日本語環境でコード編集する時はIMEオフを徹底
- vim の `.vimrc` 設定で編集時にリアルタイム検出できる

## bc 渡し前に変数が空 (standard_in) 1: syntax error
### 問題のコード
```bash
# proto.ENquiz.sh の構造
correct=$(grep -c "正解" /tmp/ENquiz/answer.tmp)
bash "percentage.sh" $1
```
### 実行結果
```
(standard_in) 1: syntax error
問正解
%
```
### 問題点
- bash で別スクリプトを起動すると新しい子プロセスができる
- 親シェルで定義した $correct は子シェルには引き継がれない（空文字になる）
- bc に渡る式が「scale=1;  * 100 / 5」となり syntax error
- 同じ理由で「問正解」「%」の前後の変数も空のまま表示される
### 解決
percentage.sh の中で correct を再計算する：

### 学んだこと
- シェル変数は子プロセスに自動継承されない（同じシェル内で source すれば別）
- スクリプトを分割するときは「引数で渡す」「ファイル経由で渡す」「source で同じシェル」のどれかを選ぶ
- bc の syntax error が出たら、まず渡している式の中身を echo で確認

## grep -c の部分一致でカウントが重複
### 問題のコード
```bash
correct=$(grep -c "正解" /tmp/ENquiz/answer.tmp)
```
### 問題点
- 「正解」は「不正解」の部分文字列でもある
- grep は部分一致なので、「不正解」の行も「正解」としてマッチ
- 結果、全問正解扱いになってしまう
### 解決
ask.grp.sh の結果マーカーを記号に変更：
```bash
# 旧
echo "正解"
echo "不正解"
# 新
echo "○"
echo "✕"
```

### 学んだこと
- grep の部分一致は「含まれる文字列同士」の関係で誤マッチする
- 集計対象のマーカーは「他の文字列の部分にならない」記号を選ぶと安全
- ○/✕ のような記号はそれ自体が独立した意味を持ち、誤マッチしにくい

## tee で対話入力プロンプトが壊れる
### 問題のコード
```bash
bash "test.grp.ENquiz.sh" $1 | tee /tmp/ENquiz/answer.tmp
```
### 実行結果
```
意味： detail         ← detail は次の単語名。本来は入力プロンプト
意味： skip
詳細
headquarters
skip                   ← 「意味：」プロンプトが出ていない
本社
```
入力プロンプトと単語表示のタイミングがズレ、ユーザーが入力できない問題が断続的に発生。
### 問題点
- tee へのパイプによりパイプライン全体の標準入出力が再構成される
- ask.grp.sh の read -p "意味： " は </dev/tty で stdin を端末に向けているが、
  stdout 側のバッファリングが tee 経由で変則的になる
- 結果、プロンプト表示と read の実行タイミングがズレる
### 解決（暫定）
パイプを外せば正常動作することを確認。今後の改善案：
- 結果記録専用のスコアファイル（score.tmp）を ask.grp.sh の中で直接書き込む
- tee を使わず、percentage.sh はそのスコアファイルだけ読む
### 学んだこと
- 対話入力するスクリプトをパイプ（| tee 等）に繋ぐと干渉リスクがある
