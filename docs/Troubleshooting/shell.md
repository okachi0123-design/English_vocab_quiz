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
