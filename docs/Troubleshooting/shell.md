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

